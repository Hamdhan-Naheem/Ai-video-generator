-- Synthetic database fixtures only; rollback leaves no users, media, or private application rows.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions,pg_temp;
select no_plan();

select ok(not exists(select 1 from pg_tables where schemaname='public' and not rowsecurity), 'Every application table enables RLS');
select ok(not exists(select 1 from information_schema.role_table_grants where table_schema='public' and grantee='anon'), 'Anonymous has no application table grants');
select ok(not exists(select 1 from information_schema.role_table_grants where table_schema='public' and grantee='authenticated' and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE')), 'Browser has no direct application writes');
select ok(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.prosecdef and not coalesce(p.proconfig @> array['search_path=""'],false)), 'Every privileged function fixes its search path');
select is((select count(*)::integer from storage.buckets where id in ('sources','artifacts') and not public),2,'Both application buckets are private');
select is((select count(*)::integer from public.worker_slots where slot_name='processing' and job_id is null),1,'One empty processing slot');
select ok((select generation_paused and claims_paused from public.app_settings where id='global'),'Work is paused until later integration');
select is((select byte_limit::text from public.usage_accounts where scope='global'),'0','Unknown storage allowance fails closed');

insert into auth.users(id,email,raw_user_meta_data) values
 ('10000000-0000-4000-8000-000000000001','a@example.invalid','{"display_name":"Alice","role":"operator","status":"active","email_ownership":"provider_verified"}'),
 ('10000000-0000-4000-8000-000000000002','b@example.invalid','{"full_name":"Bob"}'),
 ('10000000-0000-4000-8000-000000000003','operator@example.invalid','{}');
select is((select role from public.profiles where id='10000000-0000-4000-8000-000000000001'),'tester','Signup metadata cannot grant operator');
select is((select email_ownership from public.profiles where id='10000000-0000-4000-8000-000000000001'),'unknown','Signup metadata cannot assert mailbox proof');
select is((select display_name from public.profiles where id='10000000-0000-4000-8000-000000000002'),'Bob','Google full_name maps to display name');
select is((select display_name from public.profiles where id='10000000-0000-4000-8000-000000000003'),'New creator','Missing metadata gets safe fallback');
update public.profiles set role='operator' where id='10000000-0000-4000-8000-000000000003';

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*)::integer from public.profiles),1,'Alice sees only her profile');
select throws_ok('update public.profiles set role=''operator''','42501',null::text,'Browser cannot self-promote');
select throws_ok('select * from public.worker_credentials','42501',null::text,'Worker credentials are unreadable');
select throws_ok('select * from public.oauth_flows','42501',null::text,'OAuth state is unreadable');
select throws_ok('select * from public.action_grants','42501',null::text,'Action grants are unreadable');
select throws_ok('select * from public.usage_ledger','42501',null::text,'Accounting internals are unreadable');
select throws_ok('select * from public.plan_versions','42501',null::text,'Raw planning data is unreadable');
select throws_ok('select * from public.provider_attempts','42501',null::text,'Provider internals are unreadable');
select is((select settings_version from public.update_display_name(1,'  Alice Updated  ')),2,'Own name update advances optimistic version');
select is((select display_name from public.profiles),'Alice Updated','Own name is trimmed');
select throws_ok($$select * from public.update_display_name(1,'Stale')$$,'40001',null::text,'Stale settings write conflicts');
select throws_ok($$select * from public.update_display_name(2,'  ')$$,'22023',null::text,'Blank display name rejected');
select throws_ok($$select * from public.update_display_name(2,E'\t\n')$$,'22023',null::text,'Unicode/ASCII whitespace cannot bypass name validation');
select throws_ok($$select * from public.update_display_name(2,repeat('x',81))$$,'22023',null::text,'Display name length enforced');
select is((select settings_version from public.update_display_name(2,repeat('😀',80))),3,'Eighty Unicode code points accepted');

