begin;
set local search_path=public,extensions,pg_temp;
select no_plan();
select ok(not has_function_privilege('anon','public.list_education_videos(timestamptz,uuid)','execute'),'Anonymous library access denied');
select ok(has_function_privilege('authenticated','public.list_education_videos(timestamptz,uuid)','execute'),'Signed-in listing permitted');
insert into auth.users(id,email) values('a2300000-0000-4000-8000-000000000001','video-list-a@example.invalid'),('a2300000-0000-4000-8000-000000000002','video-list-b@example.invalid');
-- Legacy over-capacity pagination fixture; DDL and rows both roll back.
alter table public.projects disable trigger projects_metadata_limit;
insert into public.projects(id,owner_id,title,mode,draft_input)
 select ('a2300000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'a2300000-0000-4000-8000-000000000001','Mutable draft title','education','{"referenceNotes":"PRIVATE_LIST_NOTE"}' from generate_series(101,126)n;
insert into public.revisions(id,owner_id,project_id,revision_number,input_snapshot,input_hash,request_kind,status,target_seconds,orientation,voice_profile_id,schema_version,prompt_version,composition_version,completed_at,expires_at)
 select ('a2300000-0000-4000-8000-'||lpad((n+100)::text,12,'0'))::uuid,'a2300000-0000-4000-8000-000000000001',('a2300000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,1,jsonb_build_object('input',jsonb_build_object('title','Frozen result '||n,'referenceNotes','PRIVATE_FROZEN_NOTE')),repeat('a',64),'initial','expired',60,'landscape','Kore',1,'v1','v1','2026-10-01T00:00:00.123456Z','2026-10-08T00:00:00.123456Z' from generate_series(101,125)n;
update public.projects set draft_input='{}',draft_state='removed' where id='a2300000-0000-4000-8000-000000000101';
update public.projects set deleted_at=now() where id='a2300000-0000-4000-8000-000000000124';
update public.revisions set deleted_at=now() where id='a2300000-0000-4000-8000-000000000225';
insert into public.projects(id,owner_id,title,mode) values('a2300000-0000-4000-8000-000000000099','a2300000-0000-4000-8000-000000000002','FOREIGN_RESULT','education');
insert into public.revisions(id,owner_id,project_id,revision_number,input_hash,request_kind,status,target_seconds,orientation,voice_profile_id,schema_version,prompt_version,composition_version,completed_at,expires_at)
 values('a2300000-0000-4000-8000-000000000299','a2300000-0000-4000-8000-000000000002','a2300000-0000-4000-8000-000000000099',1,repeat('b',64),'initial','expired',60,'portrait','Kore',1,'v1','v1','2026-10-01','2026-10-08');
set constraints all immediate;
alter table public.projects enable trigger projects_metadata_limit;
set constraints all deferred;
select set_config('request.jwt.claims','{"sub":"a2300000-0000-4000-8000-000000000001","role":"authenticated"}',true);
create temporary table listing(value jsonb);insert into listing values(public.list_education_videos());
select is((select jsonb_array_length(value->'items') from listing),21,'Bounded page plus one lookahead');
select ok((select value::text not like '%PRIVATE_LIST_NOTE%' and value::text not like '%PRIVATE_FROZEN_NOTE%' and value::text not like '%FOREIGN_RESULT%' and value::text not like '%objectKey%' and value::text not like '%bucket%' from listing),'No foreign results, source text or media paths');
select is((select jsonb_array_length(public.list_education_videos((value->'items'->19->>'completedAt')::timestamptz,(value->'items'->19->>'revisionId')::uuid)->'items') from listing),3,'Microsecond timestamp ties paginate with UUID without losing rows');
select is((select item->>'title' from listing,jsonb_array_elements(value->'items') item limit 1),'Frozen result 123','Frozen result title rather than mutable draft title');
select ok((select bool_and(item->>'status'='expired') from listing,jsonb_array_elements(value->'items')item),'Historical rows expire without waiting for cleanup');
select throws_ok($$select public.list_education_videos(now(),null)$$,'22023',null::text,'Partial cursor rejected');
select is(jsonb_array_length(public.list_education_videos('2026-10-01T00:00:00.123456Z','a2300000-0000-4000-8000-000000000202')->'items'),1,'Removed draft does not hide the remaining result');
select is(public.list_education_videos('2026-10-01T00:00:00.123456Z','a2300000-0000-4000-8000-000000000202')->'items'->0->>'canEditDraft','false','Removed input does not advertise an editable draft');
select ok((select value?'usage' and value?'asOf' from listing),'Account usage and server time are returned');
select set_config('request.jwt.claims','{"sub":"a2300000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(jsonb_array_length(public.list_education_videos()->'items'),1,'Foreign account only sees its own result');
update public.profiles set status='disabled' where id='a2300000-0000-4000-8000-000000000002';
select throws_ok($$select public.list_education_videos()$$,'42501',null::text,'Disabled account denied');
select set_config('request.jwt.claims','{}',true);
select throws_ok($$select public.list_education_videos()$$,'42501',null::text,'Missing identity cannot list all accounts');
select ok(exists(select 1 from pg_indexes where schemaname='public' and indexname='revisions_owner_completed_idx'),'Owner/completion keyset index exists');
select * from finish();rollback;
