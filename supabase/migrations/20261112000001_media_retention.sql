begin;
set local lock_timeout='5s';set local statement_timeout='60s';
alter table public.cleanup_tasks add column runner_id uuid;
do $$declare c record;begin
 for c in select conname from pg_constraint where conrelid='public.cleanup_tasks'::regclass and contype='c' and pg_get_constraintdef(oid) like '%worker_id%' loop
 execute format('alter table public.cleanup_tasks drop constraint %I',c.conname);end loop;
end $$;
alter table public.cleanup_tasks add constraint cleanup_tasks_lease_guard check(state<>'running' or ((worker_id is not null or runner_id is not null) and lease_token>0 and lease_expires_at is not null));
create index revisions_retention_due_idx on public.revisions(expires_at,id) where status='ready' and completed_at is not null;
create index assets_retention_due_idx on public.assets(expires_at,id) where bucket='artifacts' and state<>'deleted';

create function private.media_cleanup_eligible(asset uuid,stamp timestamptz) returns boolean
language sql stable set search_path='' as $$
 select exists(select 1 from public.assets a join public.jobs j on j.id=a.creator_job_id and j.owner_id=a.owner_id and j.project_id=a.project_id
 where a.id=asset and a.bucket='artifacts' and a.state<>'deleted' and a.expires_at<=stamp
 and j.status in ('succeeded','failed','cancelled','needs_input') and j.finished_at is not null
 and (j.status<>'failed' or j.finished_at<=stamp-interval '48 hours')
 -- Signed artifact uploads last two hours. Keep a conservative 24-hour late
 -- transfer window after the final producer stops, as well as asset retention.
 and greatest(a.created_at,j.finished_at)+interval '24 hours'<=stamp
 and not exists(select 1 from public.jobs active where active.project_id=a.project_id and active.owner_id=a.owner_id and active.status in ('queued','waiting_worker','running','waiting_quota','cancel_requested'))
 and not exists(select 1 from public.revision_assets ra join public.revisions r on r.id=ra.revision_id
  where ra.asset_id=a.id and (ra.retain_until>stamp or (r.deleted_at is null and r.expires_at>stamp)))
 and not exists(select 1 from public.checkpoint_assets ca join public.revisions r on r.id=ca.revision_id
  where ca.asset_id=a.id and r.deleted_at is null and r.expires_at>stamp)
 and not exists(select 1 from public.exports e where (e.video_asset_id=a.id or e.thumbnail_asset_id=a.id or e.vtt_asset_id=a.id or e.srt_asset_id=a.id or e.verification_asset_id=a.id)
  and (e.state in ('pending','rendering') or (e.state='ready' and e.expires_at>stamp))))
$$;
revoke all on function private.media_cleanup_eligible(uuid,timestamptz) from public,anon,authenticated;

