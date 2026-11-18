begin;
-- Partially transferred TUS data can outlive the logical object. Keep its full
-- reservation charged through allocation expiry plus the orphan-scan window.
create or replace function public.cleanup_source_upload(upload uuid,owner uuid,finish boolean default false) returns jsonb
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
 if finish and a.state='deleting' and (u.completed_at is not null or u.expires_at+interval '24 hours'<=now()) then
  perform 1 from public.usage_accounts where scope='global' for update;
  perform 1 from public.usage_accounts where owner_id=owner for update;
  update public.usage_accounts set used_bytes=used_bytes-a.byte_size,updated_at=now() where scope='global' or owner_id=owner;
  insert into public.usage_ledger(operation_key,owner_id,asset_id,used_bytes_delta,reserved_bytes_delta,retained_outputs_delta,reserved_outputs_delta,reason) values('source:cleanup:'||upload,owner,a.id,-a.byte_size,0,0,0,'source physically removed');
  update public.assets set state='deleted',updated_at=now() where id=a.id;
  update public.cleanup_tasks set state='done',completed_at=now() where asset_id=a.id and state in ('pending','retry','blocked');
 end if;
 return jsonb_build_object('bucket',a.bucket,'objectKey',a.object_key,'deferRelease',u.completed_at is null and u.expires_at+interval '24 hours'>now());
end $$;
revoke all on function public.cleanup_source_upload(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.cleanup_source_upload(uuid,uuid,boolean) to service_role;
commit;