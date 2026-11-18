begin;
set local lock_timeout='5s';set local statement_timeout='60s';
create function public.cancel_generation(job uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();j public.jobs;r public.revisions;stamp timestamptz;
begin
 perform private.lock_usage_scope(actor);
 perform 1 from public.worker_slots where slot_name='processing' for update;
 perform 1 from public.profiles where id=actor and status='active' for update;
 if not found then raise exception using errcode='42501',message='Account unavailable';end if;
 select * into j from public.jobs where id=job and owner_id=actor and kind='generation';
 if not found then raise exception using errcode='42501',message='Generation unavailable';end if;
 perform 1 from public.projects where id=j.project_id and owner_id=actor and deleted_at is null and draft_state='active' and mode='education' for update;
 if not found then raise exception using errcode='42501',message='Generation unavailable';end if;
 select * into r from public.revisions where id=j.revision_id and deleted_at is null for update;
 if not found then raise exception using errcode='42501',message='Generation unavailable';end if;
 select * into j from public.jobs where id=job for update;
 stamp:=clock_timestamp();
 if j.status='cancelled' then return jsonb_build_object('jobId',j.id,'status','cancelled');end if;
 if j.status not in ('queued','waiting_worker','waiting_quota','running','cancel_requested') then raise exception using errcode='P1901',message='Generation already stopped or completed';end if;
 if j.status in ('running','cancel_requested') and j.lease_expires_at>stamp then
  if j.status<>'cancel_requested' then
   update public.jobs set status='cancel_requested',cancel_requested_at=stamp,event_sequence=event_sequence+1,updated_at=stamp where id=j.id returning * into j;
   insert into public.job_events(job_id,sequence,stage,code,safe_message) values(j.id,j.event_sequence,j.stage,'CANCEL_REQUESTED','Cancellation requested. Waiting for processing to stop.');
  end if;
  return jsonb_build_object('jobId',j.id,'status','cancel_requested');
 end if;
 -- No live assignment remains: fence the old lease before releasing reservations.
 update public.jobs set cancel_requested_at=coalesce(cancel_requested_at,stamp) where id=j.id;
 perform private.finish_worker_lease(j.id,'cancelled','GENERATION_CANCELLED');
 return jsonb_build_object('jobId',j.id,'status','cancelled');
end $$;
revoke all on function public.cancel_generation(uuid) from public,anon;
grant execute on function public.cancel_generation(uuid) to authenticated;

create or replace function private.finish_worker_lease(job uuid,next_status text,event_code text) returns void language plpgsql set search_path='' as $$
declare j public.jobs; reservation public.usage_reservations; delta bigint; stamp timestamptz:=clock_timestamp();
begin
 select * into j from public.jobs where id=job;
 delta:=coalesce(greatest(0,floor(extract(epoch from(least(stamp,j.lease_expires_at)-j.last_heartbeat_at))*1000))::bigint,0);
 update public.job_runs set active_ms=active_ms+delta,ended_at=stamp,outcome=case when next_status='cancelled' then 'cancelled' else 'lease_lost' end where job_id=j.id and lease_token=j.lease_token and outcome='active';
 if next_status='cancelled' then update public.provider_attempts set status='outcome_unknown',finished_at=coalesce(finished_at,stamp) where job_id=j.id and status in ('reserved','dispatched');end if;
 if next_status in ('cancelled','needs_input','failed') then
  select * into reservation from public.usage_reservations where job_id=j.id for update;
  if reservation.state='reserved' then
   update public.usage_accounts set reserved_bytes=reserved_bytes-reservation.bytes_remaining,reserved_outputs=reserved_outputs-reservation.output_slots_remaining,updated_at=stamp where scope='global' or owner_id=j.owner_id;
   insert into public.usage_ledger(operation_key,owner_id,reservation_id,used_bytes_delta,reserved_bytes_delta,retained_outputs_delta,reserved_outputs_delta,reason) values('worker:release:'||j.id||':'||j.lease_token,j.owner_id,reservation.id,0,-reservation.bytes_remaining,0,-reservation.output_slots_remaining,'terminal worker lease');
   update public.usage_reservations set bytes_remaining=0,output_slots_remaining=0,state='released',updated_at=stamp where id=reservation.id;
  end if;
 end if;
 update public.jobs set status=next_status,worker_id=null,worker_instance_id=null,lease_token=lease_token+1,lease_expires_at=null,last_heartbeat_at=null,active_ms=active_ms+delta,event_sequence=event_sequence+1,available_at=stamp+case when event_code='ADAPTER_PENDING' then interval '60 seconds' else interval '0 seconds' end,finished_at=case when next_status in ('cancelled','needs_input','failed') then stamp else null end,safe_error_code=case when next_status in ('needs_input','failed') then event_code else null end,safe_message=null,updated_at=stamp where id=j.id;
 update public.revisions set status=case when next_status in ('cancelled','needs_input','failed') then next_status else 'pending' end where id=j.revision_id and status in ('pending','processing');
 update public.worker_slots set job_id=null,worker_id=null,worker_instance_id=null,lease_token=null,lease_expires_at=null where slot_name='processing' and job_id=j.id;
 insert into public.job_events(job_id,sequence,stage,code,safe_message) select id,event_sequence,stage,event_code,case when next_status='waiting_worker' then 'Waiting for a compatible pipeline executor.' when next_status='cancelled' then 'Processing stopped.' when next_status='needs_input' then 'The saved source inputs are no longer available.' when next_status='failed' then 'Processing stopped at its execution budget.' else 'An expired assignment was returned to the queue.' end from public.jobs where id=j.id;
end $$;
revoke all on function private.finish_worker_lease(uuid,text,text) from public,anon,authenticated;


create or replace function public.worker_control(credential_hash text,protocol integer,action text,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare w public.workers; c public.worker_credentials; slot public.worker_slots; j public.jobs; candidate public.jobs; candidate_revision public.revisions; old public.jobs; settings public.app_settings;
 instance uuid; caps jsonb; stamp timestamptz:=clock_timestamp(); gate text; delta bigint; token bigint;
begin
 if credential_hash is null or credential_hash!~'^[a-f0-9]{64}$' then raise exception using errcode='P1501',message='Worker unavailable';end if;
 select * into c from public.worker_credentials where token_hash=credential_hash;
 if not found then raise exception using errcode='P1501',message='Worker unavailable';end if;
 select * into w from public.workers where id=c.worker_id for update;
 if not found then raise exception using errcode='P1501',message='Worker unavailable';end if;
 select * into c from public.worker_credentials where id=c.id for share;
 if not found or not w.enabled or c.revoked_at is not null or c.expires_at<=clock_timestamp() then raise exception using errcode='P1501',message='Worker unavailable';end if;
 if protocol is distinct from 1 or w.protocol_version<>1 then raise exception using errcode='P1502',message='Worker protocol unsupported';end if;
 if action not in ('claim','heartbeat','release') or action is null or not private.bounded_object(payload) then raise exception using errcode='P1504',message='Invalid worker request';end if;
 instance:=(payload->>'instanceId')::uuid;
 if instance is null then raise exception using errcode='P1504',message='Invalid worker request';end if;
 if action='claim' then
  caps:=payload->'capabilities';
  if payload-array['instanceId','capabilities']<>'{}'::jsonb or not private.bounded_object(caps) or jsonb_typeof(caps->'modes')<>'array' or jsonb_array_length(caps->'modes') not between 1 and 3 or jsonb_typeof(caps->'orientations')<>'array' or jsonb_array_length(caps->'orientations') not between 1 and 2 or jsonb_typeof(caps->'schemaVersions')<>'array' or jsonb_array_length(caps->'schemaVersions') not between 1 and 5 or caps->'compositionVersion' is distinct from w.capabilities->'compositionVersion' or not ((w.capabilities->'modes') @> (caps->'modes')) or not ((w.capabilities->'orientations') @> (caps->'orientations')) or not ((w.capabilities->'schemaVersions') @> (caps->'schemaVersions')) then raise exception using errcode='P1504',message='Unsupported worker capabilities';end if;
 elsif action='heartbeat' then
  if payload-array['instanceId','health','assignment']<>'{}'::jsonb or not private.bounded_object(payload->'health') then raise exception using errcode='P1504',message='Invalid worker health';end if;
 else
  if payload-array['instanceId','jobId','leaseToken','reason']<>'{}'::jsonb or payload->>'reason' not in ('adapter_pending','stopping') then raise exception using errcode='P1504',message='Invalid release';end if;
 end if;
 -- No network or provider work occurs while these short metadata locks are held.
 perform 1 from public.usage_accounts where scope='global' for update;
 if not found then raise exception using errcode='P1506',message='Processing configuration unavailable';end if;
 select * into settings from public.app_settings where id='global' for share;
 if not found then raise exception using errcode='P1506',message='Processing configuration unavailable';end if;
 select * into slot from public.worker_slots where slot_name='processing';
 if slot.job_id is not null then select * into old from public.jobs where id=slot.job_id;end if;
 if action='claim' and not settings.claims_paused then
  select j2.* into candidate from public.jobs j2 join public.revisions r on r.id=j2.revision_id join public.projects p on p.id=j2.project_id
  where (j2.status in ('queued','waiting_worker') or (j2.id=slot.job_id and slot.lease_expires_at<=stamp)) and j2.kind='generation' and j2.available_at<=stamp and j2.protocol_version=1
  and caps->'modes' ? p.mode and caps->'orientations' ? r.orientation and (caps->'schemaVersions') @> to_jsonb(array[r.schema_version]) and caps->>'compositionVersion'=r.composition_version
  order by j2.available_at,j2.created_at,j2.id limit 1;
 end if;
 perform 1 from public.usage_accounts where owner_id in(old.owner_id,candidate.owner_id) order by id for update;
 select * into slot from public.worker_slots where slot_name='processing' for update;
 if not found then raise exception using errcode='P1506',message='Processing slot unavailable';end if;
 perform 1 from public.profiles where id in(old.owner_id,candidate.owner_id) order by id for update;
 perform 1 from public.projects where id in(old.project_id,candidate.project_id) order by id for update;
 perform 1 from public.revisions where id in(old.revision_id,candidate.revision_id) order by id for update;
 perform 1 from public.jobs where id in(old.id,candidate.id) order by id for update;
 stamp:=clock_timestamp();
 if c.expires_at<=stamp then raise exception using errcode='P1501',message='Worker unavailable';end if;
 -- Idle heartbeats also reconcile an expired cancellation without the original worker.
 if action='heartbeat' and not payload?'assignment' and slot.job_id is not null and slot.lease_expires_at<=stamp then
  select * into j from public.jobs where id=slot.job_id;
  if j.status='cancel_requested' then perform private.finish_worker_lease(j.id,'cancelled','CANCEL_LEASE_EXPIRED');end if;
 end if;
 if action='claim' then
  update public.workers set last_seen_at=stamp,updated_at=stamp where id=w.id;
  update public.worker_credentials set last_used_at=stamp where id=c.id;
  if slot.job_id is not null then
   select * into j from public.jobs where id=slot.job_id;
   if slot.lease_expires_at>stamp then
    if slot.worker_id=w.id and slot.worker_instance_id=instance and j.worker_instance_id=instance and j.worker_id=w.id and j.lease_token=slot.lease_token then
     gate:=private.worker_job_gate(j);if gate is not null then return jsonb_build_object('idle',true);end if;
     return private.worker_assignment(j);
    end if;
    return jsonb_build_object('idle',true);
   end if;
   gate:=private.worker_job_gate(j);
   if gate is null and j.active_ms+greatest(0,floor(extract(epoch from(j.lease_expires_at-j.last_heartbeat_at))*1000))>=1800000 then gate:='failed';end if;
   perform private.finish_worker_lease(j.id,coalesce(gate,'queued'),'LEASE_EXPIRED');stamp:=clock_timestamp();
  end if;
  if settings.claims_paused or candidate.id is null then return jsonb_build_object('idle',true);end if;
  select * into j from public.jobs where id=candidate.id;
  if j.status not in ('queued','waiting_worker') or j.available_at>stamp then return jsonb_build_object('idle',true);end if;
  gate:=private.worker_job_gate(j);
  if gate is not null then perform private.finish_worker_lease(j.id,gate,'JOB_UNAVAILABLE');return jsonb_build_object('idle',true);end if;
  select * into candidate_revision from public.revisions where id=j.revision_id;
  if candidate_revision.schema_version<>1 or not private.complete_generation_input(candidate_revision.input_snapshot->'input',(candidate_revision.input_snapshot->'input'->>'mode')) then
   perform private.finish_worker_lease(j.id,'needs_input','INPUT_INVALID');return jsonb_build_object('idle',true);
  end if;
  token:=j.lease_token+1;
  update public.jobs set status='running',worker_id=w.id,worker_instance_id=instance,lease_token=token,lease_expires_at=stamp+interval '90 seconds',last_heartbeat_at=stamp,started_at=coalesce(started_at,stamp),attempt_count=attempt_count+1,event_sequence=event_sequence+1,updated_at=stamp where id=j.id returning * into j;
  update public.worker_slots set job_id=j.id,worker_id=w.id,worker_instance_id=instance,lease_token=token,lease_expires_at=j.lease_expires_at where slot_name='processing';
  insert into public.job_runs(job_id,attempt_number,worker_id,lease_token,started_at) values(j.id,j.attempt_count,w.id,token,stamp);
  -- A valid active assignment protects its original sources through the remaining
  -- bounded active-time budget; claim replay above does not extend retention.
  perform 1 from public.assets a join public.revision_assets x on x.asset_id=a.id where x.revision_id=j.revision_id and x.purpose='input' order by a.id for update of a;
  update public.revision_assets set retain_until=greatest(retain_until,stamp+(1800000-j.active_ms)*interval '1 millisecond') where revision_id=j.revision_id and purpose='input';
  update public.assets a set expires_at=greatest(a.expires_at,x.retain_until) from public.revision_assets x where x.asset_id=a.id and x.revision_id=j.revision_id and x.purpose='input';
  update public.revisions set status='processing' where id=j.revision_id and status='pending';
  insert into public.job_events(job_id,sequence,stage,code,safe_message) values(j.id,j.event_sequence,j.stage,'WORKER_ASSIGNED','A processing computer accepted the assignment.');
  update public.worker_credentials set last_used_at=stamp where id=c.id;
  return private.worker_assignment(j);
 end if;
 if action='heartbeat' and not payload?'assignment' then
  update public.workers set health=payload->'health',last_seen_at=stamp,updated_at=stamp where id=w.id;
  update public.worker_credentials set last_used_at=stamp where id=c.id;
  return jsonb_build_object('serverTime',to_char(stamp at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'leaseExpiresAt',null,'cancelRequested',false,'claimsPaused',settings.claims_paused);
 end if;
 if slot.job_id is null or slot.worker_id<>w.id or slot.worker_instance_id is distinct from instance or slot.lease_expires_at<=stamp then raise exception using errcode='P1503',message='Worker assignment lost';end if;
 select * into j from public.jobs where id=slot.job_id;
 if j.worker_id is distinct from w.id or j.worker_instance_id is distinct from instance or j.lease_expires_at<=stamp or j.status not in ('running','cancel_requested') then raise exception using errcode='P1503',message='Worker assignment lost';end if;
 if action='heartbeat' then
  if (payload->'assignment'->>'jobId')::uuid is distinct from j.id or payload->'assignment'->>'leaseToken' is distinct from j.lease_token::text then raise exception using errcode='P1503',message='Worker assignment lost';end if;
 else
  if (payload->>'jobId')::uuid is distinct from j.id or payload->>'leaseToken' is distinct from j.lease_token::text then raise exception using errcode='P1503',message='Worker assignment lost';end if;
 end if;
 gate:=private.worker_job_gate(j);
 if action='release' then
  perform private.finish_worker_lease(j.id,coalesce(gate,'waiting_worker'),'ADAPTER_PENDING');
  return jsonb_build_object('released',true,'status',coalesce(gate,'waiting_worker'),'serverTime',to_char(stamp at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'));
 end if;
 delta:=greatest(0,floor(extract(epoch from(stamp-j.last_heartbeat_at))*1000))::bigint;
 update public.job_runs set active_ms=active_ms+delta where job_id=j.id and lease_token=j.lease_token and outcome='active';
 update public.jobs set active_ms=active_ms+delta,last_heartbeat_at=stamp,lease_expires_at=case when gate is null and active_ms+delta<1800000 then stamp+interval '90 seconds' else lease_expires_at end,updated_at=stamp where id=j.id returning * into j;
 update public.worker_slots set lease_expires_at=j.lease_expires_at where slot_name='processing';
 update public.workers set health=payload->'health',last_seen_at=stamp,updated_at=stamp where id=w.id;
 update public.worker_credentials set last_used_at=stamp where id=c.id;
 return jsonb_build_object('serverTime',to_char(stamp at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'leaseExpiresAt',to_char(j.lease_expires_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'cancelRequested',gate is not null or j.active_ms>=1800000,'claimsPaused',settings.claims_paused);
exception when invalid_text_representation or numeric_value_out_of_range then raise exception using errcode='P1504',message='Invalid worker request';
end $$;
revoke all on function public.worker_control(text,integer,text,jsonb) from public,anon,authenticated;
grant execute on function public.worker_control(text,integer,text,jsonb) to service_role;
commit;
