begin;
set local search_path=public,extensions,pg_temp;
select no_plan();
update public.app_settings set generation_paused=false,claims_paused=true,limits=limits||'{"educationExecutionVerified":true,"enabledGenerationModes":["education"],"globalByteLimitConfigured":true}';
update public.usage_accounts set byte_limit=1000000000 where scope='global';
insert into auth.users(id,email,raw_user_meta_data) values('c1800000-0000-4000-8000-000000000001','w18-sql@example.invalid','{"display_name":"Recovery fixture"}'),('c1800000-0000-4000-8000-000000000002','w18-other@example.invalid','{"display_name":"Other"}');
insert into public.usage_accounts(scope,owner_id,byte_limit,output_limit) values('user','c1800000-0000-4000-8000-000000000001',400000000,3);
insert into public.projects(id,owner_id,title,mode,draft_input,preferences) values('c1810000-0000-4000-8000-000000000001','c1800000-0000-4000-8000-000000000001','Water turbines','education','{"mode":"education","topic":"How turbines work","audience":"beginner","intendedUse":"personal-learning","sources":[]}','{"targetSeconds":60,"orientation":"landscape","voiceProfileId":"Kore"}');
select set_config('request.jwt.claims','{"sub":"c1800000-0000-4000-8000-000000000001","role":"authenticated"}',true);
create temporary table recovery_fixture(job uuid,revision uuid,original_hash text);
insert into recovery_fixture(job,revision) select (x->>'jobId')::uuid,(x->>'revisionId')::uuid from(select public.enqueue_generation('c1810000-0000-4000-8000-000000000001','initial','{"draftVersion":1,"preferences":{"targetSeconds":60,"orientation":"landscape","voiceProfileId":"Kore"},"acknowledgments":{"sourceRights":true,"externalAiProcessing":true,"policyVersion":"v1"}}')x)t;
update recovery_fixture set original_hash=(select input_hash from public.revisions where id=revision);
create function pg_temp.fail_fixture() returns void language plpgsql as $$
declare res public.usage_reservations;
begin
 select * into res from public.usage_reservations where job_id=(select job from recovery_fixture);
 if res.state='reserved' then
 update public.usage_accounts set reserved_bytes=reserved_bytes-res.bytes_remaining,reserved_outputs=reserved_outputs-res.output_slots_remaining where scope='global' or owner_id='c1800000-0000-4000-8000-000000000001';
 update public.usage_reservations set state='released',bytes_remaining=0,output_slots_remaining=0 where id=res.id;
 end if;
 update public.jobs set status='failed',safe_error_code='MEDIA_PROCESSING_FAILED',finished_at=now(),provider_attempt_count=4,repair_count=1,active_ms=12000,attempt_count=1 where id=(select job from recovery_fixture);
 update public.revisions set status='failed' where id=(select revision from recovery_fixture);
end $$;
select pg_temp.fail_fixture();
select ok(not has_function_privilege('anon','public.retry_generation(uuid,text)','execute'),'Anon retry denied');
select ok(not has_function_privilege('authenticated','private.generation_recovery_reason(public.jobs)','execute'),'Internal eligibility stays private');
select is(public.get_generation_recovery((select job from recovery_fixture))->>'reason','retry','Recoverable media failure eligible');

