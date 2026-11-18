begin;
-- Storage authorizes before it has object metadata. Reserve the full bucket
-- ceiling for each open transfer; reconcile to exact bytes only on receipt.
create or replace function private.upload_metadata_matches(bucket_name text,key_name text,meta jsonb) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.upload_allocations u join public.assets a on a.id=u.asset_id
 where u.owner_id=auth.uid() and a.bucket=bucket_name and a.object_key=key_name
 and (meta->>'size' is null or (meta->>'size'=u.expected_bytes::text and meta->>'mimetype'=u.expected_mime)));
$$;
create or replace function public.reserve_source_upload(project uuid,expected_version integer,request_key text,request_hash text,filename text,mime text,bytes bigint,role text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); p public.projects; previous public.idempotency_requests; asset uuid:=gen_random_uuid(); upload uuid:=gen_random_uuid(); reservation uuid:=gen_random_uuid(); selected jsonb; g public.usage_accounts; ua public.usage_accounts; count_images integer; count_recordings integer; total bigint; reserve_bytes bigint:=45000000; expires timestamptz:=now()+interval '24 hours';
begin
 perform 1 from public.profiles where id=actor and status='active' for update;
 if not found then raise exception using errcode='42501',message='Account unavailable';end if;
 select * into p from public.projects where id=project and owner_id=actor and deleted_at is null and draft_state='active' for update;
 if not found then raise exception using errcode='42501',message='Draft unavailable';end if;
 if request_key is null or request_key!~'^[a-zA-Z0-9_-]{1,128}$' or request_hash is null or request_hash!~'^[a-f0-9]{64}$' then raise exception using errcode='22023',message='Invalid request identity';end if;
 select * into previous from public.idempotency_requests where owner_id=actor and operation='source_upload:'||project::text and key=request_key for update;
 if found then
  if previous.request_hash<>request_hash then raise exception using errcode='23505',message='Request key already used';end if;
  if not exists(select 1 from public.upload_allocations where id=previous.resource_id and owner_id=actor and state in ('allocated','received')) then raise exception using errcode='23514',message='Upload removed';end if;
  return jsonb_build_object('uploadId',previous.resource_id,'snapshot',public.get_draft_uploads(project));
 end if;
 if expected_version is distinct from p.draft_version then raise exception using errcode='40001',message='Draft version conflict';end if;
 if p.mode='education' or filename is null or char_length(filename) not between 1 and 255 or filename~'[[:cntrl:]/\\]' or bytes is null or bytes<=0 or role is null or mime is null
 or not((role in ('image','logo') and mime in ('image/png','image/jpeg','image/webp') and bytes<=5000000) or (role='recording' and p.mode='software' and mime='video/mp4' and bytes<=45000000))
 or (role='logo' and p.mode<>'branding') then raise exception using errcode='22023',message='Unsupported upload';end if;
 select count(*) filter(where u.source_role<>'recording'),count(*) filter(where u.source_role='recording'),coalesce(sum(u.expected_bytes),0) into count_images,count_recordings,total
 from public.upload_allocations u where u.project_id=project and u.owner_id=actor and exists(select 1 from jsonb_array_elements(coalesce(p.draft_input->'sources','[]'::jsonb)) s where s->>'assetId'=u.asset_id::text);
 if total+bytes>60000000 or (role='recording' and count_recordings>=1) or (role<>'recording' and count_images>=8) then raise exception using errcode='22023',message='Source limit';end if;
 select * into g from public.usage_accounts where scope='global' for update;
 if not found or g.byte_limit<=0 then raise exception using errcode='P0001',message='Storage not configured';end if;
 insert into public.usage_accounts(scope,owner_id,byte_limit,output_limit) values('user',actor,120000000,3) on conflict(owner_id) do nothing;
 select * into ua from public.usage_accounts where owner_id=actor for update;
 if g.used_bytes+g.reserved_bytes+reserve_bytes>g.byte_limit or ua.used_bytes+ua.reserved_bytes+reserve_bytes>ua.byte_limit then raise exception using errcode='P0001',message='Storage capacity reached';end if;
 insert into public.assets(id,project_id,owner_id,kind,bucket,object_key,declared_mime,original_filename,declared_bytes,expires_at)
 values(asset,project,actor,case when role='recording' then 'source_recording' else 'source_image' end,'sources',actor::text||'/'||project::text||'/'||asset::text||'/source.'||case mime when 'image/png' then 'png' when 'image/jpeg' then 'jpg' when 'image/webp' then 'webp' else 'mp4' end,mime,filename,bytes,now()+interval '7 days');
 insert into public.upload_allocations(id,project_id,owner_id,asset_id,reservation_id,expected_bytes,expected_mime,source_role,protocol,expires_at)
 values(upload,project,actor,asset,reservation,bytes,mime,role,case when role='recording' then 'tus' else 'standard' end,expires);
 insert into public.usage_reservations(id,owner_id,upload_allocation_id,kind,bytes_remaining,output_slots_remaining,expires_at) values(reservation,actor,upload,'source',reserve_bytes,0,expires);
 update public.usage_accounts set reserved_bytes=reserved_bytes+reserve_bytes,updated_at=now() where id in(g.id,ua.id);
 insert into public.usage_ledger(operation_key,owner_id,asset_id,reservation_id,used_bytes_delta,reserved_bytes_delta,retained_outputs_delta,reserved_outputs_delta,reason)
 values('source:reserve:'||upload,actor,asset,reservation,0,reserve_bytes,0,0,'source allocation');
 selected:=coalesce(p.draft_input->'sources','[]'::jsonb)||jsonb_build_array(jsonb_build_object('assetId',asset,'role',role));
 update public.projects set draft_input=jsonb_set(p.draft_input,'{sources}',selected) where id=project;
 insert into public.idempotency_requests(owner_id,operation,key,request_hash,resource_type,resource_id,response_status,safe_response)
 values(actor,'source_upload:'||project::text,request_key,request_hash,'upload',upload,201,'{}');
 return jsonb_build_object('uploadId',upload,'snapshot',public.get_draft_uploads(project));
