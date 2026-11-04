-- Review regressions: trusted terminal purge vs ordinary immutability; OAuth constraint parity.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions,pg_temp;
select no_plan();

select ok(not has_function_privilege('anon','public.purge_revision_plans(uuid)','EXECUTE'),'Anonymous cannot invoke purge');
select ok(not has_function_privilege('authenticated','public.purge_revision_plans(uuid)','EXECUTE'),'Browser cannot invoke purge');
select ok(has_function_privilege('service_role','public.purge_revision_plans(uuid)','EXECUTE'),'Only server role receives purge execution');
select ok(not has_function_privilege('authenticated','private.plan_purge_permitted(uuid,uuid,uuid)','EXECUTE'),'Browser cannot inspect purge lifecycle helper');

insert into auth.users(id,email,raw_user_meta_data) values
 ('b0000000-0000-4000-8000-000000000001','purge-a@example.invalid','{"display_name":"Purge A"}'),
 ('b0000000-0000-4000-8000-000000000002','purge-b@example.invalid','{"display_name":"Purge B"}');
insert into public.projects(id,owner_id,title,mode) values
 ('b1000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','Purge fixture','education'),
 ('b1000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000002','Other fixture','education');
insert into public.revisions(id,project_id,owner_id,revision_number,input_snapshot,input_hash,request_kind,target_seconds,orientation,voice_profile_id,schema_version,prompt_version,composition_version)
select ('b2000000-0000-4000-8000-00000000000'||n)::uuid,('b1000000-0000-4000-8000-00000000000'||n)::uuid,('b0000000-0000-4000-8000-00000000000'||n)::uuid,
1,'{}',repeat('a',64),'initial',60,'landscape','Kore',1,'v1','v1' from generate_series(1,2) n;
insert into public.jobs(id,project_id,owner_id,revision_id,kind,status) values
 ('b3000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','generation','cancelled');
