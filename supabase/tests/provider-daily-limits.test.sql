begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions,pg_temp;
select no_plan();
-- Counters are transaction-local fixtures; real user history is untouched.
delete from private.provider_daily_usage;
select ok(not has_table_privilege('authenticated','private.provider_daily_usage','UPDATE'),'Browser cannot reset provider counters');
select ok(not has_function_privilege('authenticated','private.provider_daily_available(uuid)','EXECUTE'),'Browser cannot probe other users budgets');
insert into auth.users(id,email) values('b1240000-0000-4000-8000-000000000001','daily-one@example.invalid'),('b1240000-0000-4000-8000-000000000002','daily-two@example.invalid');
insert into public.projects(id,owner_id,title,mode) select ('b1240000-0000-4000-8000-00000000001'||n)::uuid,('b1240000-0000-4000-8000-00000000000'||n)::uuid,'Daily limit fixture','education' from generate_series(1,2)n;
insert into public.revisions(id,project_id,owner_id,revision_number,input_hash,request_kind,target_seconds,orientation,voice_profile_id,schema_version,prompt_version,composition_version)
select ('b1240000-0000-4000-8000-00000000002'||n)::uuid,('b1240000-0000-4000-8000-00000000001'||n)::uuid,('b1240000-0000-4000-8000-00000000000'||n)::uuid,1,repeat('a',64),'initial',60,'landscape','Kore',1,'v1','v1' from generate_series(1,2)n;
insert into public.jobs(id,project_id,owner_id,revision_id,kind,status) select ('b1240000-0000-4000-8000-00000000003'||n)::uuid,('b1240000-0000-4000-8000-00000000001'||n)::uuid,('b1240000-0000-4000-8000-00000000000'||n)::uuid,('b1240000-0000-4000-8000-00000000002'||n)::uuid,'generation','failed' from generate_series(1,2)n;
insert into public.workers(id,label,protocol_version) values('b1240000-0000-4000-8000-000000000040','Daily fixture',1);
insert into public.job_runs(id,job_id,attempt_number,worker_id,lease_token) select ('b1240000-0000-4000-8000-00000000005'||n)::uuid,('b1240000-0000-4000-8000-00000000003'||n)::uuid,1,'b1240000-0000-4000-8000-000000000040',1 from generate_series(1,2)n;
create function pg_temp.dispatch(n integer) returns void language sql as $$
 insert into public.provider_attempts(job_id,run_id,operation_key,operation_attempt,dispatch_nonce,provider,model_id,request_hash,status)
 values(('b1240000-0000-4000-8000-00000000003'||n)::uuid,('b1240000-0000-4000-8000-00000000005'||n)::uuid,gen_random_uuid()::text,1,gen_random_uuid(),'Gemini','mock',repeat('a',64),'outcome_unknown')
$$;
do $$begin for i in 1..12 loop perform pg_temp.dispatch(1);end loop;end $$;
select is((select attempts from private.provider_daily_usage where scope_key='global'),12,'Uncertain requests count globally');
select throws_ok('select pg_temp.dispatch(1)','P1604',null::text,'Thirteenth request is denied before dispatch');
select is((select attempts from private.provider_daily_usage where scope_key='global'),12,'Denied dispatch does not change accounting');
select throws_ok($$insert into public.jobs(project_id,owner_id,revision_id,kind) values('b1240000-0000-4000-8000-000000000011','b1240000-0000-4000-8000-000000000001','b1240000-0000-4000-8000-000000000021','generation')$$,'P1604',null::text,'New job ID cannot reset user budget');
do $$begin for i in 1..12 loop perform pg_temp.dispatch(2);end loop;end $$;
select is((select attempts from private.provider_daily_usage where scope_key='global'),24,'Global cap shared by accounts');
select ok(not private.provider_daily_available('b1240000-0000-4000-8000-000000000099'),'A fresh account cannot bypass global cap');
update private.provider_daily_usage set day=day-1;
select ok(private.provider_daily_available('b1240000-0000-4000-8000-000000000001'),'Next UTC window has fresh capacity');
select lives_ok('select pg_temp.dispatch(1)','New day dispatch allowed');
select is((select attempts from private.provider_daily_usage where scope_key='global' and day=(clock_timestamp() at time zone 'UTC')::date),1,'New UTC counter starts at one');
select * from finish();rollback;
