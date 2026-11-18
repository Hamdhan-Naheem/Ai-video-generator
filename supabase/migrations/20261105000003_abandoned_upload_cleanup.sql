begin;
create or replace function public.change_source_upload(upload uuid,action text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); p public.projects; u public.upload_allocations; a public.assets; r public.usage_reservations; obj storage.objects; amount bigint; selected jsonb;
begin
 perform 1 from public.profiles where id=actor and status='active' for update;
 if not found then raise exception using errcode='42501',message='Account unavailable';end if;
 select * into u from public.upload_allocations where id=upload and owner_id=actor;
 if not found then raise exception using errcode='42501',message='Upload unavailable';end if;
 select * into p from public.projects where id=u.project_id and owner_id=actor and deleted_at is null and draft_state='active' for update;
 if not found then raise exception using errcode='42501',message='Draft unavailable';end if;
 select * into u from public.upload_allocations where id=upload for update;
 select * into a from public.assets where id=u.asset_id for update;
 if action='read' then return public.get_draft_uploads(p.id);end if;
 if action not in ('complete','remove') or action is null then raise exception using errcode='22023',message='Invalid action';end if;
 if u.state='abandoned' then
  if action='remove' then return public.get_draft_uploads(p.id);end if;
  raise exception using errcode='23514',message='Upload removed';
 end if;
 if action='complete' and not exists(select 1 from jsonb_array_elements(coalesce(p.draft_input->'sources','[]'::jsonb)) s where s->>'assetId'=a.id::text) then raise exception using errcode='42501',message='Upload detached';end if;
 if action='complete' and u.state='received' then return public.get_draft_uploads(p.id);end if;
 if action='complete' then
  if u.state<>'allocated' or u.expires_at<=now() then raise exception using errcode='P0002',message='Upload expired';end if;
  select * into obj from storage.objects where bucket_id=a.bucket and name=a.object_key;
  if not found then raise exception using errcode='23514',message='Upload incomplete';end if;
  if (obj.metadata->>'size')::bigint is distinct from u.expected_bytes or obj.metadata->>'mimetype' is distinct from u.expected_mime then raise exception using errcode='22023',message='Upload metadata mismatch';end if;
 end if;
 if action='remove' and (exists(select 1 from public.revision_assets where asset_id=a.id) or exists(select 1 from public.checkpoint_assets where asset_id=a.id)) then raise exception using errcode='23514',message='Source in use';end if;
 perform 1 from public.usage_accounts where scope='global' for update;
 perform 1 from public.usage_accounts where owner_id=actor for update;
 select * into r from public.usage_reservations where id=u.reservation_id for update;
 amount:=case when r.state='reserved' then r.bytes_remaining else 0 end;
 -- Removal retains conservative used-byte accounting until physical cleanup confirms absence.
 update public.usage_accounts set reserved_bytes=reserved_bytes-amount,used_bytes=used_bytes+case when action='complete' then u.expected_bytes else amount end,updated_at=now() where scope='global' or owner_id=actor;
 update public.usage_reservations set state='committed',bytes_remaining=0,updated_at=now() where id=r.id;
 insert into public.usage_ledger(operation_key,owner_id,asset_id,reservation_id,used_bytes_delta,reserved_bytes_delta,retained_outputs_delta,reserved_outputs_delta,reason)
 values('source:'||action||':'||upload,actor,a.id,r.id,case when action='complete' then u.expected_bytes else amount end,-amount,0,0,'source '||action) on conflict(operation_key) do nothing;
 if action='complete' then
  update public.assets set state='received',byte_size=u.expected_bytes,received_at=now(),updated_at=now() where id=a.id;
  update public.upload_allocations set state='received',completed_at=now() where id=u.id;
 else
  selected:=(select coalesce(jsonb_agg(s),'[]'::jsonb) from jsonb_array_elements(coalesce(p.draft_input->'sources','[]'::jsonb)) s where s->>'assetId'<>a.id::text);
  update public.projects set draft_input=jsonb_set(p.draft_input,'{sources}',selected) where id=p.id;
  update public.upload_allocations set state='abandoned' where id=u.id;
  update public.assets set state='deleting',deleted_at=now(),byte_size=case when amount>0 then amount else byte_size end,updated_at=now() where id=a.id;
  insert into public.cleanup_tasks(asset_id,bucket,object_key,owner_id,reason) values(a.id,a.bucket,a.object_key,actor,'draft source removed') on conflict do nothing;
 end if;
 return public.get_draft_uploads(p.id);
end $$;
revoke all on function public.change_source_upload(uuid,text) from public,anon,authenticated;
grant execute on function public.change_source_upload(uuid,text) to authenticated;


create function public.expire_source_upload(upload uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare owner uuid; previous text:=current_setting('request.jwt.claims',true);
begin
 select owner_id into owner from public.upload_allocations where id=upload and state='allocated' and expires_at<=now();
 if owner is null then return false;end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','authenticated')::text,true);
 perform public.change_source_upload(upload,'remove');
 perform set_config('request.jwt.claims',coalesce(previous,''),true);
 return true;
end $$;
revoke all on function public.expire_source_upload(uuid) from public,anon,authenticated;
grant execute on function public.expire_source_upload(uuid) to service_role;
commit;