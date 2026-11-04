begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions,pg_temp;
select no_plan();

insert into auth.users(id,email,raw_user_meta_data)
values('c0000000-0000-4000-8000-000000000001','membership@example.invalid','{"display_name":"Scene membership fixture"}');
insert into public.projects(id,owner_id,title,mode)
values('c1000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','Scene membership','education');
insert into public.revisions(id,project_id,owner_id,revision_number,input_snapshot,input_hash,request_kind,target_seconds,orientation,voice_profile_id,schema_version,prompt_version,composition_version)
values('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001',1,'{}',repeat('a',64),'initial',60,'landscape','Kore',1,'v1','v1');
insert into public.jobs(id,project_id,owner_id,revision_id,kind,status)
values('c3000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','generation','cancelled');
insert into public.plan_versions(id,project_id,owner_id,revision_id,version,dependency_hash,status,model_id,prompt_version,created_by_job_id)
select ('c4000000-0000-4000-8000-00000000000'||n)::uuid,'c1000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001',
'c2000000-0000-4000-8000-000000000001',n,repeat('a',64),'candidate','synthetic-no-provider','v1','c3000000-0000-4000-8000-000000000001' from generate_series(1,3) n;
insert into public.scenes(project_id,owner_id,revision_id,plan_id,ordinal,narration,script_hash)
select 'c1000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000001',n,'Fixture narration',repeat('a',64) from generate_series(0,3) n;

set local role service_role;
select lives_ok($$update public.scenes set narration='Candidate correction' where plan_id='c4000000-0000-4000-8000-000000000001' and ordinal=0$$,'Candidate content remains editable within its plan');
select throws_ok($$update public.scenes set plan_id='c4000000-0000-4000-8000-000000000002' where plan_id='c4000000-0000-4000-8000-000000000001' and ordinal=3$$,'23514','Scene plan membership is immutable','Even candidate-to-candidate reparenting is prohibited');
select throws_ok($$update public.scenes set plan_id=null where plan_id='c4000000-0000-4000-8000-000000000001' and ordinal=3$$,'23514','Scene plan membership is immutable','Removing plan membership is prohibited');
select is((select count(*)::integer from public.scenes where plan_id='c4000000-0000-4000-8000-000000000001'),4,'Rejected moves preserve all source scenes');
select is((select count(*)::integer from public.scenes where plan_id='c4000000-0000-4000-8000-000000000002'),0,'Rejected moves do not populate destination');
update public.plan_versions set status='validated' where id='c4000000-0000-4000-8000-000000000001';
select throws_ok($$update public.scenes set plan_id='c4000000-0000-4000-8000-000000000002' where plan_id='c4000000-0000-4000-8000-000000000001' and ordinal=3$$,'23514','Scene plan membership is immutable','Validated source cannot be moved to a candidate');
select throws_ok($$update public.scenes set narration='Forbidden correction' where plan_id='c4000000-0000-4000-8000-000000000001' and ordinal=0$$,'23514',null::text,'Validated source content remains immutable');

insert into public.scenes(project_id,owner_id,revision_id,plan_id,ordinal,narration,script_hash)
select project_id,owner_id,revision_id,'c4000000-0000-4000-8000-000000000002',ordinal,narration,script_hash
from public.scenes where plan_id='c4000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.scenes where plan_id='c4000000-0000-4000-8000-000000000002'),4,'Content reuse creates new scene rows in a new plan');
select ok(not exists(select 1 from public.scenes a join public.scenes b on a.id=b.id where a.plan_id='c4000000-0000-4000-8000-000000000001' and b.plan_id='c4000000-0000-4000-8000-000000000002'),'Reused content has independent scene identities');
update public.plan_versions set status='validated' where id='c4000000-0000-4000-8000-000000000002';
insert into public.scenes(project_id,owner_id,revision_id,plan_id,ordinal,narration,script_hash)
values('c1000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000003',0,'Another candidate',repeat('a',64));
select throws_ok($$update public.scenes set plan_id='c4000000-0000-4000-8000-000000000002' where plan_id='c4000000-0000-4000-8000-000000000003'$$,'23514','Scene plan membership is immutable','Candidate source cannot be moved into a validated destination');
reset role;
select * from finish();
rollback;
