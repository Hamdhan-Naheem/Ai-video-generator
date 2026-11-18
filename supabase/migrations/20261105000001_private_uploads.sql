begin;
set local lock_timeout='5s';
set local statement_timeout='60s';

create function private.upload_metadata_matches(bucket_name text,key_name text,meta jsonb) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.upload_allocations u join public.assets a on a.id=u.asset_id
 where u.owner_id=auth.uid() and a.bucket=bucket_name and a.object_key=key_name
 and meta->>'size'=u.expected_bytes::text and meta->>'mimetype'=u.expected_mime);
$$;
revoke all on function private.upload_metadata_matches(text,text,jsonb) from public,anon,authenticated;
grant execute on function private.upload_metadata_matches(text,text,jsonb) to authenticated;
drop policy exact_source_allocation_insert on storage.objects;
create policy exact_source_allocation_insert on storage.objects for insert to authenticated
with check(private.can_upload(bucket_id,name) and private.upload_metadata_matches(bucket_id,name,metadata));

-- A draft source selection must reference an owned, live allocation. This protects
-- all existing draft RPCs as well as the HTTP boundary.
create function private.guard_draft_sources() returns trigger language plpgsql security definer set search_path='' as $$
declare item jsonb; a public.assets; u public.upload_allocations; seen uuid[]:='{}'; images integer:=0; recordings integer:=0; total bigint:=0;
begin
 if not (new.draft_input ? 'sources') then return new; end if;
 if jsonb_typeof(new.draft_input->'sources')<>'array' then raise exception using errcode='22023',message='Invalid sources'; end if;
 for item in select value from jsonb_array_elements(new.draft_input->'sources') loop
  if new.mode='education' or jsonb_typeof(item)<>'object' or (select count(*) from jsonb_object_keys(item))<>2 or not(item ?& array['assetId','role']) then raise exception using errcode='22023',message='Invalid sources'; end if;
  select * into a from public.assets where id=(item->>'assetId')::uuid and project_id=new.id and owner_id=new.owner_id and deleted_at is null and state in ('allocated','received','validated','available');
  if not found then raise exception using errcode='42501',message='Source unavailable'; end if;
  select * into u from public.upload_allocations where asset_id=a.id and state in ('allocated','received');
  if not found or u.source_role is distinct from item->>'role' or a.id=any(seen) or (u.source_role='recording' and new.mode<>'software') or (u.source_role='logo' and new.mode<>'branding') then raise exception using errcode='22023',message='Invalid source role'; end if;
  seen:=array_append(seen,a.id);total:=total+u.expected_bytes;
  if u.source_role='recording' then recordings:=recordings+1;else images:=images+1;end if;
 end loop;
 if images>8 or recordings>1 or total>60000000 then raise exception using errcode='22023',message='Source limit';end if;
 return new;
end $$;
revoke all on function private.guard_draft_sources() from public,anon,authenticated;
create trigger projects_source_guard before insert or update of draft_input,mode on public.projects for each row execute function private.guard_draft_sources();

