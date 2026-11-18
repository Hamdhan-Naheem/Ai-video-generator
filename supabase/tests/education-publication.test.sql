begin;
-- These baseline assertions are transaction-local, even after Education is enabled.
update public.app_settings set generation_paused=true,claims_paused=true where id='global';
update public.app_settings set limits=limits||'{"enabledGenerationModes":["education"]}' where id='global';
set local search_path=public,extensions,pg_temp;
select no_plan();
select ok(not has_function_privilege('anon','public.worker_control(text,integer,text,jsonb)','execute'),'Anonymous worker RPC denied');
select ok(not has_function_privilege('authenticated','public.worker_control(text,integer,text,jsonb)','execute'),'User JWT cannot call worker RPC');
select ok(has_function_privilege('service_role','public.worker_control(text,integer,text,jsonb)','execute'),'Only server authority exposes worker control');
insert into public.workers(id,label,enabled,protocol_version,capabilities) select ('a1500000-0000-4000-8000-00000000000'||n)::uuid,'Worker fixture',true,1,'{"modes":["education"],"orientations":["landscape","portrait"],"schemaVersions":[1],"compositionVersion":"v1"}' from generate_series(1,2)n;
insert into public.worker_credentials(worker_id,token_hash,expires_at) select ('a1500000-0000-4000-8000-00000000000'||n)::uuid,repeat(case when n=1 then 'a' else 'b' end,64),now()+interval '1 hour' from generate_series(1,2)n;
create temporary table wfixture(claim jsonb,heartbeat jsonb,assignment jsonb,second jsonb);
insert into wfixture values('{"instanceId":"a1500000-0000-4000-8000-000000000011","capabilities":{"modes":["education"],"orientations":["landscape","portrait"],"schemaVersions":[1],"compositionVersion":"v1"}}','{"instanceId":"a1500000-0000-4000-8000-000000000011","health":{"freeDiskBytes":"4000000000","freeMemoryBytes":"2000000000","toolVersions":{"node":"24.22.1"}}}',null,null);
select throws_ok($$select public.worker_control(repeat('c',64),1,'claim',(select claim from wfixture))$$,'P1501',null::text,'Unknown credential denied');
select throws_ok($$select public.worker_control(repeat('a',64),2,'claim',(select claim from wfixture))$$,'P1502',null::text,'Protocol mismatch denied');
select throws_ok($$select public.worker_control(repeat('a',64),1,'claim',jsonb_set((select claim from wfixture),'{capabilities,modes}','["software"]'))$$,'P1504',null::text,'Worker cannot upgrade registered modes');
update public.workers set enabled=false where id='a1500000-0000-4000-8000-000000000001';
select throws_ok($$select public.worker_control(repeat('a',64),1,'claim',(select claim from wfixture))$$,'P1501',null::text,'Disabled worker denied');
update public.workers set enabled=true where id='a1500000-0000-4000-8000-000000000001';
update public.worker_credentials set expires_at=now()-interval '1 second',created_at=now()-interval '1 hour' where token_hash=repeat('a',64);
select throws_ok($$select public.worker_control(repeat('a',64),1,'claim',(select claim from wfixture))$$,'P1501',null::text,'Expired credential denied');
update public.worker_credentials set expires_at=now()+interval '1 hour' where token_hash=repeat('a',64);
select is(public.worker_control(repeat('a',64),1,'heartbeat',(select heartbeat from wfixture))->>'claimsPaused','true','Idle heartbeat reflects current pause');
select ok((select last_seen_at is not null from public.workers where id='a1500000-0000-4000-8000-000000000001'),'Heartbeat records real liveness');
select is(public.worker_control(repeat('a',64),1,'claim',(select claim from wfixture))->>'idle','true','Paused claims return no private work');
insert into auth.users(id,email) values('a1500000-0000-4000-8000-000000000021','worker-sql@example.invalid');
insert into public.usage_accounts(scope,owner_id,byte_limit,output_limit) values('user','a1500000-0000-4000-8000-000000000021',400000000,3);
insert into public.projects(id,owner_id,title,mode,draft_input) values('a1500000-0000-4000-8000-000000000022','a1500000-0000-4000-8000-000000000021','Worker assignment','education','{"topic":"Turbines","audience":"beginner","intendedUse":"personal-learning","sources":[]}');
select set_config('request.jwt.claims','{"sub":"a1500000-0000-4000-8000-000000000021","role":"authenticated"}',true);
update public.app_settings set generation_paused=false,claims_paused=false;
select lives_ok($$select public.enqueue_generation('a1500000-0000-4000-8000-000000000022','worker-fixture','{"draftVersion":1,"preferences":{"targetSeconds":60,"orientation":"landscape","voiceProfileId":"Kore"},"acknowledgments":{"sourceRights":true,"externalAiProcessing":true,"policyVersion":"v1"}}')$$,'Fixture uses real durable enqueue');
update wfixture set assignment=public.worker_control(repeat('a',64),1,'claim',claim);
select is((select assignment->>'leaseToken' from wfixture),'1','First claim gets fence one');
select is((select status from public.jobs where id=(select (assignment->>'jobId')::uuid from wfixture)),'running','Claim transitions job to running');
select is((select worker_instance_id::text from public.worker_slots where slot_name='processing'),'a1500000-0000-4000-8000-000000000011','Slot binds the actual worker process');
select is((select public.worker_control(repeat('a',64),1,'claim',claim)->>'leaseToken' from wfixture),'1','Lost response recovery returns same fence');
select is((select count(*)::integer from public.job_runs where job_id=(select (assignment->>'jobId')::uuid from wfixture)),1,'Claim recovery creates no second run');
select is((select public.worker_control(repeat('a',64),1,'claim',jsonb_set(claim,'{instanceId}','"a1500000-0000-4000-8000-000000000012"'))->>'idle' from wfixture),'true','Second process cannot recover another instance lease');
select is((select public.worker_control(repeat('b',64),1,'claim',jsonb_set(claim,'{instanceId}','"a1500000-0000-4000-8000-000000000012"'))->>'idle' from wfixture),'true','Second worker cannot occupy global slot');
select throws_ok($$select public.worker_control(repeat('a',64),1,'heartbeat',jsonb_set((select heartbeat from wfixture),'{assignment}','{"jobId":"a1500000-0000-4000-8000-000000000099","leaseToken":"1"}'))$$,'P1503',null::text,'Worker cannot heartbeat an unrelated job');
update wfixture set heartbeat=heartbeat||jsonb_build_object('assignment',jsonb_build_object('jobId',assignment->>'jobId','leaseToken',assignment->>'leaseToken'));
select pg_sleep(0.02);
select lives_ok($$select public.worker_control(repeat('a',64),1,'heartbeat',(select heartbeat from wfixture))$$,'Matching current lease renews');
select ok((select active_ms>0 from public.jobs where id=(select (assignment->>'jobId')::uuid from wfixture)),'Elapsed time is server measured');

