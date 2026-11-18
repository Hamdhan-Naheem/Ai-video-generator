begin;
set local lock_timeout='5s';set local statement_timeout='60s';
create function private.guard_revision_history() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.usage_accounts where scope='global' for update;
 perform 1 from public.profiles where id=new.owner_id for update;
 if (select count(*) from public.revisions where owner_id=new.owner_id)>=50 then raise exception using errcode='P2102',message='Generation history capacity reached';end if;
 return new;
end $$;
revoke all on function private.guard_revision_history() from public,anon,authenticated;
create trigger revision_history_limit before insert on public.revisions for each row execute function private.guard_revision_history();

create or replace function private.guard_generation_daily_admission() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.kind='generation' then
  perform 1 from public.usage_accounts where scope='global' for update;
  perform 1 from public.profiles where id=new.owner_id for update;
  if not private.provider_daily_available(new.owner_id) then raise exception using errcode='P1604',message='Daily provider allowance reached';end if;
  if (select count(*) from public.jobs where owner_id=new.owner_id and kind='generation' and created_at>=date_trunc('day',clock_timestamp() at time zone 'UTC') at time zone 'UTC')>=12 then raise exception using errcode='P2103',message='Daily generation admission reached';end if;
 end if;
 return new;
end $$;

-- Existing larger legacy payloads can still have their title/preferences edited;
-- new or changed payloads must satisfy the lower per-draft ceiling.
create or replace function private.guard_project_metadata() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if octet_length(new.draft_input::text)>65536 and (tg_op='INSERT' or new.draft_input is distinct from old.draft_input) then raise exception using errcode='22023',message='Draft metadata too large';end if;
 if tg_op='INSERT' then
  perform 1 from public.profiles where id=new.owner_id for update;
  if (select count(*) from public.projects where owner_id=new.owner_id)>=50
   or (new.deleted_at is null and new.draft_state='active' and (select count(*) from public.projects where owner_id=new.owner_id and deleted_at is null and draft_state='active')>=20) then raise exception using errcode='P2101',message='Project metadata capacity reached';end if;
 end if;
 return new;
end $$;
commit;
