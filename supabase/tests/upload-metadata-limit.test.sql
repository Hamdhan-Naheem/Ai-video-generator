begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions,pg_temp;
select no_plan();
select ok(not has_function_privilege('authenticated','private.guard_upload_metadata()','EXECUTE'),'Browser cannot invoke internal allocation guard');
insert into auth.users(id,email) values('b1260000-0000-4000-8000-000000000001','upload-metadata@example.invalid');
insert into public.projects(id,owner_id,title,mode) values('b1260000-0000-4000-8000-000000000011','b1260000-0000-4000-8000-000000000001','Allocation history fixture','software');
update public.app_settings set limits=limits||'{"globalByteLimitConfigured":true}';
-- Isolate the record-count guard from conservative 45 MB-per-upload reservations.
-- These synthetic allowances and all reservations are rolled back, with no media upload.
update public.usage_accounts set byte_limit=5000000000 where scope='global';
insert into public.usage_accounts(scope,owner_id,byte_limit,output_limit) values('user','b1260000-0000-4000-8000-000000000001',5000000000,3);
select set_config('request.jwt.claims','{"sub":"b1260000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$declare v jsonb;version integer;begin
 for i in 1..100 loop
  select draft_version into version from public.projects where id='b1260000-0000-4000-8000-000000000011';
  v:=public.reserve_source_upload('b1260000-0000-4000-8000-000000000011',version,'fixture-'||i,repeat('a',64),'tiny.png','image/png',1,'image');
  perform public.change_source_upload((v->>'uploadId')::uuid,'remove');
 end loop;
end $$;
select is((select count(*)::integer from public.upload_allocations where owner_id='b1260000-0000-4000-8000-000000000001'),100,'Removed tiny allocations still count toward metadata bound');
select throws_ok($$select public.reserve_source_upload('b1260000-0000-4000-8000-000000000011',(select draft_version from public.projects where id='b1260000-0000-4000-8000-000000000011'),'overflow',repeat('a',64),'tiny.png','image/png',1,'image')$$,'P0001',null::text,'Repeated add/remove cannot grow allocation records without bound');
select * from finish();rollback;