insert into private.provider_daily_usage values((clock_timestamp() at time zone 'UTC')::date,'c1800000-0000-4000-8000-000000000001',12);
select is(public.get_generation_recovery((select job from recovery_fixture))->>'reason','retry','Cached media recovery remains eligible at daily AI cap');
update public.jobs set safe_error_code='STORAGE_UNAVAILABLE' where id=(select job from recovery_fixture);
select is(public.get_generation_recovery((select job from recovery_fixture))->>'reason','retry','Incomplete-upload Storage recovery remains eligible at the daily AI cap');
update public.jobs set safe_error_code='PROVIDER_UNAVAILABLE' where id=(select job from recovery_fixture);
select is(public.get_generation_recovery((select job from recovery_fixture))->>'reason','daily_limit','Provider-stage recovery explains the daily wait');
select throws_ok($$select public.retry_generation((select job from recovery_fixture),'daily-blocked')$$,'P1801',null::text,'Daily provider wait does not enqueue another provider retry');
update private.provider_daily_usage set day=day-1 where scope_key='c1800000-0000-4000-8000-000000000001';
select is(public.get_generation_recovery((select job from recovery_fixture))->>'reason','retry','Provider recovery becomes eligible in the next UTC window');
select is((select provider_attempt_count from public.jobs where id=(select job from recovery_fixture)),4,'Reading recovery never resets per-job attempts');
delete from private.provider_daily_usage where scope_key='c1800000-0000-4000-8000-000000000001';
update public.jobs set safe_error_code='MEDIA_PROCESSING_FAILED' where id=(select job from recovery_fixture);

