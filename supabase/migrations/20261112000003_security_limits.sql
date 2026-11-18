begin;
set local lock_timeout='5s';set local statement_timeout='60s';

-- Server-only, shared pre-auth windows. HMAC identifiers, never email/IP strings.
create table private.auth_attempt_windows(
 kind text not null check(kind in ('global','subject','network')),
 identity_hash text not null check(identity_hash ~ '^[a-f0-9]{64}$'),
 attempts integer not null check(attempts between 1 and 241),
 expires_at timestamptz not null, primary key(kind,identity_hash)
);
alter table private.auth_attempt_windows enable row level security;
revoke all on private.auth_attempt_windows from public,anon,authenticated;
create index auth_attempt_windows_expiry_idx on private.auth_attempt_windows(expires_at);

create function public.consume_auth_attempt(subject_hash text,network_hash text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare stamp timestamptz:=clock_timestamp(); k text; ident text; maximum integer; c integer; expiry timestamptz; permitted boolean:=true; wait_seconds integer:=1;
begin
 if subject_hash is null or network_hash is null or subject_hash!~'^[a-f0-9]{64}$' or network_hash!~'^[a-f0-9]{64}$' then raise exception using errcode='22023',message='Invalid throttle identity';end if;
 perform pg_advisory_xact_lock(71120403);
 delete from private.auth_attempt_windows where expires_at<=stamp;
 -- Charge the global bucket first; saturation cannot allocate unbounded new identities.
 foreach k in array array['global','network','subject'] loop
  ident:=case k when 'global' then repeat('0',64) when 'network' then network_hash else subject_hash end;
  maximum:=case k when 'global' then 240 when 'network' then 60 else 8 end;
  insert into private.auth_attempt_windows as w(kind,identity_hash,attempts,expires_at) values(k,ident,1,stamp+interval '60 seconds')
   on conflict(kind,identity_hash) do update set attempts=least(w.attempts+1,241)
   returning attempts,expires_at into c,expiry;
  if c>maximum then permitted:=false;wait_seconds:=greatest(wait_seconds,ceil(extract(epoch from expiry-stamp))::integer);exit;end if;
 end loop;
 return jsonb_build_object('allowed',permitted,'retryAfterSeconds',case when permitted then 0 else wait_seconds end);
end $$;
revoke all on function public.consume_auth_attempt(text,text) from public,anon,authenticated;
grant execute on function public.consume_auth_attempt(text,text) to service_role;

-- All insert-capable RPCs share these guards, including the legacy primitive.
create function private.guard_project_metadata() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if octet_length(new.draft_input::text)>65536 then raise exception using errcode='22023',message='Draft metadata too large';end if;
 if tg_op='INSERT' then
  perform 1 from public.profiles where id=new.owner_id for update;
  if (select count(*) from public.projects where owner_id=new.owner_id)>=50
   or (new.deleted_at is null and new.draft_state='active' and (select count(*) from public.projects where owner_id=new.owner_id and deleted_at is null and draft_state='active')>=20) then
   raise exception using errcode='P2101',message='Project metadata capacity reached';
  end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_project_metadata() from public,anon,authenticated;
create trigger projects_metadata_limit before insert or update of draft_input on public.projects for each row execute function private.guard_project_metadata();

create function private.guard_create_receipts() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.operation='create_project_draft' then
  perform 1 from public.profiles where id=new.owner_id for update;
  if (select count(*) from public.idempotency_requests where owner_id=new.owner_id and operation='create_project_draft')>=50 then raise exception using errcode='P2101',message='Project receipt capacity reached';end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_create_receipts() from public,anon,authenticated;
create trigger project_receipt_limit before insert on public.idempotency_requests for each row execute function private.guard_create_receipts();
commit;