select is((select draft_version from public.save_project_draft('20000000-0000-4000-8000-000000000001',0,'First project','education','{}','{"targetSeconds":60}')),1,'Incomplete draft can be created');
select is((select draft_version from public.save_project_draft('20000000-0000-4000-8000-000000000001',1,'Updated project','education','{"topic":"Water"}','{"targetSeconds":75}')),2,'Draft update increments version');
select throws_ok($$select * from public.save_project_draft('20000000-0000-4000-8000-000000000001',1,'Lost update','education','{}','{}')$$,'40001',null::text,'Stale draft cannot overwrite');
select throws_ok($$select * from public.save_project_draft('20000000-0000-4000-8000-000000000004',0,'Bad preferences','education','{}','{"role":"operator"}')$$,'22023',null::text,'Unknown preference keys rejected');
select throws_ok($$select * from public.save_project_draft('20000000-0000-4000-8000-000000000004',0,'Bad duration','education','{}','{"targetSeconds":30}')$$,'22023',null::text,'Unsupported target rejected');
select throws_ok($$select * from public.save_project_draft('20000000-0000-4000-8000-000000000004',0,'Bad object','education','[]','{}')$$,'22023',null::text,'Non-object draft rejected');
select throws_ok($$select * from public.save_project_draft('20000000-0000-4000-8000-000000000004',0,repeat('😀',61),'education','{}','{}')$$,'22023',null::text,'Draft title agrees with browser UTF-16 length budget');
select throws_ok('delete from public.projects','42501',null::text,'Direct project deletion denied');

select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*)::integer from public.projects),0,'Bob cannot see Alice project');
select throws_ok($$select * from public.save_project_draft('20000000-0000-4000-8000-000000000001',2,'Attack','education','{}','{}')$$,'42501',null::text,'Bob cannot overwrite Alice project');
select throws_ok($$select * from public.save_project_draft('20000000-0000-4000-8000-000000000001',0,'Attack','education','{}','{}')$$,'42501',null::text,'Bob cannot claim existing ID');
select * from public.save_project_draft('20000000-0000-4000-8000-000000000002',0,'Bob project','software','{}','{}');
reset role;

insert into public.revisions(id,project_id,owner_id,revision_number,input_snapshot,input_hash,request_kind,target_seconds,orientation,voice_profile_id,schema_version,prompt_version,composition_version) values
 ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',1,'{}',repeat('a',64),'initial',60,'landscape','Kore',1,'v1','v1'),
 ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002',1,'{}',repeat('b',64),'initial',75,'portrait','Kore',1,'v1','v1');
