begin;
set local lock_timeout='5s';
set local statement_timeout='60s';

-- Every capacity-changing path takes the same first locks, including uploads.
create function private.lock_usage_scope(actor uuid) returns void
language plpgsql set search_path='' as $$
begin
 if actor is null then raise exception using errcode='42501',message='Account unavailable';end if;
 perform 1 from public.usage_accounts where scope='global' for update;
 perform 1 from public.usage_accounts where scope='user' and owner_id=actor order by id for update;
end $$;
revoke all on function private.lock_usage_scope(uuid) from public,anon,authenticated;

create function private.complete_generation_input(value jsonb,mode text) returns boolean
language plpgsql immutable set search_path='' as $$
declare item jsonb; key text; text_limit integer; allowed text[]; required text[]; total integer:=0; images integer:=0; recordings integer:=0; seen uuid[]:='{}'; source uuid;
begin
 if value is null or not private.bounded_object(value) or value->>'mode' is distinct from mode then return false;end if;
 allowed:=array['mode','title','brief','sources','intendedUse'];
 if mode='education' then allowed:=allowed||array['topic','audience','learningObjective','referenceNotes'];required:=array['title','topic'];
 elsif mode='software' then allowed:=allowed||array['softwareName','featureHighlights'];required:=array['title','softwareName','brief'];
 elsif mode='branding' then allowed:=allowed||array['productName','benefits','brandDetails','brandColors','callToAction','intendedAudience'];required:=array['title','productName'];
 else return false;end if;
 if value-allowed<>'{}'::jsonb or value->>'intendedUse' not in ('personal-learning','promotional') or jsonb_typeof(value->'intendedUse') is distinct from 'string' then return false;end if;
 foreach key in array required loop
  if jsonb_typeof(value->key) is distinct from 'string' or private.trim_text(value->>key)='' then return false;end if;
 end loop;
 foreach key in array allowed loop
  if key in ('mode','sources','benefits','brandColors') or not value?key then continue;end if;
  text_limit:=case key when 'title' then 120 when 'softwareName' then 120 when 'productName' then 120 when 'topic' then 300 when 'learningObjective' then 500 when 'referenceNotes' then 10000 when 'callToAction' then 160 when 'intendedAudience' then 200 when 'audience' then 20 when 'intendedUse' then 20 else 4000 end;
  if jsonb_typeof(value->key)<>'string' or private.utf16_length(value->>key)>text_limit then return false;end if;
  if key in ('brief','learningObjective','featureHighlights','brandDetails','callToAction','intendedAudience') then total:=total+private.utf16_length(value->>key);end if;
 end loop;
 if mode='education' and (jsonb_typeof(value->'audience') is distinct from 'string' or value->>'audience' not in ('beginner','school','adult')) then return false;end if;
 if value?'benefits' then
  if jsonb_typeof(value->'benefits')<>'array' or jsonb_array_length(value->'benefits')>8 then return false;end if;
  for item in select * from jsonb_array_elements(value->'benefits') loop
   if jsonb_typeof(item)<>'string' or private.trim_text(item#>>'{}')='' or private.utf16_length(item#>>'{}')>200 then return false;end if;
   total:=total+private.utf16_length(item#>>'{}');
  end loop;
 end if;
 if total>4000 then return false;end if;
 if value?'brandColors' then
  if jsonb_typeof(value->'brandColors')<>'array' or jsonb_array_length(value->'brandColors')>4 then return false;end if;
  for item in select * from jsonb_array_elements(value->'brandColors') loop
   if jsonb_typeof(item)<>'string' or (item#>>'{}')!~'^#[0-9a-fA-F]{6}$' then return false;end if;
  end loop;
 end if;
 if jsonb_typeof(value->'sources') is distinct from 'array' or jsonb_array_length(value->'sources')>9 then return false;end if;
 for item in select * from jsonb_array_elements(value->'sources') loop
  if jsonb_typeof(item)<>'object' or not item?&array['assetId','role'] or item-array['assetId','role']<>'{}'::jsonb or jsonb_typeof(item->'assetId')<>'string' or jsonb_typeof(item->'role')<>'string' then return false;end if;
  source:=(item->>'assetId')::uuid;
  if source=any(seen) or item->>'role' not in ('image','recording','logo') then return false;end if;seen:=array_append(seen,source);
  if item->>'role'='recording' then recordings:=recordings+1;else images:=images+1;end if;
  if (mode='education') or (mode='software' and item->>'role'='logo') or (mode='branding' and item->>'role'='recording') then return false;end if;
 end loop;
 if images>8 or recordings>1 or (mode='software' and images+recordings=0) or (mode='branding' and not exists(select 1 from jsonb_array_elements(value->'sources') s where s->>'role'='image')) then return false;end if;
 return true;
exception when invalid_text_representation or invalid_parameter_value or numeric_value_out_of_range then return false;
end $$;
revoke all on function private.complete_generation_input(jsonb,text) from public,anon,authenticated;

create function private.generation_job_json(j public.jobs) returns jsonb
language sql stable set search_path='' as $$
select jsonb_build_object('id',j.id,'projectId',j.project_id,'revisionId',j.revision_id,'kind',j.kind,'status',j.status,'stage',j.stage,
 'progress',jsonb_build_object('completedScenes',(j.progress->>'completedScenes')::integer,'totalScenes',j.progress->'totalScenes','activeMs',j.active_ms::text),
 'lastEventSequence',j.event_sequence::text,
 'createdAt',to_char(j.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
 'startedAt',to_char(j.started_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
 'finishedAt',to_char(j.finished_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
 'retryAt',to_char(j.retry_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
 'error',case when j.safe_error_code is null then null else jsonb_build_object('code','GENERATION_FAILED','message','Generation could not finish.','retryable',false,'action','none') end,
 'canCancel',false,'canRetry',false);
$$;
revoke all on function private.generation_job_json(public.jobs) from public,anon,authenticated;

create function public.get_generation_job(job uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.active_user() then raise exception using errcode='42501',message='Account unavailable';end if;
 select private.generation_job_json(j) into result from public.jobs j
 where j.id=job and j.owner_id=auth.uid() and private.revision_visible(j.revision_id,j.project_id,j.owner_id);
 return result;
end $$;
revoke all on function public.get_generation_job(uuid) from public,anon,authenticated;
grant execute on function public.get_generation_job(uuid) to authenticated;

create function public.enqueue_generation(project uuid,request_key text,request jsonb) returns jsonb
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

create or replace function public.reserve_source_upload(project uuid,expected_version integer,request_key text,request_hash text,filename text,mime text,bytes bigint,role text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); p public.projects; previous public.idempotency_requests; asset uuid:=gen_random_uuid(); upload uuid:=gen_random_uuid(); reservation uuid:=gen_random_uuid(); selected jsonb; g public.usage_accounts; ua public.usage_accounts; count_images integer; count_recordings integer; total bigint; reserve_bytes bigint:=45000000; expires timestamptz:=now()+interval '24 hours';
begin
 perform private.lock_usage_scope(actor);
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

create or replace function public.change_source_upload(upload uuid,action text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); p public.projects; u public.upload_allocations; a public.assets; r public.usage_reservations; obj storage.objects; amount bigint; selected jsonb;
begin
 perform private.lock_usage_scope(actor);
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
commit;
