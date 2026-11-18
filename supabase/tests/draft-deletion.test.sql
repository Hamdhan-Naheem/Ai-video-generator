begin;
set local search_path=public,extensions,pg_temp;
select no_plan();
select ok(not has_function_privilege('anon','public.delete_saved_draft(uuid,integer)','execute'),'Anonymous deletion denied');
select ok(has_function_privilege('authenticated','public.delete_saved_draft(uuid,integer)','execute'),'Authenticated draft deletion granted');
insert into auth.users(id,email) values('dd240000-0000-4000-8000-000000000001','delete-draft-a@example.invalid'),('dd240000-0000-4000-8000-000000000002','delete-draft-b@example.invalid');
insert into public.projects(id,owner_id,title,mode) values('dd241000-0000-4000-8000-000000000001','dd240000-0000-4000-8000-000000000001','Education deletion','education'),('dd241000-0000-4000-8000-000000000002','dd240000-0000-4000-8000-000000000002','Other owner','education');
select set_config('request.jwt.claims','{"sub":"dd240000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.delete_saved_draft('dd241000-0000-4000-8000-000000000002',1)$$,'42501',null::text,'Other owner cannot delete draft');
select throws_ok($$select public.delete_saved_draft('dd241000-0000-4000-8000-000000000099',1)$$,'42501',null::text,'Missing draft indistinguishable from foreign draft');
select throws_ok($$select public.delete_saved_draft('dd241000-0000-4000-8000-000000000001',2)$$,'40001',null::text,'Stale version rejected');
select throws_ok($$select public.delete_saved_draft('dd241000-0000-4000-8000-000000000001',null)$$,'22023',null::text,'Version is mandatory');
select is(public.delete_saved_draft('dd241000-0000-4000-8000-000000000001',1),' {"deleted":true,"cleanupState":"pending"}'::jsonb,'Owned draft removal accepted');
select is((select draft_state from public.projects where id='dd241000-0000-4000-8000-000000000001'),'removed','Draft becomes removed');
select is((select draft_input from public.projects where id='dd241000-0000-4000-8000-000000000001'),'{}'::jsonb,'Mutable input removed');
select is(jsonb_array_length(public.list_saved_drafts()),0,'Deleted draft excluded from list');
select is(public.get_project_draft('dd241000-0000-4000-8000-000000000001'),null::jsonb,'Removed draft cannot be reopened');
select is(public.delete_saved_draft('dd241000-0000-4000-8000-000000000001',1)->>'deleted','true','Lost response safely replays original version');
select is((select draft_version from public.projects where id='dd241000-0000-4000-8000-000000000001'),2,'Repeat deletion does not mutate version again');
select throws_ok($$select public.update_project_draft('dd241000-0000-4000-8000-000000000001',2,'Restore','{}','{}')$$,'42501',null::text,'Stale editor cannot restore removed draft');

-- Active generation blocks removal; frozen history survives successful removal.
insert into public.projects(id,owner_id,title,mode) values('dd241000-0000-4000-8000-000000000003','dd240000-0000-4000-8000-000000000001','Has history','software');
insert into public.revisions(id,project_id,owner_id,revision_number,input_hash,request_kind,target_seconds,orientation,voice_profile_id,schema_version,prompt_version,composition_version) values('dd242000-0000-4000-8000-000000000001','dd241000-0000-4000-8000-000000000003','dd240000-0000-4000-8000-000000000001',1,repeat('a',64),'initial',60,'landscape','Kore',1,'v1','v1');
insert into public.jobs(id,project_id,owner_id,revision_id,kind,status) values('dd243000-0000-4000-8000-000000000001','dd241000-0000-4000-8000-000000000003','dd240000-0000-4000-8000-000000000001','dd242000-0000-4000-8000-000000000001','generation','waiting_worker');
select throws_ok($$select public.delete_saved_draft('dd241000-0000-4000-8000-000000000003',1)$$,'P1401',null::text,'Waiting job blocks deletion');
select is((select draft_state from public.projects where id='dd241000-0000-4000-8000-000000000003'),'active','Rejected deletion leaves draft active');
update public.jobs set status='cancelled',finished_at=now() where id='dd243000-0000-4000-8000-000000000001';

-- Add an unreferenced transfer and a frozen source; only the former is removed.
update public.usage_accounts set byte_limit=500000000 where scope='global';
create temporary table uploads(label text,result jsonb);
insert into uploads select 'unused',public.reserve_source_upload('dd241000-0000-4000-8000-000000000003',1,'unused',repeat('b',64),'unused.png','image/png',100,'image');
insert into uploads select 'shared',public.reserve_source_upload('dd241000-0000-4000-8000-000000000003',2,'shared',repeat('c',64),'shared.png','image/png',100,'image');
insert into public.revision_assets(revision_id,asset_id,project_id,owner_id,purpose,retain_until) select 'dd242000-0000-4000-8000-000000000001',u.asset_id,'dd241000-0000-4000-8000-000000000003','dd240000-0000-4000-8000-000000000001','input',now()+interval '7 days' from public.upload_allocations u where u.id=(select (result->>'uploadId')::uuid from uploads where label='shared');
select is(public.delete_saved_draft('dd241000-0000-4000-8000-000000000003',3)->>'deleted','true','History project draft can be removed after job ends');
select is((select count(*)::integer from public.revisions where project_id='dd241000-0000-4000-8000-000000000003'),1,'Frozen revision retained');
select is((select count(*)::integer from public.jobs where project_id='dd241000-0000-4000-8000-000000000003'),1,'Job history retained');
select is((select state from public.upload_allocations where id=(select (result->>'uploadId')::uuid from uploads where label='unused')),'abandoned','Unused upload abandoned');
select is((select state from public.upload_allocations where id=(select (result->>'uploadId')::uuid from uploads where label='shared')),'allocated','Frozen source untouched');
select is((select count(*)::integer from public.cleanup_tasks where owner_id='dd240000-0000-4000-8000-000000000001'),1,'Only unreferenced source queued for cleanup');
select is((select used_bytes from public.usage_accounts where owner_id='dd240000-0000-4000-8000-000000000001'),45000000::bigint,'Partial transfer remains conservatively charged');
select is(public.cleanup_source_upload((select (result->>'uploadId')::uuid from uploads where label='shared'),'dd240000-0000-4000-8000-000000000001',false),null::jsonb,'Cleanup cannot delete frozen source');
select is(public.delete_saved_draft('dd241000-0000-4000-8000-000000000003',3)->>'deleted','true','Upload deletion replay is idempotent');
select is((select count(*)::integer from public.cleanup_tasks where owner_id='dd240000-0000-4000-8000-000000000001'),1,'Replay creates no duplicate cleanup');
update public.profiles set status='disabled' where id='dd240000-0000-4000-8000-000000000001';
select throws_ok($$select public.delete_saved_draft('dd241000-0000-4000-8000-000000000001',1)$$,'42501',null::text,'Disabled account cannot replay delete');
select * from finish();
rollback;
