begin;
set local lock_timeout='5s';set local statement_timeout='60s';
-- A tiny file reservation must not permit unlimited add/remove metadata rows.
create function private.guard_upload_metadata() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.profiles where id=new.owner_id for update;
 if (select count(*) from public.upload_allocations where owner_id=new.owner_id)>=100 then raise exception using errcode='P0001',message='Upload metadata capacity reached';end if;
 return new;
end $$;
revoke all on function private.guard_upload_metadata() from public,anon,authenticated;
create trigger upload_metadata_limit before insert on public.upload_allocations for each row execute function private.guard_upload_metadata();
commit;