create function public.get_draft_uploads(project uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare p public.projects; result jsonb;
begin
 if not private.active_user() then raise exception using errcode='42501',message='Account unavailable';end if;
 select * into p from public.projects where id=project and owner_id=auth.uid() and deleted_at is null and draft_state='active';
 if not found then raise exception using errcode='42501',message='Draft unavailable';end if;
 select jsonb_build_object('project',private.project_draft_json(p),'items',coalesce(jsonb_agg(jsonb_build_object(
 'uploadId',u.id,'assetId',a.id,'filename',a.original_filename,'mimeType',u.expected_mime,'byteSize',u.expected_bytes::text,'role',u.source_role,'protocol',u.protocol,
 'state',u.state,'expiresAt',to_char(u.expires_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'bucket','sources','objectKey',a.object_key
 ) order by u.created_at,u.id),'[]'::jsonb)) into result
 from public.upload_allocations u join public.assets a on a.id=u.asset_id and a.owner_id=p.owner_id and a.project_id=p.id
 where u.project_id=p.id and u.owner_id=p.owner_id and exists(select 1 from jsonb_array_elements(coalesce(p.draft_input->'sources','[]'::jsonb)) s where s->>'assetId'=a.id::text);
 return result;
end $$;
revoke all on function public.get_draft_uploads(uuid) from public,anon,authenticated;
grant execute on function public.get_draft_uploads(uuid) to authenticated;

create function public.reserve_source_upload(project uuid,expected_version integer,request_key text,request_hash text,filename text,mime text,bytes bigint,role text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); p public.projects; previous public.idempotency_requests; asset uuid:=gen_random_uuid(); upload uuid:=gen_random_uuid(); reservation uuid:=gen_random_uuid(); selected jsonb; g public.usage_accounts; ua public.usage_accounts; count_images integer; count_recordings integer; total bigint; expires timestamptz:=now()+interval '24 hours';
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
 if g.used_bytes+g.reserved_bytes+bytes>g.byte_limit or ua.used_bytes+ua.reserved_bytes+bytes>ua.byte_limit then raise exception using errcode='P0001',message='Storage capacity reached';end if;
 insert into public.assets(id,project_id,owner_id,kind,bucket,object_key,declared_mime,original_filename,declared_bytes,expires_at)
 values(asset,project,actor,case when role='recording' then 'source_recording' else 'source_image' end,'sources',actor::text||'/'||project::text||'/'||asset::text||'/source.'||case mime when 'image/png' then 'png' when 'image/jpeg' then 'jpg' when 'image/webp' then 'webp' else 'mp4' end,mime,filename,bytes,now()+interval '7 days');
 insert into public.upload_allocations(id,project_id,owner_id,asset_id,reservation_id,expected_bytes,expected_mime,source_role,protocol,expires_at)
 values(upload,project,actor,asset,reservation,bytes,mime,role,case when role='recording' then 'tus' else 'standard' end,expires);
 insert into public.usage_reservations(id,owner_id,upload_allocation_id,kind,bytes_remaining,output_slots_remaining,expires_at) values(reservation,actor,upload,'source',bytes,0,expires);
 update public.usage_accounts set reserved_bytes=reserved_bytes+bytes,updated_at=now() where id in(g.id,ua.id);
 insert into public.usage_ledger(operation_key,owner_id,asset_id,reservation_id,used_bytes_delta,reserved_bytes_delta,retained_outputs_delta,reserved_outputs_delta,reason)
 values('source:reserve:'||upload,actor,asset,reservation,0,bytes,0,0,'source allocation');
 selected:=coalesce(p.draft_input->'sources','[]'::jsonb)||jsonb_build_array(jsonb_build_object('assetId',asset,'role',role));
 update public.projects set draft_input=jsonb_set(p.draft_input,'{sources}',selected) where id=project;
 insert into public.idempotency_requests(owner_id,operation,key,request_hash,resource_type,resource_id,response_status,safe_response)
 values(actor,'source_upload:'||project::text,request_key,request_hash,'upload',upload,201,'{}');
 return jsonb_build_object('uploadId',upload,'snapshot',public.get_draft_uploads(project));
end $$;
revoke all on function public.reserve_source_upload(uuid,integer,text,text,text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.reserve_source_upload(uuid,integer,text,text,text,text,bigint,text) to authenticated;

create function public.change_source_upload(upload uuid,action text) returns jsonb
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
 update public.usage_accounts set reserved_bytes=reserved_bytes-amount,used_bytes=used_bytes+amount,updated_at=now() where scope='global' or owner_id=actor;
 update public.usage_reservations set state='committed',bytes_remaining=0,updated_at=now() where id=r.id;
 insert into public.usage_ledger(operation_key,owner_id,asset_id,reservation_id,used_bytes_delta,reserved_bytes_delta,retained_outputs_delta,reserved_outputs_delta,reason)
 values('source:'||action||':'||upload,actor,a.id,r.id,amount,-amount,0,0,'source '||action) on conflict(operation_key) do nothing;
 if action='complete' then
  update public.assets set state='received',byte_size=u.expected_bytes,received_at=now(),updated_at=now() where id=a.id;
  update public.upload_allocations set state='received',completed_at=now() where id=u.id;
 else
  selected:=(select coalesce(jsonb_agg(s),'[]'::jsonb) from jsonb_array_elements(coalesce(p.draft_input->'sources','[]'::jsonb)) s where s->>'assetId'<>a.id::text);
  update public.projects set draft_input=jsonb_set(p.draft_input,'{sources}',selected) where id=p.id;
  update public.upload_allocations set state='abandoned' where id=u.id;
  update public.assets set state='deleting',deleted_at=now(),byte_size=coalesce(byte_size,declared_bytes),updated_at=now() where id=a.id;
  insert into public.cleanup_tasks(asset_id,bucket,object_key,owner_id,reason) values(a.id,a.bucket,a.object_key,actor,'draft source removed') on conflict do nothing;
 end if;
 return public.get_draft_uploads(p.id);
end $$;
revoke all on function public.change_source_upload(uuid,text) from public,anon,authenticated;
grant execute on function public.change_source_upload(uuid,text) to authenticated;
commit;