select throws_ok($$insert into public.revisions(project_id,owner_id,revision_number,input_snapshot,input_hash,request_kind,target_seconds,orientation,voice_profile_id,schema_version,prompt_version,composition_version)
values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',2,'{}',repeat('c',64),'initial',60,'landscape','Kore',1,'v1','v1')$$,'23503',null::text,'Composite FK prevents cross-owner revision');
select throws_ok($$update public.revisions set input_snapshot='{"topic":"Tampered"}' where id='30000000-0000-4000-8000-000000000001'$$,'23514',null::text,'Revision input is immutable');
select throws_ok($$update public.revisions set parent_revision_id='30000000-0000-4000-8000-000000000002' where id='30000000-0000-4000-8000-000000000001'$$,'23514',null::text,'Revision parent is immutable');
select throws_ok($$update public.projects set mode='branding' where id='20000000-0000-4000-8000-000000000001'$$,'23514',null::text,'Mode locked after generation');
select throws_ok($$do $test$ begin update public.revisions set status='ready',completed_at=now(),expires_at=now()+interval '7 days' where id='30000000-0000-4000-8000-000000000001'; set constraints all immediate; end $test$ $$,'23514',null::text,'Ready cannot be published without clean export');
select throws_ok($$update public.revisions set completed_at=now(),expires_at=null where id='30000000-0000-4000-8000-000000000001'$$,'23514',null::text,'Completion requires exact retention expiry');
insert into public.jobs(id,project_id,owner_id,revision_id,kind) values
 ('40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','generation'),
 ('40000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','generation');
select throws_ok($$update public.jobs set progress='{"completedScenes":6,"totalScenes":4}' where id='40000000-0000-4000-8000-000000000001'$$,'23514',null::text,'Progress cannot exceed known scene count');
select throws_ok($$update public.jobs set progress='null' where id='40000000-0000-4000-8000-000000000001'$$,'23514',null::text,'Null progress is invalid');
select throws_ok($$update public.jobs set repair_count=3 where id='40000000-0000-4000-8000-000000000001'$$,'23514',null::text,'Repair counter cannot exceed two');
select throws_ok($$update public.jobs set status='running' where id='40000000-0000-4000-8000-000000000001'$$,'23514',null::text,'Running requires worker lease');
insert into public.job_events(job_id,sequence,stage,code,safe_message) values('40000000-0000-4000-8000-000000000001',1,'understand','queued','Queued');
insert into public.plan_versions(id,project_id,owner_id,revision_id,version,dependency_hash,status,model_id,prompt_version,created_by_job_id)
values('80000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',1,repeat('a',64),'candidate','synthetic-no-provider','v1','40000000-0000-4000-8000-000000000001');
insert into public.scenes(project_id,owner_id,revision_id,plan_id,ordinal,narration,script_hash)
select '20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001',n,'Synthetic scene',repeat('a',64) from generate_series(0,2) n;
select throws_ok($$update public.plan_versions set status='validated' where id='80000000-0000-4000-8000-000000000001'$$,'23514',null::text,'Three scenes cannot validate');
insert into public.scenes(project_id,owner_id,revision_id,plan_id,ordinal,narration,script_hash)
values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001',3,'Synthetic scene',repeat('a',64));
update public.plan_versions set status='validated' where id='80000000-0000-4000-8000-000000000001';
select pass('Four consecutive scenes validate');
select throws_ok($$update public.scenes set narration='Tampered' where plan_id='80000000-0000-4000-8000-000000000001'$$,'23514',null::text,'Validated scenes cannot change');
select throws_ok($$delete from public.scenes where plan_id='80000000-0000-4000-8000-000000000001'$$,'23514',null::text,'Validated scenes cannot be deleted');
select throws_ok($$update public.plan_versions set status='candidate' where id='80000000-0000-4000-8000-000000000001'$$,'23514',null::text,'Validated plan cannot be reopened');
select throws_ok($$update public.revisions set selected_plan_id='80000000-0000-4000-8000-000000000001' where id='30000000-0000-4000-8000-000000000002'$$,'23503',null::text,'Selected plan cannot cross revision ownership');
select throws_ok($$update public.usage_accounts set used_bytes=-1 where scope='global'$$,'23514',null::text,'Accounting balance cannot become negative');
select throws_ok($$insert into public.worker_slots(slot_name) values('second')$$,'23514',null::text,'A second global processing slot cannot be created');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*)::integer from public.job_summaries),1,'Alice reads only own safe job summary');
select is((select count(*)::integer from public.job_events),1,'Alice reads own safe progress event');
select throws_ok('select budget_snapshot from public.jobs','42501',null::text,'Raw job budget is hidden');
select throws_ok('select details from public.job_events','42501',null::text,'Raw progress details are hidden');
select throws_ok('update public.jobs set status=''succeeded''','42501',null::text,'Browser cannot publish a job');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is((select count(*)::integer from public.projects),0,'Operator role does not bypass media ownership');
select is((select count(*)::integer from public.job_summaries),0,'Operator cannot browse other users jobs');
reset role;

insert into public.assets(id,project_id,owner_id,kind,bucket,object_key,declared_bytes,declared_mime) values
 ('50000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','source_image','sources','10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001/50000000-0000-4000-8000-000000000001/source.png',1000,'image/png');
