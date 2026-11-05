-- Rollback-only metadata fixtures: no media bytes, provider calls or changed real accounts.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions,pg_temp;
select no_plan();
select ok(not has_function_privilege('anon','public.get_dashboard()','EXECUTE'),'Anonymous cannot execute dashboard RPC');
select ok(has_function_privilege('authenticated','public.get_dashboard()','EXECUTE'),'Authenticated has narrow dashboard RPC');
select ok(not has_table_privilege('authenticated','public.workers','SELECT'),'Raw workers remain private');
select ok(not has_table_privilege('authenticated','public.usage_accounts','SELECT'),'Raw accounting remains private');
insert into auth.users(id,email) values
 ('e8000000-0000-4000-8000-000000000001','dashboard-a@example.invalid'),
 ('e8000000-0000-4000-8000-000000000002','dashboard-b@example.invalid');
insert into public.projects(id,owner_id,title,mode,draft_input,updated_at)
select ('e8100000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'e8000000-0000-4000-8000-000000000001','Own project '||n,'education','{"secret":"DO_NOT_EXPOSE"}',now() from generate_series(1,8) n;
insert into public.projects(id,owner_id,title,mode,draft_state,draft_input,deleted_at) values
 ('e8100000-0000-4000-8000-000000000009','e8000000-0000-4000-8000-000000000001','Deleted project','education','active','{}',now()),
 ('e8100000-0000-4000-8000-000000000010','e8000000-0000-4000-8000-000000000001','Removed draft','education','removed','{}',null),
 ('e8100000-0000-4000-8000-000000000011','e8000000-0000-4000-8000-000000000002','Other owner secret','software','active','{}',null);
insert into public.usage_accounts(scope,owner_id,used_bytes,reserved_bytes,byte_limit,output_limit,reserved_outputs)
values('user','e8000000-0000-4000-8000-000000000001',9007199254740993,1024,9007199254740994,3,1);
-- Global configuration mutations are transaction-local and rolled back.
update public.workers set enabled=false;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e8000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((public.get_dashboard()->>'projectCount')::integer,8,'Own count excludes removed-only drafts and deleted projects');
select is(jsonb_array_length(public.get_dashboard()->'recentProjects'),6,'Recent projection is bounded');
select is(public.get_dashboard()->'recentProjects'->0->>'id','e8100000-0000-4000-8000-000000000008','Equal timestamp ordering uses descending ID');
select is(public.get_dashboard()->'recentProjects'->0->>'state','draft','Incomplete saved project is a draft');
select ok(public.get_dashboard()::text not like '%DO_NOT_EXPOSE%' and public.get_dashboard()::text not like '%Other owner secret%' and public.get_dashboard()::text not like '%owner_id%','Projection omits source text, owner identifiers and foreign projects');
select is(public.get_dashboard()->'usage'->>'usedBytes','9007199254740993','Bigint byte precision retained as decimal string');
select is(public.get_dashboard()->'usage'->>'reservedOutputs','1','Reserved slots reported separately');
select is(public.get_dashboard()->'usage'->>'maxOutputs','3','Configured output limit reported');
select is(public.get_dashboard()->'usage'->>'accountingConfigured','false','Unknown global storage allowance fails closed');
select is(public.get_dashboard()->'worker'->>'status','not_configured','No enabled compatible worker is not configured');
select is(public.get_dashboard()->'worker'->>'processingPaused','true','Paused admission is exposed safely');
select set_config('request.jwt.claims','{"sub":"e8000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((public.get_dashboard()->>'projectCount')::integer,1,'Second user sees only their own count');
select is(public.get_dashboard()->'usage'->'usedBytes','null'::jsonb,'Missing user accounting is unknown, not fabricated zero');
select is(public.get_dashboard()->'usage'->'reservedOutputs','null'::jsonb,'Missing reservation counters are unknown');
select throws_ok('select public.get_dashboard(''e8000000-0000-4000-8000-000000000001''::uuid)','42883',null::text,'RPC cannot accept another owner');
reset role;
insert into public.workers(id,label,enabled,protocol_version,last_seen_at,health,capabilities)
values('e8200000-0000-4000-8000-000000000001','PRIVATE_WORKER_LABEL',true,1,now(),'{"private":"DO_NOT_EXPOSE"}','{}');
set local role authenticated;
select is(public.get_dashboard()->'worker'->>'status','online','Fresh enabled worker heartbeat is online');
select ok(public.get_dashboard()::text not like '%PRIVATE_WORKER_LABEL%' and public.get_dashboard()::text not like '%DO_NOT_EXPOSE%' and public.get_dashboard()::text not like '%e8200000%','Worker internal metadata and IDs are omitted');
reset role;
update public.workers set last_seen_at=now()-interval '90 seconds' where id='e8200000-0000-4000-8000-000000000001';
set local role authenticated;
select is(public.get_dashboard()->'worker'->>'status','offline','Heartbeat at 90-second boundary is offline');
reset role;
update public.workers set last_seen_at=now()+interval '1 hour' where id='e8200000-0000-4000-8000-000000000001';
set local role authenticated;
select is(public.get_dashboard()->'worker'->>'status','offline','Future heartbeat cannot establish online status');
reset role;
update public.workers set protocol_version=2 where id='e8200000-0000-4000-8000-000000000001';
set local role authenticated;
select is(public.get_dashboard()->'worker'->>'status','not_configured','Unsupported worker protocol is not usable');
reset role;
-- Fully constrained synthetic ready output and an expired metadata-only revision.
insert into public.revisions(id,project_id,owner_id,revision_number,input_hash,request_kind,target_seconds,orientation,voice_profile_id,schema_version,prompt_version,composition_version,status,completed_at,expires_at)
values
 ('e8300000-0000-4000-8000-000000000008','e8100000-0000-4000-8000-000000000008','e8000000-0000-4000-8000-000000000001',1,repeat('a',64),'initial',60,'landscape','Kore',1,'v1','v1','ready',now(),now()+interval '7 days'),
 ('e8300000-0000-4000-8000-000000000007','e8100000-0000-4000-8000-000000000007','e8000000-0000-4000-8000-000000000001',1,repeat('a',64),'initial',60,'landscape','Kore',1,'v1','v1','expired',now()-interval '8 days',now()-interval '1 day');
insert into public.jobs(id,project_id,owner_id,revision_id,kind,status)
values('e8400000-0000-4000-8000-000000000008','e8100000-0000-4000-8000-000000000008','e8000000-0000-4000-8000-000000000001','e8300000-0000-4000-8000-000000000008','generation','succeeded');
insert into public.assets(id,project_id,owner_id,kind,bucket,object_key,state,byte_size,checksum,received_at,validated_at,detected_mime)
select ('e8500000-0000-4000-8000-00000000000'||n)::uuid,'e8100000-0000-4000-8000-000000000008','e8000000-0000-4000-8000-000000000001',
 (array['video','report','thumbnail','captions_vtt','captions_srt'])[n],'artifacts',
 'e8000000-0000-4000-8000-000000000001/e8100000-0000-4000-8000-000000000008/e8500000-0000-4000-8000-00000000000'||n||'/fixture.bin',
 'available',1,repeat('a',64),now(),now(),'application/octet-stream' from generate_series(1,5) n;
insert into public.exports(project_id,owner_id,revision_id,variant,state,job_id,video_asset_id,verification_asset_id,thumbnail_asset_id,vtt_asset_id,srt_asset_id,ready_at,expires_at)
values('e8100000-0000-4000-8000-000000000008','e8000000-0000-4000-8000-000000000001','e8300000-0000-4000-8000-000000000008','clean','ready','e8400000-0000-4000-8000-000000000008',
 'e8500000-0000-4000-8000-000000000001','e8500000-0000-4000-8000-000000000002','e8500000-0000-4000-8000-000000000003','e8500000-0000-4000-8000-000000000004','e8500000-0000-4000-8000-000000000005',now(),now()+interval '7 days');
update public.projects set latest_ready_revision_id='e8300000-0000-4000-8000-000000000008' where id='e8100000-0000-4000-8000-000000000008';
set constraints all immediate;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e8000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.get_dashboard()->'recentProjects'->0->>'state','ready','Live result takes precedence over draft');
select is(public.get_dashboard()->'recentProjects'->1->>'state','expired','Expired metadata remains distinguishable before cleanup');
select is(public.get_dashboard()->'usage'->>'retainedOutputs','1','Only live ready outputs consume displayed saved slots');
reset role;
update public.projects set deleted_at=now() where id='e8100000-0000-4000-8000-000000000008';
set local role authenticated;
select is(public.get_dashboard()->'usage'->>'retainedOutputs','0','Deleted project output is excluded from retained count');
select set_config('request.jwt.claims','{"sub":"e8000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
reset role;
update public.profiles set status='disabled' where id='e8000000-0000-4000-8000-000000000002';
set local role authenticated;
select throws_ok('select public.get_dashboard()','42501',null::text,'Disabled profile cannot read projection');
select set_config('request.jwt.claims','{}',true);
select throws_ok('select public.get_dashboard()','42501',null::text,'Missing actor is denied even through privileged function');
reset role;
select * from finish();
rollback;