select set_config('request.jwt.claims','{"sub":"c1800000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.get_generation_recovery((select job from recovery_fixture))$$,'42501',null::text,'Foreign recovery hidden');
select throws_ok($$select public.retry_generation((select job from recovery_fixture),'foreign')$$,'42501',null::text,'Foreign retry denied');
select set_config('request.jwt.claims','{"sub":"c1800000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.retry_generation((select job from recovery_fixture),'bad key')$$,'22023',null::text,'Invalid idempotency rejected');
update public.jobs set status='needs_input' where id=(select job from recovery_fixture);
select is(public.get_generation_recovery((select job from recovery_fixture))->>'reason','edit_input','Needs input is editing, never same-job retry');
select throws_ok($$select public.retry_generation((select job from recovery_fixture),'input')$$,'P1801',null::text,'Needs input cannot retry unchanged');
update public.jobs set status='failed',safe_error_code='PIPELINE_FAILED' where id=(select job from recovery_fixture);
select is(public.get_generation_recovery((select job from recovery_fixture))->>'reason','operator_required','Unknown failures do not authorize provider bypass');
update public.jobs set safe_error_code='PROVIDER_OUTCOME_UNKNOWN' where id=(select job from recovery_fixture);
select is(public.get_generation_recovery((select job from recovery_fixture))->>'reason','operator_required','Unknown provider outcomes require review');
update public.jobs set safe_error_code='PROVIDER_UNAVAILABLE',provider_attempt_count=23 where id=(select job from recovery_fixture);
select throws_ok($$select public.retry_generation((select job from recovery_fixture),'budget')$$,'P1802',null::text,'Dispatch ceiling cannot reset');
update public.jobs set provider_attempt_count=4,repair_count=2 where id=(select job from recovery_fixture);
select is(public.get_generation_recovery((select job from recovery_fixture))->>'reason','budget_exhausted','Repair cap cannot reset');
update public.jobs set repair_count=1,active_ms=1800000 where id=(select job from recovery_fixture);
select is(public.get_generation_recovery((select job from recovery_fixture))->>'reason','budget_exhausted','Active time cannot reset');
update public.jobs set active_ms=12000,attempt_count=10 where id=(select job from recovery_fixture);
select is(public.get_generation_recovery((select job from recovery_fixture))->>'reason','budget_exhausted','Worker attempt cap retained');
update public.jobs set attempt_count=1,finished_at=now()-interval '49 hours' where id=(select job from recovery_fixture);
select throws_ok($$select public.retry_generation((select job from recovery_fixture),'expired')$$,'P1407',null::text,'Failed retention window enforced');
update public.jobs set finished_at=now() where id=(select job from recovery_fixture);
update public.usage_reservations set expires_at=now()-interval '1 second' where job_id=(select job from recovery_fixture);
select is(public.get_generation_recovery((select job from recovery_fixture))->>'reason','inputs_expired','Original reservation expiry not extended');
update public.usage_reservations set expires_at=now()+interval '7 days' where job_id=(select job from recovery_fixture);
update public.app_settings set generation_paused=true;
select throws_ok($$select public.retry_generation((select job from recovery_fixture),'pause')$$,'P1402',null::text,'Operator pause enforced');
update public.app_settings set generation_paused=false;
update public.usage_accounts set byte_limit=1 where owner_id='c1800000-0000-4000-8000-000000000001';
select throws_ok($$select public.retry_generation((select job from recovery_fixture),'capacity')$$,'P1403',null::text,'Capacity must be reacquired');
update public.usage_accounts set byte_limit=400000000,output_limit=0 where owner_id='c1800000-0000-4000-8000-000000000001';
select throws_ok($$select public.retry_generation((select job from recovery_fixture),'slots')$$,'P1404',null::text,'Output slots must be reacquired');
update public.usage_accounts set output_limit=3 where owner_id='c1800000-0000-4000-8000-000000000001';
update public.projects set title='Edited for a future request' where id='c1810000-0000-4000-8000-000000000001';
select is(public.retry_generation((select job from recovery_fixture),'retry-one')->>'reused','false','Explicit retry admitted once');
select is(public.retry_generation((select job from recovery_fixture),'retry-one')->>'reused','true','Lost-response receipt recovered');
select is(public.retry_generation((select job from recovery_fixture),'retry-one')->>'jobId',(select job::text from recovery_fixture),'Same job identity');
select throws_ok($$select public.retry_generation((select job from recovery_fixture),'different-key')$$,'P1801',null::text,'Different key cannot double reserve active job');
select is((select provider_attempt_count from public.jobs where id=(select job from recovery_fixture)),4,'Provider calls retained');
select is((select repair_count from public.jobs where id=(select job from recovery_fixture)),1,'Repair count retained');
select is((select active_ms from public.jobs where id=(select job from recovery_fixture)),12000::bigint,'Active clock retained');
select is((select input_hash from public.revisions where id=(select revision from recovery_fixture)),(select original_hash from recovery_fixture),'Frozen input unaffected by edits');
select is((select count(*)::integer from public.usage_ledger where owner_id='c1800000-0000-4000-8000-000000000001' and operation_key like 'retry:%'),1,'One recovery ledger operation');
select is((select reserved_outputs from public.usage_accounts where owner_id='c1800000-0000-4000-8000-000000000001'),1,'One reserved output');
select pg_temp.fail_fixture();
select is(public.retry_generation((select job from recovery_fixture),'retry-one')->>'reused','true','Old receipt cannot requeue a later failure');
select is((select status from public.jobs where id=(select job from recovery_fixture)),'failed','Replay is read-only even after later failure');
select is(public.retry_generation((select job from recovery_fixture),'retry-two')->>'reused','false','Deliberate new retry after later failure');
select is((select count(*)::integer from public.revisions where owner_id='c1800000-0000-4000-8000-000000000001'),1,'Retry creates no extra revision');
-- Append before the final authenticated deferred-check assertions.
select pg_temp.fail_fixture();
-- Existing allocated bytes remain charged and reduce the SAME job's ceiling.
insert into public.workers(id,label,enabled,protocol_version) values('c1840000-0000-4000-8000-000000000001','SQL recovery fixture',false,1);
insert into public.job_runs(job_id,attempt_number,worker_id,lease_token,started_at,ended_at,outcome) select job,1,'c1840000-0000-4000-8000-000000000001',1,now(),now(),'failed' from recovery_fixture;
insert into public.assets(id,project_id,owner_id,creator_job_id,producing_lease_token,client_artifact_key,kind,bucket,object_key,state,declared_mime,declared_bytes,byte_size,checksum,received_at,validated_at,detected_mime,expires_at)
select 'c1820000-0000-4000-8000-000000000001','c1810000-0000-4000-8000-000000000001','c1800000-0000-4000-8000-000000000001',job,1,'saved-audio','audio','artifacts','c1800000-0000-4000-8000-000000000001/c1810000-0000-4000-8000-000000000001/c1820000-0000-4000-8000-000000000001/artifact.wav','validated','audio/wav',1000,1000,repeat('c',64),now(),now(),'audio/wav',now()+interval '1 day' from recovery_fixture;

insert into public.checkpoints(id,project_id,owner_id,revision_id,job_id,stage,unit_key,dependency_hash,producer_version,manifest,producing_lease_token)
select 'c1830000-0000-4000-8000-000000000001','c1810000-0000-4000-8000-000000000001','c1800000-0000-4000-8000-000000000001',revision,job,'voice','saved-scene',repeat('d',64),'web-education-v1','{"saved":true}',1 from recovery_fixture;
insert into public.checkpoint_assets(checkpoint_id,asset_id,job_id,revision_id,project_id,owner_id,role,dependency_hash)
select 'c1830000-0000-4000-8000-000000000001','c1820000-0000-4000-8000-000000000001',job,revision,'c1810000-0000-4000-8000-000000000001','c1800000-0000-4000-8000-000000000001','stage',repeat('d',64) from recovery_fixture;
select is(public.get_generation_recovery((select job from recovery_fixture))->>'reason','inputs_expired','Missing checkpoint bytes block retry before provider work');
insert into storage.objects(bucket_id,name,metadata) values('artifacts','c1800000-0000-4000-8000-000000000001/c1810000-0000-4000-8000-000000000001/c1820000-0000-4000-8000-000000000001/artifact.wav','{"size":1000}');
select is(public.get_generation_recovery((select job from recovery_fixture))->>'reason','retry','Retained complete checkpoint can resume');
update public.assets set expires_at=now()-interval '1 second' where id='c1820000-0000-4000-8000-000000000001';
select throws_ok($$select public.retry_generation((select job from recovery_fixture),'expired-checkpoint')$$,'P1407',null::text,'Expired checkpoint media cannot be silently regenerated');
update public.assets set expires_at=now()+interval '1 day' where id='c1820000-0000-4000-8000-000000000001';
select is(public.retry_generation((select job from recovery_fixture),'with-checkpoint')->>'reused','false','Recovery reuses checkpoint identity');
select is((select bytes_remaining from public.usage_reservations where job_id=(select job from recovery_fixture)),167771160::bigint,'Prior allocations subtract from unchanged job byte ceiling');
select is((select manifest from public.checkpoints where id='c1830000-0000-4000-8000-000000000001'),'{"saved":true}'::jsonb,'Recovery never rewrites validated checkpoint');
select pg_temp.fail_fixture();
update public.jobs set status='needs_input',safe_error_code='INPUT_INVALID' where id=(select job from recovery_fixture);
select lives_ok($$select public.enqueue_generation('c1810000-0000-4000-8000-000000000001','corrected-input','{"draftVersion":2,"preferences":{"targetSeconds":60,"orientation":"landscape","voiceProfileId":"Kore"},"acknowledgments":{"sourceRights":true,"externalAiProcessing":true,"policyVersion":"v1"}}')$$,'Corrected draft starts a separate immutable revision');
select is((select count(*)::integer from public.revisions where owner_id='c1800000-0000-4000-8000-000000000001'),2,'New input request creates its own revision');
select is((public.get_education_run('c1810000-0000-4000-8000-000000000001')->>'revisionId')::uuid,(select id from public.revisions where owner_id='c1800000-0000-4000-8000-000000000001' order by revision_number desc limit 1),'Progress chooses latest revision even with equal creation timestamps');
update public.jobs set status='failed',safe_error_code='MEDIA_PROCESSING_FAILED' where id=(select job from recovery_fixture);
select throws_ok($$select public.retry_generation((select job from recovery_fixture),'old-revision')$$,'P1801',null::text,'Old failed request cannot supersede newer request');

-- Exercise the real authenticated-role deferred trigger boundary, not only postgres.
grant select on recovery_fixture to authenticated;
set local role authenticated;
select lives_ok($check$set constraints all immediate$check$,'User RPC revision writes pass deferred checks without direct table grants');
reset role;
select ok(not has_table_privilege('authenticated','public.revisions','SELECT'),'Revision table remains inaccessible directly');
select * from finish();rollback;