create function public.sweep_expired_media(apply_changes boolean default false,scope_owner uuid default null,page_size integer default 25) returns jsonb
language plpgsql security definer set search_path='' as $$
declare stamp timestamptz;r record;a record;ua public.usage_accounts;g public.usage_accounts;live_count integer;retired integer;expired_count integer:=0;scheduled_count integer:=0;changed integer;
begin
 if apply_changes is null or page_size is null or page_size not between 1 and 100 then raise exception using errcode='22023',message='Invalid retention request';end if;
 if not apply_changes then
  stamp:=clock_timestamp();
  return jsonb_build_object('preview',true,'expired',(select count(*) from (select id from public.revisions where status='ready' and completed_at is not null and expires_at<=stamp and (scope_owner is null or owner_id=scope_owner) limit page_size) q),
   'scheduled',(select count(*) from (select id from public.assets where bucket='artifacts' and state<>'deleted' and expires_at<=stamp and (scope_owner is null or owner_id=scope_owner) and private.media_cleanup_eligible(id,stamp)
    and not exists(select 1 from public.cleanup_tasks t where t.asset_id=assets.id and t.state<>'done') limit page_size) q));
 end if;
 perform 1 from public.usage_accounts where scope='global' for update;stamp:=clock_timestamp();
 for r in select id,owner_id,project_id from public.revisions where status='ready' and completed_at is not null and expires_at<=stamp and (scope_owner is null or owner_id=scope_owner) order by expires_at,id limit page_size for update loop
  perform 1 from public.usage_accounts where owner_id=r.owner_id for update;
  perform 1 from public.projects where id=r.project_id for update;
  update public.exports set state='expired',updated_at=stamp where revision_id=r.id and state='ready' and expires_at<=stamp;
  update public.projects set latest_ready_revision_id=null where id=r.project_id and latest_ready_revision_id=r.id;
  update public.revisions set status='expired' where id=r.id;
  -- Admission may already have reconciled expired slots. Reconcile the delta,
  -- never blindly decrement per expired row. Physical bytes remain charged.
  select * into ua from public.usage_accounts where owner_id=r.owner_id;
  select * into g from public.usage_accounts where scope='global';
  select count(*)::integer into live_count from public.revisions v join public.projects p on p.id=v.project_id and p.owner_id=r.owner_id
   where v.owner_id=r.owner_id and p.deleted_at is null and v.deleted_at is null and v.status='ready' and v.expires_at>stamp;
  if ua.id is not null then
   retired:=ua.retained_outputs-live_count;
   if retired<0 or g.id is null or retired>g.retained_outputs then raise exception using errcode='P2403',message='Retention accounting requires reconciliation';end if;
   if retired>0 then
    update public.usage_accounts set retained_outputs=retained_outputs-retired,updated_at=stamp where scope='global' or owner_id=r.owner_id;
    insert into public.usage_ledger(operation_key,owner_id,used_bytes_delta,reserved_bytes_delta,retained_outputs_delta,reserved_outputs_delta,reason)
     values('retention:slots:'||r.id,r.owner_id,0,0,-retired,0,'expired successful output slots');
   end if;
  end if;
  expired_count:=expired_count+1;
 end loop;
 for a in select id,bucket,object_key,owner_id from public.assets where bucket='artifacts' and state<>'deleted' and expires_at<=stamp and (scope_owner is null or owner_id=scope_owner)
  and private.media_cleanup_eligible(id,stamp) and not exists(select 1 from public.cleanup_tasks t where t.asset_id=assets.id and t.state<>'done') order by expires_at,id limit page_size loop
  insert into public.cleanup_tasks(asset_id,bucket,object_key,owner_id,reason) values(a.id,a.bucket,a.object_key,a.owner_id,'media retention') on conflict do nothing;
  get diagnostics changed=row_count;scheduled_count:=scheduled_count+changed;
 end loop;
 return jsonb_build_object('preview',false,'expired',expired_count,'scheduled',scheduled_count);
end $$;
revoke all on function public.sweep_expired_media(boolean,uuid,integer) from public,anon,authenticated;
grant execute on function public.sweep_expired_media(boolean,uuid,integer) to service_role;

