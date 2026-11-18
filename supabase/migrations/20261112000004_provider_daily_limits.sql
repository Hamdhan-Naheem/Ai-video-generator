begin;
set local lock_timeout='5s';set local statement_timeout='60s';
-- Independent of jobs/receipts: deleting a result never replenishes this budget.
create table private.provider_daily_usage(
 day date not null, scope_key text not null check(scope_key='global' or scope_key ~ '^[a-f0-9-]{36}$'),
 attempts integer not null check(attempts>=0),primary key(day,scope_key)
);
alter table private.provider_daily_usage enable row level security;
revoke all on private.provider_daily_usage from public,anon,authenticated;
-- Include today's previous dispatches rather than silently resetting real usage.
insert into private.provider_daily_usage(day,scope_key,attempts)
select (clock_timestamp() at time zone 'UTC')::date,'global',count(*)::integer from public.provider_attempts where started_at>=date_trunc('day',clock_timestamp() at time zone 'UTC') at time zone 'UTC';
insert into private.provider_daily_usage(day,scope_key,attempts)
select (clock_timestamp() at time zone 'UTC')::date,j.owner_id::text,count(*)::integer from public.provider_attempts a join public.jobs j on j.id=a.job_id
where a.started_at>=date_trunc('day',clock_timestamp() at time zone 'UTC') at time zone 'UTC' group by j.owner_id;

create function private.provider_daily_available(actor uuid) returns boolean language sql stable security definer set search_path='' as $$
 select actor is not null and coalesce((select attempts from private.provider_daily_usage where day=(clock_timestamp() at time zone 'UTC')::date and scope_key='global'),0)<24
 and coalesce((select attempts from private.provider_daily_usage where day=(clock_timestamp() at time zone 'UTC')::date and scope_key=actor::text),0)<12
$$;
revoke all on function private.provider_daily_available(uuid) from public,anon,authenticated;

create function private.guard_provider_daily_usage() returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid; today date:=(clock_timestamp() at time zone 'UTC')::date; g integer; u integer;
begin
 select owner_id into actor from public.jobs where id=new.job_id;
 if actor is null then raise exception using errcode='23503',message='Job unavailable';end if;
 -- Match the established global-first lock order before touching counter rows.
 perform 1 from public.usage_accounts where scope='global' for update;
 insert into private.provider_daily_usage values(today,'global',0) on conflict do nothing;
 select attempts into g from private.provider_daily_usage where day=today and scope_key='global' for update;
 insert into private.provider_daily_usage values(today,actor::text,0) on conflict do nothing;
 select attempts into u from private.provider_daily_usage where day=today and scope_key=actor::text for update;
 if g>=24 or u>=12 then raise exception using errcode='P1604',message='Daily provider allowance reached';end if;
 update private.provider_daily_usage set attempts=attempts+1 where day=today and scope_key in ('global',actor::text);
 delete from private.provider_daily_usage where day<today-8;
 new.started_at:=clock_timestamp();
 return new;
end $$;
revoke all on function private.guard_provider_daily_usage() from public,anon,authenticated;
create trigger provider_daily_dispatch before insert on public.provider_attempts for each row execute function private.guard_provider_daily_usage();

create function private.guard_generation_daily_admission() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.kind='generation' and not private.provider_daily_available(new.owner_id) then raise exception using errcode='P1604',message='Daily provider allowance reached';end if;
 return new;
end $$;
revoke all on function private.guard_generation_daily_admission() from public,anon,authenticated;
create trigger generation_daily_admission before insert on public.jobs for each row execute function private.guard_generation_daily_admission();

-- Preserve the complete current recovery validator, adding only the final window gate.
do $migration$
declare definition text; anchor text:=E' return ''retry'';\nend';
begin
 definition:=pg_get_functiondef('private.generation_recovery_reason(public.jobs)'::regprocedure);
 if position(anchor in definition)=0 then raise exception 'Missing recovery validator anchor';end if;
 execute replace(definition,anchor,E' if not private.provider_daily_available(j.owner_id) then return ''daily_limit'';end if;\n return ''retry'';\nend');
end $migration$;
commit;