end $$;
revoke all on function public.reserve_source_upload(uuid,integer,text,text,text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.reserve_source_upload(uuid,integer,text,text,text,text,bigint,text) to authenticated;

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
 if not exists(select 1 from jsonb_array_elements(coalesce(p.draft_input->'sources','[]'::jsonb)) s where s->>'assetId'=a.id::text) then raise exception using errcode='42501',message='Upload detached';end if;
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

create function public.cleanup_source_upload(upload uuid,owner uuid,finish boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u public.upload_allocations;a public.assets;
begin
 perform 1 from public.profiles where id=owner for update;
 select * into u from public.upload_allocations where id=upload and owner_id=owner;
 if not found then return null;end if;
 perform 1 from public.projects where id=u.project_id and owner_id=owner for update;
 select * into u from public.upload_allocations where id=upload and owner_id=owner for update;
 select * into a from public.assets where id=u.asset_id and owner_id=owner for update;
 if u.state<>'abandoned' or a.state not in ('deleting','deleted') or exists(select 1 from public.revision_assets where asset_id=a.id) or exists(select 1 from public.checkpoint_assets where asset_id=a.id) then return null;end if;
 if finish and a.state='deleting' then
  perform 1 from public.usage_accounts where scope='global' for update;
  perform 1 from public.usage_accounts where owner_id=owner for update;
  update public.usage_accounts set used_bytes=used_bytes-a.byte_size,updated_at=now() where scope='global' or owner_id=owner;
  insert into public.usage_ledger(operation_key,owner_id,asset_id,used_bytes_delta,reserved_bytes_delta,retained_outputs_delta,reserved_outputs_delta,reason) values('source:cleanup:'||upload,owner,a.id,-a.byte_size,0,0,0,'source physically removed');
  update public.assets set state='deleted',updated_at=now() where id=a.id;
  update public.cleanup_tasks set state='done',completed_at=now() where asset_id=a.id and state in ('pending','retry','blocked');
 end if;
 return jsonb_build_object('bucket',a.bucket,'objectKey',a.object_key);
end $$;
revoke all on function public.cleanup_source_upload(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.cleanup_source_upload(uuid,uuid,boolean) to service_role;
commit;