create function public.media_cleanup_task(operation text,runner uuid default null,task uuid default null,expected_token bigint default null,scope_owner uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare t public.cleanup_tasks;a public.assets;stamp timestamptz;charge bigint;ua public.usage_accounts;g public.usage_accounts;
begin
 if operation is null or operation not in ('claim','finish','fail','retry') then raise exception using errcode='22023',message='Invalid cleanup action';end if;
 perform 1 from public.usage_accounts where scope='global' for update;
 if operation='claim' then
  if runner is null or task is not null or expected_token is not null then raise exception using errcode='22023',message='Invalid cleanup claim';end if;
  select * into t from public.cleanup_tasks where reason='media retention' and bucket='artifacts' and (scope_owner is null or owner_id=scope_owner)
   and ((state in ('pending','retry') and next_attempt_at<=clock_timestamp()) or (state='running' and lease_expires_at<=clock_timestamp())) order by next_attempt_at,id limit 1 for update;
  if not found then return jsonb_build_object('idle',true);end if;
 else
  if task is null then raise exception using errcode='22023',message='Missing cleanup task';end if;
  select * into t from public.cleanup_tasks where id=task and reason='media retention' and bucket='artifacts' and (scope_owner is null or owner_id=scope_owner) for update;
  if not found then raise exception using errcode='42501',message='Cleanup unavailable';end if;
  if t.state='done' then return jsonb_build_object('done',true);end if;
 end if;
 perform 1 from public.usage_accounts where owner_id=t.owner_id for update;
 select * into a from public.assets where id=t.asset_id for update;stamp:=clock_timestamp();
 if a.id is null or a.owner_id is distinct from t.owner_id or a.bucket is distinct from t.bucket or a.object_key is distinct from t.object_key then raise exception using errcode='P2403',message='Cleanup identity requires reconciliation';end if;
 select used_bytes_delta into charge from public.usage_ledger where operation_key='artifact:'||a.id and asset_id=a.id and owner_id=a.owner_id;
 select * into ua from public.usage_accounts where owner_id=a.owner_id;select * into g from public.usage_accounts where scope='global';
 if operation='retry' then
  if t.state<>'blocked' or not private.media_cleanup_eligible(a.id,stamp) or charge is null or charge<>a.declared_bytes or ua.id is null or g.id is null or charge>ua.used_bytes or charge>g.used_bytes then raise exception using errcode='P2403',message='Cleanup requires reconciliation';end if;
  update public.cleanup_tasks set state='pending',attempt_count=0,next_attempt_at=stamp,safe_error_code=null,runner_id=null,worker_id=null,lease_expires_at=null,updated_at=stamp where id=t.id;
  return jsonb_build_object('retry',true);
 end if;
 if operation='claim' then
  if t.attempt_count>=5 or charge is null or charge<>a.declared_bytes or charge<=0 or ua.id is null or g.id is null or charge>ua.used_bytes or charge>g.used_bytes then
   update public.cleanup_tasks set state='blocked',safe_error_code=case when t.attempt_count>=5 then 'RETRY_EXHAUSTED' else 'ACCOUNTING_RECONCILIATION' end,runner_id=null,worker_id=null,lease_expires_at=null,updated_at=stamp where id=t.id;
   return jsonb_build_object('idle',true);
  end if;
  if not private.media_cleanup_eligible(a.id,stamp) then
   update public.cleanup_tasks set state='retry',next_attempt_at=stamp+interval '5 minutes',runner_id=null,worker_id=null,lease_expires_at=null,updated_at=stamp where id=t.id;
   return jsonb_build_object('idle',true);
  end if;
  -- This is the irreversible adoption barrier: new revision/checkpoint
  -- references cannot attach a deleting asset while Storage I/O is in flight.
  update public.exports set state='expired',updated_at=stamp where state='ready' and expires_at<=stamp and (video_asset_id=a.id or thumbnail_asset_id=a.id or vtt_asset_id=a.id or srt_asset_id=a.id or verification_asset_id=a.id);
  update public.assets set state='deleting',deleted_at=coalesce(deleted_at,stamp),updated_at=stamp where id=a.id;
  update public.cleanup_tasks set state='running',attempt_count=attempt_count+1,lease_token=lease_token+1,runner_id=runner,worker_id=null,lease_expires_at=stamp+interval '60 seconds',safe_error_code=null,updated_at=stamp where id=t.id returning * into t;
  return jsonb_build_object('taskId',t.id,'assetId',a.id,'bucket',a.bucket,'objectKey',a.object_key,'leaseToken',t.lease_token::text,'serverTime',to_char(stamp at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'leaseExpiresAt',to_char(t.lease_expires_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'));
 end if;
 if t.state<>'running' or runner is null or t.runner_id is distinct from runner or expected_token is null or expected_token<>t.lease_token or t.lease_expires_at<=stamp then raise exception using errcode='P2401',message='Cleanup lease lost';end if;
 if operation='fail' then
  update public.cleanup_tasks set state=case when attempt_count>=5 then 'blocked' else 'retry' end,next_attempt_at=stamp+make_interval(secs=>least(3600,60*(2^(least(attempt_count,6)-1))::integer)),safe_error_code='STORAGE_OR_CONFIRM_FAILED',runner_id=null,worker_id=null,lease_expires_at=null,updated_at=stamp where id=t.id;
  return jsonb_build_object('retry',true);
 end if;
 if a.state<>'deleting' or not private.media_cleanup_eligible(a.id,stamp) or exists(select 1 from storage.objects where bucket_id=a.bucket and name=a.object_key) then raise exception using errcode='P2402',message='Physical cleanup not confirmed';end if;
 if charge is null or charge<>a.declared_bytes or charge<=0 or ua.id is null or g.id is null or charge>ua.used_bytes or charge>g.used_bytes or exists(select 1 from public.usage_ledger where operation_key='media:delete:'||a.id) then raise exception using errcode='P2403',message='Cleanup accounting requires reconciliation';end if;
 update public.usage_accounts set used_bytes=used_bytes-charge,updated_at=stamp where scope='global' or owner_id=a.owner_id;
 insert into public.usage_ledger(operation_key,owner_id,asset_id,used_bytes_delta,reserved_bytes_delta,retained_outputs_delta,reserved_outputs_delta,reason) values('media:delete:'||a.id,a.owner_id,a.id,-charge,0,0,0,'retained media physically removed');
 update public.assets set state='deleted',updated_at=stamp where id=a.id;
 update public.checkpoints set state='invalid' where id in(select checkpoint_id from public.checkpoint_assets where asset_id=a.id);
 update public.cleanup_tasks set state='done',completed_at=stamp,lease_expires_at=null,runner_id=null,worker_id=null,safe_error_code=null,updated_at=stamp where id=t.id;
 return jsonb_build_object('done',true);
end $$;
revoke all on function public.media_cleanup_task(text,uuid,uuid,bigint,uuid) from public,anon,authenticated;
grant execute on function public.media_cleanup_task(text,uuid,uuid,bigint,uuid) to service_role;
-- Partially transferred TUS data can outlive the logical object. Keep its full
-- reservation charged through allocation expiry plus the orphan-scan window.
create or replace function public.cleanup_source_upload(upload uuid,owner uuid,finish boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u public.upload_allocations;a public.assets;
begin
 perform private.lock_usage_scope(owner);
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

create or replace function private.education_result_metadata(actor uuid,project uuid,revision uuid) returns jsonb language plpgsql stable set search_path='' as $$
declare p public.projects;r public.revisions;e public.exports;report jsonb;result_state text;stamp timestamptz:=clock_timestamp();valid_count integer;
begin
 if not exists(select 1 from public.profiles where id=actor and status='active') then raise exception using errcode='42501',message='Result unavailable';end if;
 select * into p from public.projects where id=project and owner_id=actor and mode='education' and deleted_at is null;
 if not found then raise exception using errcode='42501',message='Result unavailable';end if;
 select * into r from public.revisions where id=revision and project_id=p.id and owner_id=actor;
 if not found then raise exception using errcode='42501',message='Result unavailable';end if;
 select * into e from public.exports where revision_id=r.id and variant='clean';
 select provider_metadata->'verification' into report from public.assets where id=e.verification_asset_id and owner_id=actor and project_id=p.id and state in ('available','expired','deleting','deleted');
 select count(*) into valid_count from public.assets a where a.owner_id=actor and a.project_id=p.id and a.state='available' and a.deleted_at is null and a.expires_at>stamp and exists(select 1 from storage.objects o where o.bucket_id=a.bucket and o.name=a.object_key and o.metadata->>'size'=a.byte_size::text)
 and ((a.id=e.video_asset_id and a.kind='video') or (a.id=e.thumbnail_asset_id and a.kind='thumbnail') or (a.id=e.srt_asset_id and a.kind='captions_srt') or (a.id=e.vtt_asset_id and a.kind='captions_vtt') or (a.id=e.verification_asset_id and a.kind='report'));
 result_state:=case when r.deleted_at is not null then 'unavailable' when r.expires_at<=stamp then 'expired'
 when r.status='ready' and e.state='ready' and e.expires_at=r.expires_at and e.expires_at>stamp and valid_count=5 and report->>'fullDecode'='true' and report->>'audio'='true' and report->>'orientation'=r.orientation and report->>'provider' in ('gemini','elevenlabs') and exists(select 1 from public.jobs j where j.revision_id=r.id and j.status='succeeded') then 'ready' else 'unavailable' end;
 return jsonb_build_object('revisionId',r.id,'title',coalesce(nullif(r.input_snapshot->'input'->>'title',''),p.title),'version',r.revision_number,'status',result_state,'orientation',r.orientation,'targetSeconds',r.target_seconds,
 'durationMs',case when report->>'durationMs'~'^[0-9]{1,6}$' then (report->>'durationMs')::integer else null end,
 'completedAt',case when r.completed_at is null then null else to_char(r.completed_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') end,
 'expiresAt',case when r.expires_at is null then null else to_char(r.expires_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') end,
 'serverTime',to_char(stamp at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
 'narration',jsonb_build_object('provider',case when report->>'provider' in ('gemini','elevenlabs') then report->>'provider' else 'unknown' end,'voice',case when length(report->>'voice') between 1 and 100 then report->>'voice' else null end));
end $$;
revoke all on function private.education_result_metadata(uuid,uuid,uuid) from public,anon,authenticated;

commit;