insert into public.upload_allocations(id,project_id,owner_id,asset_id,reservation_id,expected_bytes,expected_mime,source_role,protocol,expires_at)
values('60000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001',1000,'image/png','image','standard',now()+interval '10 minutes');
insert into public.usage_reservations(id,owner_id,upload_allocation_id,kind,bytes_remaining,output_slots_remaining)
values('70000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','source',1000,0);
set constraints all immediate;
select throws_ok($$insert into public.revision_assets(revision_id,asset_id,project_id,owner_id,purpose,retain_until)
values('30000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','input',now()+interval '7 days')$$,'23503',null::text,'Cross-owner asset linking fails even with privileged insert');
select throws_ok($$update public.assets set object_key=object_key||'x' where id='50000000-0000-4000-8000-000000000001'$$,'23514',null::text,'Object location is immutable');
update public.assets set state='deleting' where id='50000000-0000-4000-8000-000000000001';
select throws_ok($$insert into public.revision_assets(revision_id,asset_id,project_id,owner_id,purpose,retain_until)
values('30000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','input',now()+interval '7 days')$$,'23514',null::text,'Deleting asset cannot acquire reference');
update public.assets set state='allocated' where id='50000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select ok(private.can_upload('sources','10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001/50000000-0000-4000-8000-000000000001/source.png'),'Exact live owned allocation permits insert');
select ok(not private.can_upload('sources','10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001/50000000-0000-4000-8000-000000000001/arbitrary.png'),'Arbitrary name denied');
select ok(not private.can_upload('artifacts','anything.mp4'),'Browser cannot allocate output upload');
select throws_ok('select * from public.assets','42501',null::text,'Raw asset paths are hidden');
select is((select count(*)::integer from storage.objects),0,'Storage RLS exposes no rows for listing or signing reads');
select throws_ok($$insert into storage.objects(bucket_id,name) values('sources','arbitrary.png')$$,'42501',null::text,'Storage RLS denies unallocated path');
insert into storage.objects(bucket_id,name) values('sources','10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001/50000000-0000-4000-8000-000000000001/source.png');
select pass('Storage RLS allows exact allocated path (metadata fixture, no media bytes)');
select throws_ok($$insert into storage.objects(bucket_id,name) values('sources','10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001/50000000-0000-4000-8000-000000000001/source.png')$$,'42501',null::text,'Allocation cannot overwrite existing object');
select throws_ok('delete from storage.objects','42501',null::text,'Browser storage deletion denied');
with changed as (update storage.objects set name='x' returning id)
select is((select count(*)::integer from changed),0,'Storage RLS permits no browser overwrites');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select ok(not private.can_upload('sources','10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001/50000000-0000-4000-8000-000000000001/source.png'),'Bob cannot use Alice allocation');
reset role;
update public.upload_allocations set expires_at=now()-interval '1 second', created_at=now()-interval '1 hour';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select ok(not private.can_upload('sources','10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001/50000000-0000-4000-8000-000000000001/source.png'),'Expired allocation is denied');
reset role;
update public.revisions set status='expired',completed_at=now()-interval '8 days',expires_at=now()-interval '1 day'
where id='30000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*)::integer from public.revisions),0,'Revision expiry revokes reads without cleanup');
select is((select count(*)::integer from public.job_summaries),0,'Expired revision hides job reads');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
reset role;
update public.profiles set status='disabled' where id='10000000-0000-4000-8000-000000000001';
set local role authenticated;
select is((select count(*)::integer from public.profiles),0,'Disabled identity sees no profile');
select is((select count(*)::integer from public.projects),0,'Disabled identity sees no projects');
select is((select count(*)::integer from public.job_summaries),0,'Disabled identity sees no jobs');
select throws_ok($$select * from public.update_display_name(3,'Denied')$$,'42501',null::text,'Disabled identity cannot mutate settings');
reset role;
update public.profiles set status='deleting' where id='10000000-0000-4000-8000-000000000001';
set local role authenticated;
select throws_ok($$select * from public.save_project_draft('20000000-0000-4000-8000-000000000001',2,'Denied','education','{}','{}')$$,'42501',null::text,'Deleting identity cannot save drafts');
reset role;
update public.profiles set status='active' where id='10000000-0000-4000-8000-000000000001';
update public.projects set deleted_at=now() where id='20000000-0000-4000-8000-000000000001';
set local role authenticated;
select is((select count(*)::integer from public.projects),0,'Project tombstone hides project');
select is((select count(*)::integer from public.revisions),0,'Project tombstone hides revisions');
select is((select count(*)::integer from public.job_summaries),0,'Project tombstone hides jobs');
select is((select count(*)::integer from public.job_events),0,'Project tombstone hides events');
select throws_ok($$select * from public.save_project_draft('20000000-0000-4000-8000-000000000001',0,'Resurrection','education','{}','{}')$$,'42501',null::text,'Tombstoned project cannot be resurrected');
reset role;
set local role anon;
select throws_ok('select * from public.projects','42501',null::text,'Anonymous cannot read projects');
select throws_ok($$select * from public.update_display_name(1,'Anonymous')$$,'42501',null::text,'Anonymous cannot call profile mutation');
select throws_ok($$select * from public.save_project_draft(gen_random_uuid(),0,'Anonymous','education','{}','{}')$$,'42501',null::text,'Anonymous cannot create draft');
reset role;
select * from finish();
rollback;
