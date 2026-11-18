-- W-04: local application schema. Apply through versioned migrations.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
create function private.valid_progress(value jsonb) returns boolean language plpgsql immutable set search_path = '' as $$
begin
 if not private.bounded_object(value) or not value ?& array['completedScenes','totalScenes'] or (value-array['completedScenes','totalScenes'])<>'{}'::jsonb then return false; end if;
 if jsonb_typeof(value->'completedScenes')<>'number' or (value->>'completedScenes') !~ '^[0-6]$' then return false; end if;
 if value->'totalScenes'='null'::jsonb then return (value->>'completedScenes')::integer=0; end if;
 return coalesce(value->'totalScenes' in ('4'::jsonb,'5'::jsonb,'6'::jsonb) and (value->>'completedScenes')::integer <= (value->>'totalScenes')::integer,false);
exception when others then return false;
end $$;

create table public.workers (
id uuid primary key default gen_random_uuid(), label varchar(80) not null, enabled boolean not null default false,
protocol_version integer not null check(protocol_version>0), capabilities jsonb not null default '{}'::jsonb check (private.bounded_object(capabilities)), last_seen_at timestamptz, health jsonb not null default '{}'::jsonb check (private.bounded_object(health)), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.workers enable row level security;
revoke all on public.workers from public, anon, authenticated;
grant all on public.workers to service_role;

create table public.worker_credentials (
id uuid primary key default gen_random_uuid(), worker_id uuid not null references public.workers(id), token_hash text not null unique check(token_hash ~ '^[0-9a-f]{64}$'),
expires_at timestamptz not null, revoked_at timestamptz, last_used_at timestamptz, created_at timestamptz not null default now(), check(expires_at>created_at)
);
alter table public.worker_credentials enable row level security;
revoke all on public.worker_credentials from public, anon, authenticated;
grant all on public.worker_credentials to service_role;

create table public.jobs (
id uuid primary key default gen_random_uuid(), project_id uuid not null, owner_id uuid not null references public.profiles(id) on delete restrict, foreign key(project_id,owner_id) references public.projects(id,owner_id), unique(id,project_id,owner_id), revision_id uuid not null, foreign key(revision_id,project_id,owner_id) references public.revisions(id,project_id,owner_id), kind text not null check (kind in ('generation','caption_export')), export_id uuid,
status text not null default 'queued' check(status in ('queued','waiting_worker','running','waiting_quota','needs_input','cancel_requested','cancelled','failed','succeeded')),
stage text not null default 'understand' check(stage in ('understand','story','voice','render')), available_at timestamptz not null default now(),
worker_id uuid references public.workers(id), lease_token bigint not null default 0 check(lease_token>=0), lease_expires_at timestamptz, last_heartbeat_at timestamptz,
cancel_requested_at timestamptz, started_at timestamptz, finished_at timestamptz,
attempt_count integer not null default 0 check(attempt_count>=0), provider_attempt_count integer not null default 0 check(provider_attempt_count>=0),
repair_count integer not null default 0 check(repair_count between 0 and 2), active_ms bigint not null default 0 check(active_ms>=0),
event_sequence bigint not null default 0 check(event_sequence>=0), safe_error_code text, safe_message varchar(500), retry_at timestamptz,
budget_snapshot jsonb not null default '{}'::jsonb check (private.bounded_object(budget_snapshot)), protocol_version integer not null default 1 check(protocol_version>0),
progress jsonb not null default '{"completedScenes":0,"totalScenes":null}' check(private.valid_progress(progress)),
completion_key varchar(128), completion_manifest_hash text check(completion_manifest_hash ~ '^[0-9a-f]{64}$'), last_failure_key varchar(128),
created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,revision_id,project_id,owner_id),
check((kind='caption_export')=(export_id is not null)),
check((worker_id is null)=(lease_expires_at is null)),
check(status<>'running' or (worker_id is not null and lease_token>0 and last_heartbeat_at is not null)),
check(status in ('running','cancel_requested') or worker_id is null),
check((completion_key is null)=(completion_manifest_hash is null))
);
alter table public.jobs enable row level security;
revoke all on public.jobs from public, anon, authenticated;
grant all on public.jobs to service_role;

create table public.worker_slots (
slot_name text primary key check(slot_name='processing'), job_id uuid unique references public.jobs(id), worker_id uuid references public.workers(id),
lease_token bigint check(lease_token>0), lease_expires_at timestamptz,
check((job_id is null and worker_id is null and lease_token is null and lease_expires_at is null) or
(job_id is not null and worker_id is not null and lease_token is not null and lease_expires_at is not null))
);
alter table public.worker_slots enable row level security;
revoke all on public.worker_slots from public, anon, authenticated;
grant all on public.worker_slots to service_role;