insert into public.plan_versions(id,project_id,owner_id,revision_id,version,dependency_hash,status,model_id,prompt_version,created_by_job_id)
values('b4000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001',1,repeat('a',64),'candidate','synthetic-no-provider','v1','b3000000-0000-4000-8000-000000000001');
insert into public.scenes(project_id,owner_id,revision_id,plan_id,ordinal,narration,script_hash)
select 'b1000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001',n,'Purge scene',repeat('a',64) from generate_series(0,3) n;
update public.plan_versions set status='validated' where id='b4000000-0000-4000-8000-000000000001';
update public.revisions set selected_plan_id='b4000000-0000-4000-8000-000000000001' where id='b2000000-0000-4000-8000-000000000001';
set local role service_role;
select throws_ok($$delete from public.scenes where plan_id='b4000000-0000-4000-8000-000000000001'$$,'23514',null::text,'Service role cannot delete live validated scenes');
select throws_ok($$delete from public.plan_versions where id='b4000000-0000-4000-8000-000000000001'$$,'23514',null::text,'Service role cannot delete live validated plan');
select throws_ok($$select public.purge_revision_plans('b2000000-0000-4000-8000-000000000001')$$,'42501',null::text,'Active account cannot be purged');
reset role;
update public.profiles set status='deleting',deletion_requested_at=now() where id='b0000000-0000-4000-8000-000000000001';
insert into public.account_deletions(owner_id,status) values('b0000000-0000-4000-8000-000000000001','cleaning');
set local role service_role;
select throws_ok($$select public.purge_revision_plans('b2000000-0000-4000-8000-000000000001')$$,'42501',null::text,'Cleaning account has not entered purge stage');
reset role;
update public.account_deletions set status='purging' where owner_id='b0000000-0000-4000-8000-000000000001';
set local role service_role;
select throws_ok($$select public.purge_revision_plans('b2000000-0000-4000-8000-000000000001')$$,'42501',null::text,'Live project/revision cannot be purged');
reset role;
update public.projects set deleted_at=now() where id='b1000000-0000-4000-8000-000000000001';
set local role service_role;
select throws_ok($$select public.purge_revision_plans('b2000000-0000-4000-8000-000000000001')$$,'42501',null::text,'Revision must also be tombstoned');
reset role;
update public.revisions set deleted_at=now() where id='b2000000-0000-4000-8000-000000000001';
update public.jobs set status='queued' where id='b3000000-0000-4000-8000-000000000001';
set local role service_role;
select throws_ok($$select public.purge_revision_plans('b2000000-0000-4000-8000-000000000001')$$,'42501',null::text,'Active work blocks purge');
select is((select count(*)::integer from public.scenes where plan_id='b4000000-0000-4000-8000-000000000001'),4,'Denied purge leaves all scenes intact');
select throws_ok($$select public.purge_revision_plans('b2000000-0000-4000-8000-000000000002')$$,'42501',null::text,'Purge authorization does not extend to another owner');
reset role;
update public.jobs set status='cancelled' where id='b3000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b0000000-0000-4000-8000-000000000001","role":"service_role"}',true);
select throws_ok($$select public.purge_revision_plans('b2000000-0000-4000-8000-000000000001')$$,'42501',null::text,'Forged role claim cannot grant function privilege');
reset role;
set local role service_role;
select throws_ok($$update public.scenes set narration='Still forbidden' where plan_id='b4000000-0000-4000-8000-000000000001'$$,'23514',null::text,'Purge state does not permit content edits');
select throws_ok($$update public.plan_versions set status='candidate' where id='b4000000-0000-4000-8000-000000000001'$$,'23514',null::text,'Purge state does not permit reopening');
select is(public.purge_revision_plans('b2000000-0000-4000-8000-000000000001'),1,'Authorized server purges the validated plan');
select is((select count(*)::integer from public.scenes where revision_id='b2000000-0000-4000-8000-000000000001'),0,'Authorized purge removes validated scenes');
select ok((select selected_plan_id is null from public.revisions where id='b2000000-0000-4000-8000-000000000001'),'Purge clears the selected-plan foreign key');
select is(public.purge_revision_plans('b2000000-0000-4000-8000-000000000001'),0,'Repeated terminal purge is safe');
delete from public.jobs where id='b3000000-0000-4000-8000-000000000001';
delete from public.revisions where id='b2000000-0000-4000-8000-000000000001';
delete from public.projects where id='b1000000-0000-4000-8000-000000000001';
delete from public.profiles where id='b0000000-0000-4000-8000-000000000001';
select pass('Plan foreign keys no longer prevent revision/project/profile deletion');
select is((select count(*)::integer from public.projects where id='b1000000-0000-4000-8000-000000000002'),1,'Other owner project survives purge');
reset role;

-- Exercise the actual CHECK through INSERT, not just the predicate helper.
create function pg_temp.store_oauth_path(destination text) returns void language sql as $$
insert into public.oauth_flows(flow_kind,state_hash,provider,return_path,expires_at)
values('login',encode(extensions.digest(destination,'sha256'),'hex'),'google',destination,now()+interval '5 minutes')
$$;
select lives_ok($$select pg_temp.store_oauth_path('/projects/new')$$,'New-project OAuth destination is stored');
select lives_ok($$select pg_temp.store_oauth_path('/projects/b1000000-0000-4000-8000-000000000002')$$,'Project UUID destination is stored');
select lives_ok($$select pg_temp.store_oauth_path('/projects/B1000000-0000-4000-8000-000000000002')$$,'Canonical uppercase UUID accepted like Zod');
select throws_ok($$select pg_temp.store_oauth_path('https://evil.example')$$,'23514',null::text,'External OAuth redirect rejected');
select throws_ok($$select pg_temp.store_oauth_path('//evil.example')$$,'23514',null::text,'Protocol-relative redirect rejected');
select throws_ok($$select pg_temp.store_oauth_path('/projects/not-a-uuid')$$,'23514',null::text,'Invalid UUID rejected');
select throws_ok($$select pg_temp.store_oauth_path('/projects/b1000000-0000-4000-8000-000000000002?token=secret')$$,'23514',null::text,'Query-bearing destination rejected');
select throws_ok($$select pg_temp.store_oauth_path(E'/projects/b1000000-0000-4000-8000-000000000002\n')$$,'23514',null::text,'Trailing newline rejected');
select throws_ok($$select pg_temp.store_oauth_path('/create')$$,'23514',null::text,'Noncontract legacy create path rejected for new flows');
select * from finish();
rollback;
