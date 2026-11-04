-- W-04: local application schema. Apply through versioned migrations.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;
revoke create on schema public from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema private revoke execute on functions from public, anon, authenticated;
create function private.bounded_object(value jsonb) returns boolean language sql immutable set search_path = '' as $$
select jsonb_typeof(value) = 'object' and octet_length(value::text) <= 131072
$$;
create function private.trim_text(value text) returns text language sql immutable set search_path = '' as $$
select btrim(value,U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
$$;
create function private.utf16_length(value text) returns integer language sql immutable set search_path = '' as $$
select coalesce(sum(case when ascii(c)>65535 then 2 else 1 end),0)::integer from regexp_split_to_table(value,'') c
$$;
create function private.valid_preferences(value jsonb) returns boolean language sql immutable set search_path = '' as $$
select private.bounded_object(value)
and (value - array['targetSeconds','orientation','voiceProfileId']) = '{}'::jsonb
and (not value ? 'targetSeconds' or value->'targetSeconds' in ('60'::jsonb,'75'::jsonb,'90'::jsonb))
and (not value ? 'orientation' or value->'orientation' in ('"landscape"'::jsonb,'"portrait"'::jsonb))
and (not value ? 'voiceProfileId' or (jsonb_typeof(value->'voiceProfileId') = 'string'
  and value->>'voiceProfileId' ~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$'))
$$;
create table public.profiles (
id uuid primary key default gen_random_uuid(), display_name varchar(80) not null check(display_name=private.trim_text(display_name) and char_length(display_name) between 1 and 80),
role text not null default 'tester' check(role in ('tester','operator')),
status text not null default 'active' check(status in ('active','disabled','deleting')),
defaults jsonb not null default '{}' check(private.valid_preferences(defaults)),
settings_version integer not null default 1 check(settings_version>0), deletion_requested_at timestamptz,
email_ownership text not null default 'unknown' check(email_ownership in ('unknown','provider_verified')),
email_ownership_identity_id text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
foreign key(id) references auth.users(id) on delete restrict,
check((email_ownership='provider_verified') = (email_ownership_identity_id is not null))
);
alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant all on public.profiles to service_role;

create function private.create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
declare chosen_name text;
begin
  chosen_name := private.trim_text(coalesce(new.raw_user_meta_data->>'display_name',new.raw_user_meta_data->>'full_name',''));
  if char_length(chosen_name) not between 1 and 80 then chosen_name := 'New creator'; end if;
  insert into public.profiles(id,display_name) values(new.id,chosen_name);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.create_profile();
create function private.active_user() returns boolean language sql stable security definer set search_path = '' as $$
select exists(select 1 from public.profiles where id=(select auth.uid()) and status='active')
$$;
grant execute on function private.active_user() to authenticated;
create table public.oauth_flows (
id uuid primary key default gen_random_uuid(), owner_id uuid references public.profiles(id), initiating_session_id uuid,
flow_kind text not null check (flow_kind in ('login','reauthenticate')), state_hash text not null unique check(state_hash ~ '^[0-9a-f]{64}$'),
provider text not null check(provider='google'), action text check(action='delete_account'), expected_identity_id text,
return_path text not null check(return_path in ('/dashboard','/create','/videos','/settings')),
status text not null default 'pending' check(status in ('pending','completed','failed','consumed')),
expires_at timestamptz not null, completed_at timestamptz, created_at timestamptz not null default now(),
check(expires_at>created_at and expires_at<=created_at+interval '5 minutes'),
check((flow_kind='reauthenticate' and owner_id is not null and initiating_session_id is not null and action is not null and expected_identity_id is not null)
or (flow_kind='login' and owner_id is null and initiating_session_id is null and action is null and expected_identity_id is null)),
unique(id,owner_id,initiating_session_id,action)
);
alter table public.oauth_flows enable row level security;
revoke all on public.oauth_flows from public, anon, authenticated;
grant all on public.oauth_flows to service_role;

create table public.action_grants (
id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete restrict, session_id uuid not null, action text not null check(action='delete_account'),
token_hash text not null unique check(token_hash ~ '^[0-9a-f]{64}$'), expires_at timestamptz not null, consumed_at timestamptz,
method text not null check (method in ('password','google')), oauth_flow_id uuid, created_at timestamptz not null default now(),
check(expires_at>created_at and expires_at<=created_at+interval '5 minutes'),
check((method='google')=(oauth_flow_id is not null)),
foreign key(oauth_flow_id,owner_id,session_id,action) references public.oauth_flows(id,owner_id,initiating_session_id,action)
);
alter table public.action_grants enable row level security;
revoke all on public.action_grants from public, anon, authenticated;
grant all on public.action_grants to service_role;

create table public.account_deletions (
id uuid primary key default gen_random_uuid(), owner_id uuid unique references public.profiles(id) on delete set null,
status text not null default 'requested' check(status in ('requested','cancelling','cleaning','purging','completed','blocked')),
requested_at timestamptz not null default now(), completed_at timestamptz, safe_error_code text,
check((status='completed')=(completed_at is not null))
);
alter table public.account_deletions enable row level security;
revoke all on public.account_deletions from public, anon, authenticated;
grant all on public.account_deletions to service_role;

create index oauth_expiry_idx on public.oauth_flows(status,expires_at);
create index oauth_owner_idx on public.oauth_flows(owner_id,created_at desc);
create index action_grants_expiry_idx on public.action_grants(owner_id,expires_at);

commit;