create table public.job_runs (
id uuid primary key default gen_random_uuid(), job_id uuid not null references public.jobs(id), attempt_number integer not null check(attempt_number>0),
worker_id uuid not null references public.workers(id), lease_token bigint not null check(lease_token>0), started_at timestamptz not null default now(), ended_at timestamptz,
outcome text not null default 'active' check(outcome in ('active','succeeded','failed','cancelled','lease_lost')), active_ms bigint not null default 0 check(active_ms>=0),
unique(job_id,attempt_number), unique(job_id,lease_token), unique(id,job_id), check(ended_at is null or ended_at>=started_at)
);
alter table public.job_runs enable row level security;
revoke all on public.job_runs from public, anon, authenticated;
grant all on public.job_runs to service_role;

create table public.provider_attempts (
id uuid primary key default gen_random_uuid(), job_id uuid not null references public.jobs(id), run_id uuid not null,
operation_key varchar(120) not null, operation_attempt integer not null check(operation_attempt>0), dispatch_nonce uuid not null unique,
provider text not null, model_id text not null, voice_id text, request_hash text not null check(request_hash ~ '^[0-9a-f]{64}$'),
status text not null check (status in ('reserved','dispatched','succeeded','failed','outcome_unknown','not_sent')), provider_request_id text, usage jsonb check(private.bounded_object(usage)),
started_at timestamptz not null default now(), finished_at timestamptz, safe_error_code text,
unique(job_id,operation_key,operation_attempt), foreign key(run_id,job_id) references public.job_runs(id,job_id)
);
alter table public.provider_attempts enable row level security;
revoke all on public.provider_attempts from public, anon, authenticated;
grant all on public.provider_attempts to service_role;

create table public.job_events (
job_id uuid not null references public.jobs(id), sequence bigint not null check(sequence>0), primary key(job_id,sequence),
stage text not null check (stage in ('understand','story','voice','render')), code text not null, safe_message varchar(500) not null, details jsonb not null default '{}'::jsonb check (private.bounded_object(details)),
run_id uuid, event_key varchar(120), created_at timestamptz not null default now(), foreign key(run_id,job_id) references public.job_runs(id,job_id), check(event_key is null or run_id is not null)
);
alter table public.job_events enable row level security;
revoke all on public.job_events from public, anon, authenticated;
grant all on public.job_events to service_role;

create table public.job_repairs (
id uuid primary key default gen_random_uuid(), job_id uuid not null references public.jobs(id), repair_key varchar(120) not null, stage text not null check (stage in ('understand','story','voice','render')),
reason_code text not null, lease_token bigint not null check(lease_token>0), created_at timestamptz not null default now(), unique(job_id,repair_key)
);
alter table public.job_repairs enable row level security;
revoke all on public.job_repairs from public, anon, authenticated;
grant all on public.job_repairs to service_role;

create table public.job_terminal_operations (
id uuid primary key default gen_random_uuid(), job_id uuid not null references public.jobs(id), operation_key varchar(128) not null,
kind text not null check (kind in ('fail','cancel_ack','complete')), request_hash text not null check(request_hash ~ '^[0-9a-f]{64}$'), safe_result jsonb not null default '{}'::jsonb check (private.bounded_object(safe_result)), created_at timestamptz not null default now(), unique(job_id,kind,operation_key)
);
alter table public.job_terminal_operations enable row level security;
revoke all on public.job_terminal_operations from public, anon, authenticated;
grant all on public.job_terminal_operations to service_role;

create table public.app_settings (
id text primary key check(id='global'), generation_paused boolean not null default true, claims_paused boolean not null default true,
limits jsonb not null default '{}'::jsonb check (private.bounded_object(limits)), version integer not null default 1 check(version>0), updated_by uuid references public.profiles(id) on delete set null, updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
revoke all on public.app_settings from public, anon, authenticated;
grant all on public.app_settings to service_role;

create table public.provider_health (
provider text not null, model_id text not null, primary key(provider,model_id),
state text not null check (state in ('available','quota_wait','config_error','unavailable','unknown')), retry_at timestamptz, observed_at timestamptz not null default now(), safe_reason varchar(500)
);
alter table public.provider_health enable row level security;
revoke all on public.provider_health from public, anon, authenticated;
grant all on public.provider_health to service_role;

create unique index jobs_one_active_owner_uq on public.jobs(owner_id) where status in ('queued','waiting_worker','running','waiting_quota','cancel_requested');
create unique index jobs_generation_revision_uq on public.jobs(revision_id) where kind='generation';
create unique index jobs_caption_export_uq on public.jobs(export_id) where kind='caption_export';
create index jobs_claim_idx on public.jobs(available_at,created_at,id) where status in ('queued','waiting_worker');
create index jobs_project_idx on public.jobs(project_id,owner_id);
create unique index job_events_replay_uq on public.job_events(job_id,run_id,event_key) where event_key is not null;

commit;
