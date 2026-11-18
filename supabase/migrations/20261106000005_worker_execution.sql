begin;
set local lock_timeout='5s';set local statement_timeout='60s';
-- The existing control procedure owns worker/global/user/slot/profile/project
-- locks. Reuse it for every execution mutation rather than inventing a second
-- authorization or capacity lock order.
create function public.worker_execute(credential_hash text,protocol integer,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j public.jobs; r public.revisions; a public.assets; res public.usage_reservations; p public.provider_attempts;
 op jsonb:=payload->'operation'; operation_type text:=payload->'operation'->>'type'; hb jsonb; value jsonb:='{}'; stamp timestamptz; identity uuid; plan_id uuid; row_data jsonb; idx integer; x uuid; count_assets integer; verification jsonb; receipt public.job_terminal_operations; request_hash text; w uuid;
begin
 hb:=public.worker_control(credential_hash,protocol,'heartbeat',jsonb_build_object('instanceId',payload->'instanceId','health',payload->'health'));
 select * into j from public.jobs where id=(payload->>'jobId')::uuid;
 if not found then raise exception using errcode='P1503',message='Assignment lost';end if;
 -- The first heartbeat holds the global lock. Lock the requested owner hierarchy
 -- in the same order even for an already completed receipt.
 perform 1 from public.usage_accounts where owner_id=j.owner_id for update;
 perform 1 from public.profiles where id=j.owner_id for update;
 perform 1 from public.projects where id=j.project_id for update;
 select * into r from public.revisions where id=j.revision_id for update;
 select * into j from public.jobs where id=j.id for update;
 request_hash:=encode(extensions.digest(convert_to(op::text,'UTF8'),'sha256'),'hex');
 select worker_id into w from public.worker_credentials where token_hash=credential_hash;
 if operation_type='complete' and j.status='succeeded' then
  select * into receipt from public.job_terminal_operations where job_id=j.id and job_terminal_operations.kind='complete' and operation_key=op->>'key';
  if receipt.request_hash=request_hash and exists(select 1 from public.job_runs where job_id=j.id and worker_id=w and lease_token=(payload->>'leaseToken')::bigint) and exists(select 1 from public.profiles where id=j.owner_id and status='active') and exists(select 1 from public.projects where id=j.project_id and deleted_at is null) and r.deleted_at is null and r.expires_at>clock_timestamp() then
   return jsonb_build_object('serverTime',hb->'serverTime','leaseExpiresAt',null,'value',receipt.safe_result);
  end if;
  raise exception using errcode='P1503',message='Completion unavailable';
 end if;
 hb:=public.worker_control(credential_hash,protocol,'heartbeat',jsonb_build_object('instanceId',payload->'instanceId','health',payload->'health','assignment',jsonb_build_object('jobId',j.id,'leaseToken',payload->>'leaseToken')));
 if (hb->>'cancelRequested')::boolean then raise exception using errcode='P1503',message='Processing stopped';end if;
 if r.input_snapshot->'input'->>'mode'<>'education' or jsonb_array_length(r.input_snapshot->'input'->'sources')<>0 then raise exception using errcode='P1601',message='Education executor required';end if;
 select * into j from public.jobs where id=j.id;
 select * into res from public.usage_reservations where job_id=j.id for update;
 stamp:=clock_timestamp();
 if operation_type='state' then
  select jsonb_build_object('checkpoints',coalesce(jsonb_agg(jsonb_build_object('id',c.id,'stage',c.stage,'key',c.unit_key,'dependencyHash',c.dependency_hash,'manifest',c.manifest,'assets',coalesce((select jsonb_agg(ca.asset_id) from public.checkpoint_assets ca join public.assets aa on aa.id=ca.asset_id where ca.checkpoint_id=c.id and aa.state in ('validated','available') and aa.deleted_at is null and aa.expires_at>stamp),'[]'::jsonb)) order by c.created_at),'[]'::jsonb)) into value from public.checkpoints c where c.job_id=j.id and c.state='complete';
 elsif operation_type='progress' then
  if op->>'stage' not in ('understand','story','voice','render') then raise exception using errcode='P1601',message='Invalid stage';end if;
  if j.stage<>op->>'stage' then update public.jobs set stage=op->>'stage',event_sequence=event_sequence+1 where id=j.id returning * into j;insert into public.job_events(job_id,sequence,stage,code,safe_message) values(j.id,j.event_sequence,j.stage,'STAGE_STARTED','The next processing stage has started.');end if;value:=jsonb_build_object('recorded',true);
 elsif operation_type='attempt' then
  select * into p from public.provider_attempts where dispatch_nonce=(op->>'nonce')::uuid;
  if found then
   if p.job_id<>j.id or p.request_hash<>op->>'requestHash' or p.operation_key<>op->>'operationKey' or p.provider<>op->>'provider' or p.model_id<>op->>'modelId' or p.voice_id is distinct from op->>'voiceId' then raise exception using errcode='P1602',message='Attempt identity conflict';end if;
   value:=jsonb_build_object('attemptId',p.id,'dispatchAuthorized',false,'status',p.status);
  else
   if j.provider_attempt_count>=23 or exists(select 1 from public.provider_attempts where job_id=j.id and operation_key=op->>'operationKey' and status in ('reserved','dispatched','outcome_unknown','succeeded')) then raise exception using errcode='P1603',message='Provider reconciliation required';end if;
   if op->>'provider' not in ('Gemini','Gemini TTS','ElevenLabs') or (op->>'provider'='ElevenLabs' and r.input_snapshot->'input'->>'intendedUse'<>'personal-learning') then raise exception using errcode='P1601',message='Provider ineligible';end if;
   insert into public.provider_attempts(job_id,run_id,operation_key,operation_attempt,dispatch_nonce,provider,model_id,voice_id,request_hash,status)
   select j.id,jr.id,op->>'operationKey',coalesce((select max(operation_attempt) from public.provider_attempts where job_id=j.id and operation_key=op->>'operationKey'),0)+1,(op->>'nonce')::uuid,op->>'provider',op->>'modelId',op->>'voiceId',op->>'requestHash','dispatched' from public.job_runs jr where jr.job_id=j.id and jr.lease_token=j.lease_token returning * into p;
   update public.jobs set provider_attempt_count=provider_attempt_count+1 where id=j.id;
   value:=jsonb_build_object('attemptId',p.id,'dispatchAuthorized',true,'status',p.status);
  end if;
 elsif operation_type='attempt_result' then
  select * into p from public.provider_attempts where id=(op->>'attemptId')::uuid and job_id=j.id for update;
  if not found or op->>'status' not in ('succeeded','failed','outcome_unknown','not_sent') then raise exception using errcode='P1601',message='Invalid attempt';end if;
  if p.status not in ('dispatched','reserved',op->>'status') then raise exception using errcode='P1602',message='Attempt already resolved';end if;
  update public.provider_attempts set status=op->>'status',finished_at=coalesce(finished_at,stamp) where id=p.id;
  value:=jsonb_build_object('attemptId',p.id,'status',op->>'status');
 elsif operation_type='repair' then
  if not exists(select 1 from public.job_repairs where job_id=j.id and repair_key=op->>'key') then
   if j.repair_count>=2 then raise exception using errcode='P1603',message='Repair budget exhausted';end if;
   insert into public.job_repairs(job_id,repair_key,stage,reason_code,lease_token) values(j.id,op->>'key',op->>'stage',op->>'reason',j.lease_token);
   update public.jobs set repair_count=repair_count+1 where id=j.id;
  end if;
  value:=jsonb_build_object('recorded',true);
 elsif operation_type='plan' then
  select id into plan_id from public.plan_versions where revision_id=r.id and dependency_hash=op->>'dependencyHash' and status='validated';
  if plan_id is null then
   if jsonb_array_length(op->'plan'->'scenes') not between 4 and 6 then raise exception using errcode='P1601',message='Invalid plan';end if;
   insert into public.plan_versions(project_id,owner_id,revision_id,version,dependency_hash,status,model_id,prompt_version,created_by_job_id)
   values(j.project_id,j.owner_id,r.id,coalesce((select max(version) from public.plan_versions where revision_id=r.id),0)+1,op->>'dependencyHash','candidate',op->>'modelId','web-education-v1',j.id) returning id into plan_id;
   idx:=0;
   for row_data in select * from jsonb_array_elements(op->'plan'->'scenes') loop
    insert into public.scenes(project_id,owner_id,revision_id,plan_id,ordinal,narration,visual,script_hash) values(j.project_id,j.owner_id,r.id,plan_id,idx,row_data->>'narration',row_data-'narration',encode(extensions.digest(convert_to(row_data->>'narration','UTF8'),'sha256'),'hex'));idx:=idx+1;
   end loop;
   update public.plan_versions set status='validated' where id=plan_id;
  end if;
  update public.revisions set selected_plan_id=plan_id where id=r.id;
  value:=jsonb_build_object('planId',plan_id);
 elsif operation_type='allocate' then
  select * into a from public.assets where creator_job_id=j.id and producing_lease_token=j.lease_token and client_artifact_key=op->>'key';
  if found then
   if a.declared_bytes<>(op->>'bytes')::bigint or a.checksum<>op->>'checksum' or a.kind<>op->>'kind' then raise exception using errcode='P1602',message='Artifact conflict';end if;
  else
   if (op->>'bytes')::bigint not between 1 and 52428800 or res.bytes_remaining<(op->>'bytes')::bigint then raise exception using errcode='P1603',message='Artifact capacity unavailable';end if;
   identity:=gen_random_uuid();
   insert into public.assets(id,project_id,owner_id,creator_job_id,producing_lease_token,client_artifact_key,kind,bucket,object_key,declared_bytes,checksum,declared_mime,expires_at)
   values(identity,j.project_id,j.owner_id,j.id,j.lease_token,op->>'key',op->>'kind','artifacts',j.owner_id||'/'||j.project_id||'/'||identity||'/artifact.'||case op->>'kind' when 'video' then 'mp4' when 'thumbnail' then 'png' when 'audio' then 'wav' when 'captions_srt' then 'srt' when 'captions_vtt' then 'vtt' else 'json' end,(op->>'bytes')::bigint,op->>'checksum',case op->>'kind' when 'video' then 'video/mp4' when 'thumbnail' then 'image/png' when 'audio' then 'audio/wav' when 'captions_srt' then 'text/plain' when 'captions_vtt' then 'text/vtt' else 'application/json' end,stamp+interval '7 days') returning * into a;
   -- Charge the full upload ceiling before granting a write permit. An expired
   -- signed upload can still land; only verified physical cleanup may free it.
   update public.usage_accounts set used_bytes=used_bytes+a.declared_bytes,reserved_bytes=reserved_bytes-a.declared_bytes,updated_at=stamp where scope='global' or owner_id=j.owner_id;
   update public.usage_reservations set bytes_remaining=bytes_remaining-a.declared_bytes,updated_at=stamp where id=res.id;
   insert into public.usage_ledger(operation_key,owner_id,asset_id,reservation_id,used_bytes_delta,reserved_bytes_delta,retained_outputs_delta,reserved_outputs_delta,reason) values('artifact:'||a.id,j.owner_id,a.id,res.id,a.declared_bytes,-a.declared_bytes,0,0,'worker upload ceiling');
  end if;
  value:=jsonb_build_object('assetId',a.id,'bucket',a.bucket,'objectKey',a.object_key,'mime',a.declared_mime,'bytes',a.declared_bytes::text,'checksum',a.checksum,'state',a.state);
 elsif operation_type in ('confirm','read','describe') then
  select * into a from public.assets where id=(op->>'assetId')::uuid and creator_job_id=j.id and owner_id=j.owner_id and deleted_at is null and expires_at>stamp for update;
  if not found then raise exception using errcode='P1601',message='Artifact unavailable';end if;
  if operation_type='confirm' then
   if a.producing_lease_token<>j.lease_token and a.state not in ('validated','available') then raise exception using errcode='P1503',message='Artifact fence lost';end if;
   if not exists(select 1 from storage.objects where bucket_id=a.bucket and name=a.object_key and (metadata->>'size')::bigint=a.declared_bytes) then raise exception using errcode='P1604',message='Artifact upload incomplete';end if;
   update public.assets set state='validated',byte_size=declared_bytes,detected_mime=declared_mime,received_at=coalesce(received_at,stamp),validated_at=coalesce(validated_at,stamp),provider_metadata=case when a.kind='report' then jsonb_build_object('verification',payload->'verifiedReport') else provider_metadata end where id=a.id returning * into a;
  elsif operation_type='read' and (a.state not in ('validated','available') or not exists(select 1 from public.checkpoint_assets ca join public.checkpoints c on c.id=ca.checkpoint_id where ca.asset_id=a.id and c.job_id=j.id and c.state='complete')) then raise exception using errcode='P1601',message='Artifact unavailable';end if;
  value:=jsonb_build_object('assetId',a.id,'bucket',a.bucket,'objectKey',a.object_key,'mime',a.declared_mime,'bytes',a.declared_bytes::text,'checksum',a.checksum,'kind',a.kind);
 elsif operation_type='checkpoint' then
  if exists(select 1 from jsonb_array_elements_text(op->'assetIds') q where not exists(select 1 from public.assets aa where aa.id=q.value::uuid and aa.creator_job_id=j.id and aa.owner_id=j.owner_id and aa.state in ('validated','available') and aa.deleted_at is null and aa.expires_at>stamp)) then raise exception using errcode='P1601',message='Invalid checkpoint reference';end if;
  select id into identity from public.checkpoints where job_id=j.id and stage=op->>'stage' and unit_key=op->>'key' and dependency_hash=op->>'dependencyHash';
  if identity is not null then
   if not exists(select 1 from public.checkpoints where id=identity and state='complete' and manifest=op->'manifest') then raise exception using errcode='P1602',message='Checkpoint conflict';end if;
  else
   insert into public.checkpoints(project_id,owner_id,revision_id,job_id,stage,unit_key,dependency_hash,producer_version,manifest,producing_lease_token) values(j.project_id,j.owner_id,r.id,j.id,op->>'stage',op->>'key',op->>'dependencyHash','web-education-v1',op->'manifest',j.lease_token) returning id into identity;
   for x in select q.value::uuid from jsonb_array_elements_text(op->'assetIds') q loop
    insert into public.checkpoint_assets(checkpoint_id,asset_id,job_id,revision_id,project_id,owner_id,role,dependency_hash) values(identity,x,j.id,r.id,j.project_id,j.owner_id,'stage',op->>'dependencyHash');
    insert into public.revision_assets(revision_id,asset_id,project_id,owner_id,purpose,retain_until) values(r.id,x,j.project_id,j.owner_id,'intermediate',stamp+interval '7 days') on conflict do nothing;
   end loop;
  end if;
  update public.jobs set stage=op->>'stage',event_sequence=event_sequence+1 where id=j.id returning * into j;
  insert into public.job_events(job_id,sequence,stage,code,safe_message) values(j.id,j.event_sequence,j.stage,'CHECKPOINT_SAVED','A validated processing checkpoint was saved.');
  value:=jsonb_build_object('checkpointId',identity);
 elsif operation_type='complete' then
  select provider_metadata->'verification' into verification from public.assets where id=(op->>'report')::uuid and creator_job_id=j.id and assets.kind='report' and state='validated';
  if verification is null or verification->>'fullDecode'<>'true' or verification->>'audio'<>'true' or verification->>'orientation'<>r.orientation or (verification->>'durationMs')::integer not between r.target_seconds*1000 and least(90000,(r.target_seconds+3)*1000) or r.selected_plan_id is null then raise exception using errcode='P1601',message='Output verification required';end if;
  if not coalesce((verification->>'fps')::integer=30 and (verification->>'width')::integer=case when r.orientation='landscape' then 1280 else 720 end and (verification->>'height')::integer=case when r.orientation='landscape' then 720 else 1280 end and (verification->>'captionCount')::integer>0 and (verification->>'mouthCueCount')::integer>0 and (verification->>'sceneCount')::integer=(select count(*) from public.scenes ss where ss.plan_id=r.selected_plan_id),false) then raise exception using errcode='P1601',message='Invalid verification evidence';end if;
  select count(*) into count_assets from public.assets aa where aa.creator_job_id=j.id and aa.state='validated' and aa.deleted_at is null and aa.expires_at>stamp and exists(select 1 from storage.objects so where so.bucket_id=aa.bucket and so.name=aa.object_key and (so.metadata->>'size')::bigint=aa.declared_bytes) and ((aa.id=(op->>'video')::uuid and aa.kind='video') or (aa.id=(op->>'thumbnail')::uuid and aa.kind='thumbnail') or (aa.id=(op->>'srt')::uuid and aa.kind='captions_srt') or (aa.id=(op->>'vtt')::uuid and aa.kind='captions_vtt') or (aa.id=(op->>'report')::uuid and aa.kind='report'));
  if count_assets<>5 or exists(select 1 from public.provider_attempts where job_id=j.id and status in ('dispatched','reserved')) then raise exception using errcode='P1601',message='Complete output set required';end if;
  update public.revisions set status='ready',completed_at=stamp,expires_at=stamp+interval '7 days' where id=r.id;
  for x in select (op->>k)::uuid from unnest(array['video','thumbnail','srt','vtt','report']) k loop
   update public.assets set state='available',published_at=stamp,expires_at=stamp+interval '7 days' where id=x;
   insert into public.revision_assets(revision_id,asset_id,project_id,owner_id,purpose,retain_until) values(r.id,x,j.project_id,j.owner_id,'published',stamp+interval '7 days');
  end loop;
  insert into public.exports(project_id,owner_id,revision_id,variant,state,job_id,video_asset_id,thumbnail_asset_id,srt_asset_id,vtt_asset_id,verification_asset_id,ready_at,expires_at) values(j.project_id,j.owner_id,r.id,'clean','ready',j.id,(op->>'video')::uuid,(op->>'thumbnail')::uuid,(op->>'srt')::uuid,(op->>'vtt')::uuid,(op->>'report')::uuid,stamp,stamp+interval '7 days');
  update public.projects set latest_ready_revision_id=r.id where id=j.project_id;
  update public.usage_accounts set reserved_bytes=reserved_bytes-res.bytes_remaining,reserved_outputs=reserved_outputs-1,retained_outputs=retained_outputs+1,updated_at=stamp where scope='global' or owner_id=j.owner_id;
  insert into public.usage_ledger(operation_key,owner_id,reservation_id,used_bytes_delta,reserved_bytes_delta,retained_outputs_delta,reserved_outputs_delta,reason) values('complete:'||j.id,j.owner_id,res.id,0,-res.bytes_remaining,1,-1,'verified clean result');
  update public.usage_reservations set bytes_remaining=0,output_slots_remaining=0,state='committed',updated_at=stamp where id=res.id;
  update public.job_runs set outcome='succeeded',ended_at=stamp where job_id=j.id and lease_token=j.lease_token;
  update public.jobs set status='succeeded',stage='render',finished_at=stamp,worker_id=null,worker_instance_id=null,lease_expires_at=null,last_heartbeat_at=null,event_sequence=event_sequence+1 where id=j.id returning * into j;
  update public.worker_slots set job_id=null,worker_id=null,worker_instance_id=null,lease_token=null,lease_expires_at=null where job_id=j.id;
  insert into public.job_events(job_id,sequence,stage,code,safe_message) values(j.id,j.event_sequence,'render','RESULT_VERIFIED','Your video passed automated output verification.');
  value:=jsonb_build_object('jobId',j.id,'revisionId',r.id,'status','succeeded');
  insert into public.job_terminal_operations(job_id,operation_key,kind,request_hash,safe_result) values(j.id,op->>'key','complete',request_hash,value);
  hb:=jsonb_set(hb,'{leaseExpiresAt}','null');
 elsif operation_type='fail' then
  perform private.finish_worker_lease(j.id,case when op->>'code'='INPUT_INVALID' then 'needs_input' else 'failed' end,op->>'code');
  update public.job_runs set outcome='failed' where job_id=j.id and lease_token=j.lease_token;
  value:=jsonb_build_object('recorded',true);hb:=jsonb_set(hb,'{leaseExpiresAt}','null');
 else raise exception using errcode='P1601',message='Unknown execution operation';end if;
 return jsonb_build_object('serverTime',hb->'serverTime','leaseExpiresAt',hb->'leaseExpiresAt','value',value);
end $$;
revoke all on function public.worker_execute(text,integer,jsonb) from public,anon,authenticated;
grant execute on function public.worker_execute(text,integer,jsonb) to service_role;
commit;
