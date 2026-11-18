begin;
create or replace function public.enqueue_generation(project uuid,request_key text,request jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); p public.projects; prior public.idempotency_requests; settings public.app_settings; g public.usage_accounts; ua public.usage_accounts;
 j public.jobs; rev uuid:=gen_random_uuid(); job uuid:=gen_random_uuid(); reservation uuid:=gen_random_uuid(); payload jsonb; frozen jsonb; result jsonb; request_hash text;
 source jsonb; a public.assets; u public.upload_allocations; object storage.objects; byte_total bigint:=0; amount bigint; active_job uuid; live_outputs integer; retired integer;
 wait_until timestamptz:=now()+interval '7 days'; queue_status text;
begin
 perform private.lock_usage_scope(actor);
 select * into settings from public.app_settings where id='global' for share;
 perform 1 from public.profiles where id=actor and status='active' for update;
 if not found then raise exception using errcode='42501',message='Account unavailable';end if;
 select * into p from public.projects where id=project and owner_id=actor and deleted_at is null and draft_state='active' for update;
 if not found then raise exception using errcode='42501',message='Draft unavailable';end if;
 if request_key is null or request_key!~'^[a-zA-Z0-9_-]{1,128}$' or request is null or not private.bounded_object(request)
 or not request?&array['draftVersion','preferences','acknowledgments'] or request-array['draftVersion','preferences','acknowledgments']<>'{}'::jsonb
 or jsonb_typeof(request->'draftVersion') is distinct from 'number' or (request->>'draftVersion')!~'^[1-9][0-9]{0,9}$' or (request->>'draftVersion')::bigint>2147483647
 or not private.valid_preferences(request->'preferences') or not (request->'preferences')?&array['targetSeconds','orientation','voiceProfileId'] or request->'preferences'->>'voiceProfileId' is distinct from 'Kore'
 or request->'acknowledgments' is distinct from '{"sourceRights":true,"externalAiProcessing":true,"policyVersion":"v1"}'::jsonb then raise exception using errcode='22023',message='Invalid generation request';end if;
 request_hash:=encode(sha256(convert_to(request::text,'UTF8')),'hex');
 select * into prior from public.idempotency_requests where owner_id=actor and operation='enqueue_generation:'||project::text and key=request_key for update;
 if found then
  if prior.request_hash<>request_hash then raise exception using errcode='23505',message='Request key already used';end if;
  select * into j from public.jobs where id=prior.resource_id and owner_id=actor and project_id=project;
  if not found or not private.revision_visible(j.revision_id,project,actor) then raise exception using errcode='P1407',message='Generation unavailable';end if;
  return jsonb_build_object('jobId',j.id,'revisionId',j.revision_id,'status',j.status,'stage',j.stage,'statusUrl','/api/v1/jobs/'||j.id,'reused',true);
 end if;
 if (request->>'draftVersion')::integer<>p.draft_version then raise exception using errcode='40001',message='Draft changed',detail=p.draft_version::text;end if;
 payload:=p.draft_input||jsonb_build_object('mode',p.mode,'title',p.title);
 if not private.complete_generation_input(payload,p.mode) then raise exception using errcode='22023',message='Incomplete generation input';end if;
 select id into active_job from public.jobs where owner_id=actor and status in ('queued','waiting_worker','running','waiting_quota','cancel_requested') limit 1;
 if active_job is not null then raise exception using errcode='P1401',message='Active job exists',detail=active_job::text;end if;
 if settings.id is null or settings.generation_paused then raise exception using errcode='P1402',message='Generation paused';end if;
 if settings.limits?'enabledGenerationModes' and not coalesce((settings.limits->'enabledGenerationModes')?p.mode,false) then raise exception using errcode='P1402',message='This generation mode is not enabled';end if;
 if settings.limits->'globalByteLimitConfigured' is distinct from 'true'::jsonb or settings.limits->>'generationReservationBytes' is distinct from '167772160'
 or settings.limits->>'retainedOutputsPerUser' is distinct from '3' then raise exception using errcode='P1403',message='Capacity not configured';end if;
 amount:=167772160;
 select * into g from public.usage_accounts where scope='global';select * into ua from public.usage_accounts where scope='user' and owner_id=actor;
 if g.id is null or ua.id is null or g.byte_limit<=0 or ua.byte_limit<=0 or ua.output_limit is null then raise exception using errcode='P1403',message='Capacity not configured';end if;
 select count(*)::integer into live_outputs from public.revisions r join public.projects p2 on p2.id=r.project_id and p2.owner_id=actor where r.owner_id=actor and r.status='ready' and r.deleted_at is null and p2.deleted_at is null and r.expires_at>now();
 retired:=ua.retained_outputs-live_outputs;
 if retired<0 or retired>g.retained_outputs then raise exception using errcode='P1403',message='Accounting requires reconciliation';end if;
 if live_outputs+ua.reserved_outputs>=least(3,ua.output_limit) or (g.output_limit is not null and g.retained_outputs-retired+g.reserved_outputs>=g.output_limit) then raise exception using errcode='P1404',message='Output limit reached';end if;
 if amount>g.byte_limit-g.used_bytes-g.reserved_bytes or amount>ua.byte_limit-ua.used_bytes-ua.reserved_bytes then raise exception using errcode='P1403',message='Storage capacity reached';end if;
 -- All selected sources are locked in UUID order; receipt is not media decoding.
 perform 1 from public.assets a2 join jsonb_array_elements(payload->'sources') s on a2.id=(s->>'assetId')::uuid where a2.project_id=project and a2.owner_id=actor order by a2.id for update of a2;
 for source in select * from jsonb_array_elements(payload->'sources') loop
  select * into a from public.assets where id=(source->>'assetId')::uuid and owner_id=actor and project_id=project;
  if not found then raise exception using errcode='22023',message='Invalid source selection';end if;
  select * into u from public.upload_allocations where asset_id=a.id and owner_id=actor and project_id=project;
  if not found or u.source_role is distinct from source->>'role' then raise exception using errcode='22023',message='Invalid source selection';end if;
  if a.deleted_at is not null or (a.expires_at is not null and a.expires_at<=now()) or a.state in ('rejected','expired','deleting','deleted') then raise exception using errcode='P1407',message='Inputs expired';end if;
  if u.state<>'received' or a.state not in ('received','validated','available') then raise exception using errcode='P1405',message='Upload incomplete';end if;
  select * into object from storage.objects where bucket_id=a.bucket and name=a.object_key;
  if not found or object.metadata->>'size' is distinct from u.expected_bytes::text or object.metadata->>'mimetype' is distinct from u.expected_mime or a.byte_size is distinct from u.expected_bytes then raise exception using errcode='P1405',message='Upload incomplete';end if;
  byte_total:=byte_total+a.byte_size;
 end loop;
 if byte_total>60000000 then raise exception using errcode='22023',message='Source limit';end if;
 queue_status:=case when not settings.claims_paused and exists(select 1 from public.workers where enabled and protocol_version=1 and last_seen_at>now()-interval '90 seconds' and last_seen_at<=now() and capabilities->'modes' ? p.mode) then 'queued' else 'waiting_worker' end;
 frozen:=jsonb_build_object('input',payload,'preferences',request->'preferences','acknowledgments',(request->'acknowledgments')||jsonb_build_object('acceptedAt',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')),'draftVersion',p.draft_version);
 insert into public.revisions(id,project_id,owner_id,revision_number,input_snapshot,input_hash,request_kind,target_seconds,orientation,voice_profile_id,schema_version,prompt_version,composition_version)
 values(rev,project,actor,p.next_revision_number,frozen,encode(sha256(convert_to(frozen::text,'UTF8')),'hex'),'initial',(request->'preferences'->>'targetSeconds')::smallint,request->'preferences'->>'orientation','Kore',1,'v1','v1');
 insert into public.jobs(id,project_id,owner_id,revision_id,kind,status,event_sequence,budget_snapshot)
 values(job,project,actor,rev,'generation',queue_status,1,jsonb_build_object('maxExternalAttempts',24,'maxRepairs',2,'maxActiveMs','1800000','reservationBytes',amount::text));
 insert into public.usage_reservations(id,owner_id,job_id,kind,bytes_remaining,output_slots_remaining,expires_at) values(reservation,actor,job,'generation',amount,1,wait_until);
 update public.usage_accounts set reserved_bytes=reserved_bytes+amount,reserved_outputs=reserved_outputs+1,retained_outputs=retained_outputs-retired,updated_at=now() where id in (g.id,ua.id);
 insert into public.usage_ledger(operation_key,owner_id,reservation_id,used_bytes_delta,reserved_bytes_delta,retained_outputs_delta,reserved_outputs_delta,reason)
 values('generation:reserve:'||job,actor,reservation,0,amount,-retired,1,'generation admission and expired output reconciliation');
 for source in select * from jsonb_array_elements(payload->'sources') loop
  update public.assets set expires_at=greatest(expires_at,wait_until),updated_at=now() where id=(source->>'assetId')::uuid;
  insert into public.revision_assets(revision_id,asset_id,project_id,owner_id,purpose,retain_until) values(rev,(source->>'assetId')::uuid,project,actor,'input',wait_until);
 end loop;
 update public.projects set next_revision_number=next_revision_number+1 where id=project;
 insert into public.job_events(job_id,sequence,stage,code,safe_message) values(job,1,'understand',case when queue_status='queued' then 'QUEUED' else 'WAITING_WORKER' end,case when queue_status='queued' then 'Generation queued.' else 'Waiting for a compatible processing computer.' end);
 result:=jsonb_build_object('jobId',job,'revisionId',rev,'status',queue_status,'stage','understand','statusUrl','/api/v1/jobs/'||job,'reused',false);
 insert into public.idempotency_requests(owner_id,operation,key,request_hash,resource_type,resource_id,response_status,safe_response) values(actor,'enqueue_generation:'||project::text,request_key,request_hash,'job',job,202,result);
 return result;
end $$;
revoke all on function public.enqueue_generation(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.enqueue_generation(uuid,text,jsonb) to authenticated;
commit;