-- Synthetic SQL metadata only. Actual bytes/decode are checked separately by
-- check-education-flow; this transaction rolls back every fixture row.
create function pg_temp.publish_op(op jsonb) returns jsonb language sql as $test$
select public.worker_execute(repeat('a',64),1,jsonb_build_object('instanceId',claim->>'instanceId','health',heartbeat->'health','jobId',assignment->>'jobId','leaseToken',assignment->>'leaseToken','operation',op,'verifiedReport','{"version":1,"orientation":"landscape","durationMs":60000,"width":1280,"height":720,"fps":30,"fullDecode":true,"audio":true,"sceneCount":4,"captionCount":1,"mouthCueCount":1,"coverage":1,"provider":"gemini","voice":"Kore"}'::jsonb)) from wfixture;
$test$;
select lives_ok($test$select pg_temp.publish_op(jsonb_build_object('type','plan','dependencyHash',repeat('d',64),'modelId','synthetic-sql-fixture','plan',jsonb_build_object('scenes',(select jsonb_agg(jsonb_build_object('id','scene-'||n,'narration','Fixture narration','title','Fixture','layout',case when n=1 then 'intro' when n=4 then 'recap' else 'explain' end,'keyPoints',jsonb_build_array('Fixture'),'diagramNodes',jsonb_build_array('Input','Output'),'teacherGesture','explain')) from generate_series(1,4)n))))$test$,'Synthetic validated plan may be saved');
create temporary table incomplete_upload as select pg_temp.publish_op(jsonb_build_object('type','allocate','key','interrupted-audio','kind','audio','bytes',1,'checksum',repeat('e',64)))->'value' descriptor;
select throws_ok($test$select pg_temp.publish_op(jsonb_build_object('type','confirm','assetId',(select descriptor->>'assetId' from incomplete_upload)))$test$,'P1605','Artifact upload incomplete','Missing Storage bytes use the upload error, not provider daily limit');
insert into storage.objects(bucket_id,name,metadata) select descriptor->>'bucket',descriptor->>'objectKey','{"size":2}'::jsonb from incomplete_upload;
select throws_ok($test$select pg_temp.publish_op(jsonb_build_object('type','confirm','assetId',(select descriptor->>'assetId' from incomplete_upload)))$test$,'P1605','Artifact upload incomplete','Wrong-size Storage bytes remain a recoverable upload failure');
create temporary table publication_assets(kind text,asset_id uuid);
do $test$
declare k text;allocated jsonb;receipt jsonb;
begin
 foreach k in array array['video','thumbnail','captions_srt','captions_vtt','report'] loop
  allocated:=pg_temp.publish_op(jsonb_build_object('type','allocate','key',k,'kind',k,'bytes',1,'checksum',repeat('a',64)))->'value';
  insert into storage.objects(bucket_id,name,metadata) values('artifacts',allocated->>'objectKey','{"size":1}');
  receipt:=pg_temp.publish_op(jsonb_build_object('type','confirm','assetId',allocated->>'assetId'));
  insert into publication_assets values(k,(allocated->>'assetId')::uuid);
 end loop;
