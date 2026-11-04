-- W-04: local application schema. Apply through versioned migrations.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
alter table public.jobs add constraint jobs_owner_uq unique(id,owner_id);
alter table public.upload_allocations add constraint uploads_owner_uq unique(id,owner_id);

create table public.usage_accounts (
id uuid primary key default gen_random_uuid(), scope text not null check (scope in ('global','user')), owner_id uuid unique references public.profiles(id),
used_bytes bigint not null default 0 check(used_bytes>=0), reserved_bytes bigint not null default 0 check(reserved_bytes>=0),
retained_outputs integer not null default 0 check(retained_outputs>=0), reserved_outputs integer not null default 0 check(reserved_outputs>=0),
byte_limit bigint not null check(byte_limit>=0), output_limit integer check(output_limit>=0), updated_at timestamptz not null default now(), check((scope='user')=(owner_id is not null))
);
alter table public.usage_accounts enable row level security;
revoke all on public.usage_accounts from public, anon, authenticated;
grant all on public.usage_accounts to service_role;

create unique index usage_global_uq on public.usage_accounts(scope) where scope='global';
create table public.usage_reservations (
id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete restrict, job_id uuid, upload_allocation_id uuid, kind text not null check (kind in ('source','generation','export')),
bytes_remaining bigint not null check(bytes_remaining>=0), output_slots_remaining integer not null check(output_slots_remaining between 0 and 1),
state text not null default 'reserved' check(state in ('reserved','committed','released')), expires_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,owner_id),
check((kind='source' and upload_allocation_id is not null and job_id is null and output_slots_remaining=0) or
(kind in ('generation','export') and job_id is not null and upload_allocation_id is null)),
check(kind<>'export' or output_slots_remaining=0),
foreign key(job_id,owner_id) references public.jobs(id,owner_id),
foreign key(upload_allocation_id,owner_id) references public.upload_allocations(id,owner_id)
);
alter table public.usage_reservations enable row level security;
revoke all on public.usage_reservations from public, anon, authenticated;
grant all on public.usage_reservations to service_role;

create table public.usage_ledger (
id uuid primary key default gen_random_uuid(), operation_key varchar(128) not null unique, owner_id uuid references public.profiles(id), asset_id uuid references public.assets(id),
reservation_id uuid references public.usage_reservations(id), used_bytes_delta bigint not null, reserved_bytes_delta bigint not null,
retained_outputs_delta integer not null, reserved_outputs_delta integer not null, reason text not null, created_at timestamptz not null default now()
);
alter table public.usage_ledger enable row level security;
revoke all on public.usage_ledger from public, anon, authenticated;
grant all on public.usage_ledger to service_role;

create table public.cleanup_tasks (
id uuid primary key default gen_random_uuid(), asset_id uuid references public.assets(id) on delete set null, bucket text not null check(bucket in ('sources','artifacts')), object_key text not null,
owner_id uuid references public.profiles(id) on delete set null, reason text not null,
state text not null default 'pending' check(state in ('pending','running','retry','done','blocked')), attempt_count integer not null default 0 check(attempt_count>=0),
next_attempt_at timestamptz not null default now(), lease_token bigint not null default 0 check(lease_token>=0), lease_expires_at timestamptz,
worker_id uuid references public.workers(id), safe_error_code text, completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
check((state='done')=(completed_at is not null)), check(state<>'running' or (worker_id is not null and lease_token>0 and lease_expires_at is not null))
);
alter table public.cleanup_tasks enable row level security;
revoke all on public.cleanup_tasks from public, anon, authenticated;
grant all on public.cleanup_tasks to service_role;

create table public.rate_limit_windows (
scope_hash text not null check(scope_hash ~ '^[0-9a-f]{64}$'), action text not null, window_start timestamptz not null,
primary key(scope_hash,action,window_start), count integer not null check(count>=0), expires_at timestamptz not null check(expires_at>window_start)
);
alter table public.rate_limit_windows enable row level security;
revoke all on public.rate_limit_windows from public, anon, authenticated;
grant all on public.rate_limit_windows to service_role;

create table public.operator_audit (
id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles(id) on delete set null, action text not null, resource_type text not null,
resource_id uuid, safe_metadata jsonb not null default '{}'::jsonb check (private.bounded_object(safe_metadata)), created_at timestamptz not null default now()
);
alter table public.operator_audit enable row level security;
revoke all on public.operator_audit from public, anon, authenticated;
grant all on public.operator_audit to service_role;

create table public.idempotency_requests (
id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete restrict, operation varchar(120) not null, key varchar(128) not null,
request_hash text not null check(request_hash ~ '^[0-9a-f]{64}$'), resource_type text not null, resource_id uuid not null,
response_status smallint not null check(response_status between 200 and 599), safe_response jsonb not null default '{}'::jsonb check (private.bounded_object(safe_response)), created_at timestamptz not null default now(), unique(owner_id,operation,key)
);
alter table public.idempotency_requests enable row level security;
revoke all on public.idempotency_requests from public, anon, authenticated;
grant all on public.idempotency_requests to service_role;

alter table public.upload_allocations add constraint uploads_reservation_fk foreign key(reservation_id,owner_id) references public.usage_reservations(id,owner_id) deferrable initially deferred;
create unique index reservations_job_uq on public.usage_reservations(job_id) where job_id is not null;
create unique index reservations_upload_uq on public.usage_reservations(upload_allocation_id) where upload_allocation_id is not null;
create unique index cleanup_live_key_uq on public.cleanup_tasks(bucket,object_key) where state in ('pending','running','retry','blocked');
create index cleanup_due_idx on public.cleanup_tasks(next_attempt_at,id) where state in ('pending','retry');
create index rate_limit_expiry_idx on public.rate_limit_windows(expires_at);
create index usage_ledger_owner_idx on public.usage_ledger(owner_id,created_at);

commit;
