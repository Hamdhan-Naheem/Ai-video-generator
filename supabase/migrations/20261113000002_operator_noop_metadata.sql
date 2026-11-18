-- Preserve control metadata on an idempotent no-op; no limits or flags change.
begin;
set local lock_timeout='5s';
create or replace function public.operator_console(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' set lock_timeout='3s' set statement_timeout='8s' as $$
<<op>>
declare actor uuid:=auth.uid();stamp timestamptz:=clock_timestamp();today date:=(clock_timestamp() at time zone 'UTC')::date;
 settings public.app_settings;budget_window private.operator_windows;receipt private.operator_receipts;j public.jobs;slot public.worker_slots;
 request_id uuid;cursor_id uuid;cursor_time timestamptz;result jsonb;items jsonb;next_cursor uuid;gate text;event_code text;changed boolean;before_controls jsonb;daily integer;amount integer;
begin
 -- Global-first ordering matches admission, cancellation, worker execution and cleanup.
 perform 1 from public.usage_accounts where scope='global' for update;
 if not found then raise exception using errcode='P3004',message='Operations unavailable';end if;
 perform 1 from public.profiles where id=actor and role='operator' and status='active' for share;
 if not found or auth.role() is distinct from 'authenticated' then raise exception using errcode='42501',message='Operator required';end if;
 if action is null or action not in ('health','jobs','audit','controls','reconcile') or payload is null or jsonb_typeof(payload) is distinct from 'object' or not private.bounded_object(payload) or pg_column_size(payload)>2048 then raise exception using errcode='22023',message='Invalid operator request';end if;
 if action='health' and payload<>'{}'::jsonb or action in ('jobs','audit') and (payload-array['before','status']<>'{}'::jsonb or action='audit' and payload?'status') then raise exception using errcode='22023',message='Invalid operator request';end if;
 if payload?'status' and (jsonb_typeof(payload->'status')<>'string' or payload->>'status' not in ('queued','waiting_worker','running','waiting_quota','needs_input','cancel_requested','cancelled','failed','succeeded')) then raise exception using errcode='22023',message='Invalid status';end if;
 if payload?'before' then if jsonb_typeof(payload->'before')<>'string' then raise exception using errcode='22023',message='Invalid cursor';end if;cursor_id:=(payload->>'before')::uuid;end if;
 if action in ('controls','reconcile') then
  if not payload ?& array['requestId','reason'] or jsonb_typeof(payload->'requestId')<>'string' or jsonb_typeof(payload->'reason')<>'string' or payload->>'reason' not in ('maintenance','provider_outage','storage_review','release_check') then raise exception using errcode='22023',message='Invalid operator request';end if;
  request_id:=(payload->>'requestId')::uuid;
  if action='controls' then
   if payload-array['requestId','reason','expectedVersion','generationPaused','claimsPaused']<>'{}'::jsonb or not payload?'expectedVersion' or jsonb_typeof(payload->'expectedVersion')<>'number' or (payload->>'expectedVersion')!~'^[1-9][0-9]{0,8}$' or not(payload ?| array['generationPaused','claimsPaused']) or payload?'generationPaused' and jsonb_typeof(payload->'generationPaused')<>'boolean' or payload?'claimsPaused' and jsonb_typeof(payload->'claimsPaused')<>'boolean' then raise exception using errcode='22023',message='Invalid controls';end if;
  else
   if payload-array['requestId','reason','jobId','expectedLeaseToken']<>'{}'::jsonb or not payload ?& array['jobId','expectedLeaseToken'] or jsonb_typeof(payload->'expectedLeaseToken')<>'string' or (payload->>'expectedLeaseToken')!~'^[1-9][0-9]{0,18}$' then raise exception using errcode='22023',message='Invalid reconciliation';end if;
  end if;
 end if;
 -- Shared persisted limits apply equally to direct RPCs and the HTTP API.
 stamp:=clock_timestamp();today:=(stamp at time zone 'UTC')::date;
 insert into private.operator_windows values(actor,stamp,0,0) on conflict do nothing;
 select * into budget_window from private.operator_windows where operator_windows.actor=op.actor for update;
 if budget_window.window_start<=stamp-interval '60 seconds' then budget_window.window_start:=stamp;budget_window.reads:=0;budget_window.mutations:=0;end if;
 if budget_window.reads>=60 or action in ('controls','reconcile') and budget_window.mutations>=10 then return jsonb_build_object('rateLimited',true,'retryAfterSeconds',greatest(1,ceil(extract(epoch from(budget_window.window_start+interval '60 seconds'-stamp)))::integer));end if;
 update private.operator_windows set window_start=budget_window.window_start,reads=budget_window.reads+1,mutations=budget_window.mutations+case when action in ('controls','reconcile') then 1 else 0 end where operator_windows.actor=op.actor;
 delete from private.operator_windows where window_start<stamp-interval '1 day';
 delete from private.operator_receipts where created_at<stamp-interval '30 days';
 delete from public.operator_audit a where a.action in ('operator.controls','operator.reconcile') and a.created_at<stamp-interval '30 days';
 begin -- Failed state checks roll back the action, but retain its rate-limit charge.
 if request_id is not null then
  select * into receipt from private.operator_receipts r where r.actor=op.actor and r.request_id=op.request_id;
  if found then if receipt.action<>action or receipt.request<>payload then raise exception using errcode='40001',message='Request identity conflict';end if;return receipt.response;end if;
  if (select count(*) from private.operator_receipts r where r.actor=op.actor)>=5000 then raise exception using errcode='P3004',message='Operator receipt capacity reached';end if;
 end if;
 select * into settings from public.app_settings where id='global';
 if settings.id is null then raise exception using errcode='P3004',message='Operations unavailable';end if;
 if action='health' then
  select coalesce(attempts,0) into daily from private.provider_daily_usage where day=today and scope_key='global';daily:=coalesce(daily,0);
  result:=jsonb_build_object('serverTime',to_char(stamp at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
   'controls',jsonb_build_object('version',settings.version,'generationPaused',settings.generation_paused,'claimsPaused',settings.claims_paused),
   'queueCounts',coalesce((select jsonb_object_agg(status,n) from(select status,count(*)::text n from public.jobs group by status)s),'{}'::jsonb),
   'storage',(select jsonb_build_object('usedBytes',used_bytes::text,'reservedBytes',reserved_bytes::text,'limitBytes',byte_limit::text,'retainedOutputs',retained_outputs,'reservedOutputs',reserved_outputs,
    'accountingMatches',used_bytes=coalesce((select sum(u.used_bytes) from public.usage_accounts u where u.scope='user'),0) and reserved_bytes=coalesce((select sum(u.reserved_bytes) from public.usage_accounts u where u.scope='user'),0) and retained_outputs=coalesce((select sum(u.retained_outputs) from public.usage_accounts u where u.scope='user'),0) and reserved_outputs=coalesce((select sum(u.reserved_outputs) from public.usage_accounts u where u.scope='user'),0)) from public.usage_accounts where scope='global'),
   'dailyBudget',jsonb_build_object('day',today::text,'globalUsed',daily,'globalLimit',24,'globalRemaining',greatest(0,24-daily),'perAccountLimit',12,'providerBalance','unknown',
    'accounts',coalesce((select jsonb_agg(jsonb_build_object('ownerId',scope_key,'used',attempts,'remaining',greatest(0,12-attempts))) from (select scope_key,attempts from private.provider_daily_usage where day=today and scope_key<>'global' order by attempts desc,scope_key limit 50)t),'[]'::jsonb)),
   'workers',coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'enabled',w.enabled,'online',coalesce(w.enabled and w.last_seen_at>stamp-interval '90 seconds' and w.last_seen_at<=stamp,false),
    'lastSeenAt',case when w.last_seen_at is null then null else to_char(w.last_seen_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') end,
    'executionReady',coalesce(w.health->'executionReady'='true'::jsonb,false),
    'credentialExpiresAt',(select to_char(max(c.expires_at) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') from public.worker_credentials c where c.worker_id=w.id and c.revoked_at is null and c.expires_at>stamp))) from(select * from public.workers order by id limit 50)w),'[]'::jsonb),
   'cleanupCounts',coalesce((select jsonb_object_agg(state,n) from(select state,count(*)::text n from public.cleanup_tasks group by state)s),'{}'::jsonb),
   'expiredAssignments',(select count(*)::text from public.jobs where status in ('running','cancel_requested') and lease_expires_at<=stamp),
   'uncertainProviderRequests',(select count(*)::text from public.provider_attempts where status in ('reserved','dispatched','outcome_unknown')),
   'providerStates',coalesce((select jsonb_agg(jsonb_build_object('provider',provider,'state',state)) from(select distinct provider,case when observed_at<stamp-interval '15 minutes' or observed_at>stamp then 'unknown' else state end state from public.provider_health where provider in ('gemini','elevenlabs') order by provider,state limit 10)s),'[]'::jsonb));
 elsif action in ('jobs','audit') then
  if action='jobs' then
   if cursor_id is not null then select created_at into cursor_time from public.jobs where id=cursor_id;if not found then raise exception using errcode='40001',message='Cursor expired';end if;end if;
   with page as(select j2.* from public.jobs j2 where (not payload?'status' or j2.status=payload->>'status') and(cursor_id is null or(j2.created_at,j2.id)<(cursor_time,cursor_id)) order by j2.created_at desc,j2.id desc limit 26),limited as(select * from page order by created_at desc,id desc limit 25)
   select coalesce(jsonb_agg(private.operator_job(l) order by l.created_at desc,l.id desc),'[]'),case when(select count(*) from page)>25 then(select id from limited order by created_at,id limit 1) end into items,next_cursor from limited l;
  else
   if cursor_id is not null then select created_at into cursor_time from public.operator_audit where id=cursor_id;if not found then raise exception using errcode='40001',message='Cursor expired';end if;end if;
   with page as(select * from public.operator_audit a where a.action in ('operator.controls','operator.reconcile') and(cursor_id is null or(a.created_at,a.id)<(cursor_time,cursor_id)) order by created_at desc,id desc limit 26),limited as(select * from page order by created_at desc,id desc limit 25)
   select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'actorId',l.actor_id,'action',l.action,'resourceId',l.resource_id,'createdAt',to_char(l.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')) order by l.created_at desc,l.id desc),'[]'),case when(select count(*) from page)>25 then(select id from limited order by created_at,id limit 1) end into items,next_cursor from limited l;
  end if;
  result:=jsonb_build_object('items',items,'nextCursor',next_cursor);
 elsif action='controls' then
  select * into settings from public.app_settings where id='global' for update;
  if settings.version<>(payload->>'expectedVersion')::integer then raise exception using errcode='40001',message='Control version changed';end if;
  before_controls:=jsonb_build_object('generationPaused',settings.generation_paused,'claimsPaused',settings.claims_paused);
  changed:=settings.generation_paused is distinct from coalesce((payload->>'generationPaused')::boolean,settings.generation_paused) or settings.claims_paused is distinct from coalesce((payload->>'claimsPaused')::boolean,settings.claims_paused);
  if changed then update public.app_settings set generation_paused=coalesce((payload->>'generationPaused')::boolean,generation_paused),claims_paused=coalesce((payload->>'claimsPaused')::boolean,claims_paused),version=version+1,updated_by=actor,updated_at=stamp where id='global' returning * into settings;end if;
  result:=jsonb_build_object('version',settings.version,'generationPaused',settings.generation_paused,'claimsPaused',settings.claims_paused);
  insert into public.operator_audit(actor_id,action,resource_type,safe_metadata) values(actor,'operator.controls','app_settings',jsonb_build_object('requestId',request_id,'reason',payload->>'reason','before',before_controls,'after',result));
 else
  if not settings.claims_paused then raise exception using errcode='P3003',message='Pause claims before reconciliation';end if;
  select * into j from public.jobs where id=(payload->>'jobId')::uuid;
  if not found then raise exception using errcode='P3003',message='Job not eligible';end if;
  perform 1 from public.usage_accounts where owner_id=j.owner_id for update;
  select * into slot from public.worker_slots where slot_name='processing' for update;
  perform 1 from public.profiles where id=j.owner_id for update;
  perform 1 from public.projects where id=j.project_id for update;
  perform 1 from public.revisions where id=j.revision_id for update;
  select * into j from public.jobs where id=j.id for update;
  stamp:=clock_timestamp();
  if j.lease_token<>(payload->>'expectedLeaseToken')::bigint then raise exception using errcode='40001',message='Lease changed';end if;
  if j.status not in ('running','cancel_requested') or slot.job_id is distinct from j.id or slot.lease_token is distinct from j.lease_token or slot.worker_id is distinct from j.worker_id or slot.worker_instance_id is distinct from j.worker_instance_id or j.lease_expires_at is null or slot.lease_expires_at is null or j.lease_expires_at>stamp or slot.lease_expires_at>stamp then raise exception using errcode='P3003',message='Job not eligible';end if;
  gate:=private.worker_job_gate(j);event_code:='OPERATOR_LEASE_EXPIRED';
  if gate='cancelled' then event_code:='CANCEL_LEASE_EXPIRED';
  elsif exists(select 1 from public.provider_attempts where job_id=j.id and status in ('reserved','dispatched','outcome_unknown')) then
   gate:='failed';event_code:='OPERATOR_REVIEW_REQUIRED';
   update public.provider_attempts set status='outcome_unknown',finished_at=coalesce(finished_at,stamp) where job_id=j.id and status in ('reserved','dispatched');
  elsif gate is null and j.active_ms+greatest(0,floor(extract(epoch from(j.lease_expires_at-j.last_heartbeat_at))*1000))>=1800000 then gate:='failed';end if;
  perform private.finish_worker_lease(j.id,coalesce(gate,'queued'),event_code);
  update public.job_events set safe_message=case when event_code='OPERATOR_REVIEW_REQUIRED' then 'Processing stopped for operator review of an unconfirmed provider request.' when coalesce(gate,'queued')='queued' then 'An expired assignment was reconciled. Completed checkpoints are preserved.' else safe_message end where job_id=j.id and sequence=(select event_sequence from public.jobs where id=j.id);
  select private.operator_job(x) into result from public.jobs x where id=j.id;
  insert into public.operator_audit(actor_id,action,resource_type,resource_id,safe_metadata) values(actor,'operator.reconcile','job',j.id,jsonb_build_object('requestId',request_id,'reason',payload->>'reason','previousLeaseToken',payload->>'expectedLeaseToken','status',result->>'status'));
 end if;
 if request_id is not null then insert into private.operator_receipts values(actor,request_id,action,payload,result,stamp);end if;
 return result;
 exception
  when sqlstate '40001' then return jsonb_build_object('operatorError','VERSION_CONFLICT');
  when sqlstate 'P3003' then return jsonb_build_object('operatorError','STATE_CONFLICT');
  when sqlstate '22023' or sqlstate '22P02' or sqlstate '22003' then return jsonb_build_object('operatorError','VALIDATION_FAILED');
 end;
end $$;
commit;