end $test$;
create temporary table completion(op jsonb);
insert into completion select jsonb_build_object('type','complete','key','publish','video',(select asset_id from publication_assets where kind='video'),'thumbnail',(select asset_id from publication_assets where kind='thumbnail'),'srt',(select asset_id from publication_assets where kind='captions_srt'),'vtt',(select asset_id from publication_assets where kind='captions_vtt'),'report',(select asset_id from publication_assets where kind='report'));
-- Lost primary TTS response followed by a successful fallback: all output
-- artifacts exist, but this job must remain unpublished pending review.
create temporary table uncertain_attempt(id uuid);
insert into uncertain_attempt select (pg_temp.publish_op(jsonb_build_object('type','attempt','operationKey','tts-primary','nonce',gen_random_uuid(),'provider','Gemini TTS','modelId','fixture-tts','voiceId','Kore','requestHash',repeat('b',64)))->'value'->>'attemptId')::uuid;
select pg_temp.publish_op(jsonb_build_object('type','attempt_result','attemptId',id,'status','outcome_unknown')) from uncertain_attempt;
create temporary table fallback_attempt(id uuid);
insert into fallback_attempt select (pg_temp.publish_op(jsonb_build_object('type','attempt','operationKey','tts-fallback','nonce',gen_random_uuid(),'provider','ElevenLabs','modelId','fixture-fallback','voiceId','fixture','requestHash',repeat('c',64)))->'value'->>'attemptId')::uuid;
select pg_temp.publish_op(jsonb_build_object('type','attempt_result','attemptId',id,'status','succeeded')) from fallback_attempt;
select throws_ok($test$select pg_temp.publish_op((select op from completion))$test$,'P1603','Provider reconciliation required','Successful fallback cannot publish with an unknown primary outcome');
select is((select status from public.jobs where id=(select (assignment->>'jobId')::uuid from wfixture)),'running','Rejected completion preserves the running job');
select ok(not exists(select 1 from public.exports where project_id='a1500000-0000-4000-8000-000000000022'),'No Ready export is created before review');
select ok((select latest_ready_revision_id is null from public.projects where id='a1500000-0000-4000-8000-000000000022'),'Rejected publication does not expose a latest result');
select is((select retained_outputs from public.usage_accounts where owner_id='a1500000-0000-4000-8000-000000000021'),0,'Blocked publication does not charge a retained output');
select is((select private.generation_recovery_reason(jsonb_populate_record(j,'{"status":"failed","safe_error_code":"PROVIDER_UNAVAILABLE"}'::jsonb)) from public.jobs j where id=(select (assignment->>'jobId')::uuid from wfixture)),'operator_required','Unknown provider outcome requires operator review');
-- Simulate an explicit definitive reconciliation in this rollback-only fixture.
-- Application/worker code cannot resolve unknown outcomes or reset the budget.
update public.provider_attempts set status='failed' where id=(select id from uncertain_attempt);
select lives_ok($test$select pg_temp.publish_op((select op from completion))$test$,'Complete publishes only a fully scoped verified artifact set');
select lives_ok($test$set constraints all immediate$test$,'Publication satisfies deferred ready/export/latest-result constraints');
select is((select status from public.jobs where id=(select (assignment->>'jobId')::uuid from wfixture)),'succeeded','Verified fixture job is terminal');
select throws_ok($test$select public.cancel_generation((select (assignment->>'jobId')::uuid from wfixture))$test$,'P1901',null::text,'Completion winning serialization cannot be overwritten by late cancellation');
select lives_ok($test$select pg_temp.publish_op((select op from completion))$test$,'Completion replay succeeds after clearing the lease');
select is((select retained_outputs from public.usage_accounts where owner_id='a1500000-0000-4000-8000-000000000021'),1,'Exact replay retains one output charge');
select lives_ok($test$select public.describe_education_result('a1500000-0000-4000-8000-000000000021','a1500000-0000-4000-8000-000000000022','video')$test$,'Active owner obtains exact verified media descriptor');
select throws_ok($test$select public.describe_education_result('a1500000-0000-4000-8000-000000000099','a1500000-0000-4000-8000-000000000022','video')$test$,'42501',null::text,'Foreign account cannot obtain a media descriptor');
select * from finish();rollback;
