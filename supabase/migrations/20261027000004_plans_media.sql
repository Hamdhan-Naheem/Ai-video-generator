-- W-04: local application schema. Apply through versioned migrations.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create table public.plan_versions (
id uuid primary key default gen_random_uuid(), project_id uuid not null, owner_id uuid not null references public.profiles(id) on delete restrict, foreign key(project_id,owner_id) references public.projects(id,owner_id), unique(id,project_id,owner_id), revision_id uuid not null, foreign key(revision_id,project_id,owner_id) references public.revisions(id,project_id,owner_id), version integer not null check(version>0), dependency_hash text not null check(dependency_hash ~ '^[0-9a-f]{64}$'),
status text not null check (status in ('candidate','validated','rejected')), model_id text not null, prompt_version text not null,
source_inventory jsonb not null default '{}'::jsonb check (private.bounded_object(source_inventory)), validation_summary jsonb not null default '{}'::jsonb check (private.bounded_object(validation_summary)), created_by_job_id uuid not null, created_at timestamptz not null default now(),
unique(revision_id,version), unique(id,revision_id,project_id,owner_id),
foreign key(created_by_job_id,revision_id,project_id,owner_id) references public.jobs(id,revision_id,project_id,owner_id)
);
alter table public.plan_versions enable row level security;
revoke all on public.plan_versions from public, anon, authenticated;
grant all on public.plan_versions to service_role;

alter table public.revisions add constraint revisions_plan_fk foreign key(selected_plan_id,id,project_id,owner_id) references public.plan_versions(id,revision_id,project_id,owner_id);
create table public.scenes (
id uuid primary key default gen_random_uuid(), project_id uuid not null, owner_id uuid not null references public.profiles(id) on delete restrict, foreign key(project_id,owner_id) references public.projects(id,owner_id), unique(id,project_id,owner_id), revision_id uuid not null, foreign key(revision_id,project_id,owner_id) references public.revisions(id,project_id,owner_id), plan_id uuid not null, ordinal smallint not null check(ordinal between 0 and 5), narration text not null check(octet_length(narration)<=32768),
visual jsonb not null default '{}'::jsonb check (private.bounded_object(visual)), evidence jsonb not null default '{}'::jsonb check (private.bounded_object(evidence)), script_hash text not null check(script_hash ~ '^[0-9a-f]{64}$'), created_at timestamptz not null default now(),
unique(plan_id,ordinal), unique(id,plan_id,revision_id,project_id,owner_id),
foreign key(plan_id,revision_id,project_id,owner_id) references public.plan_versions(id,revision_id,project_id,owner_id)
);
alter table public.scenes enable row level security;
revoke all on public.scenes from public, anon, authenticated;
grant all on public.scenes to service_role;

create table public.assets (
id uuid primary key default gen_random_uuid(), project_id uuid not null, owner_id uuid not null references public.profiles(id) on delete restrict, foreign key(project_id,owner_id) references public.projects(id,owner_id), unique(id,project_id,owner_id), creator_job_id uuid, producing_lease_token bigint check(producing_lease_token>0), client_artifact_key varchar(120),
kind text not null check (kind in ('source_image','source_recording','normalized_image','frame','audio','alignment','captions_srt','captions_vtt','mouth_cues','timeline','thumbnail','video','report')),
bucket text not null check(bucket in ('sources','artifacts')), object_key text not null,
state text not null default 'allocated' check(state in ('allocated','received','validated','available','rejected','expired','deleting','deleted')),
declared_mime text, original_filename varchar(255), detected_mime text, declared_bytes bigint check(declared_bytes>0), byte_size bigint check(byte_size>=0),
checksum text check(checksum ~ '^[0-9a-f]{64}$'), width integer check(width>0), height integer check(height>0), duration_ms bigint check(duration_ms>=0),
received_at timestamptz, validated_at timestamptz, published_at timestamptz, expires_at timestamptz, deleted_at timestamptz,
provider_metadata jsonb not null default '{}'::jsonb check (private.bounded_object(provider_metadata)), safe_error_code text, safe_message varchar(500), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(bucket,object_key),
unique(creator_job_id,producing_lease_token,client_artifact_key),
foreign key(creator_job_id,project_id,owner_id) references public.jobs(id,project_id,owner_id),
foreign key(creator_job_id,producing_lease_token) references public.job_runs(job_id,lease_token),
check((creator_job_id is null and producing_lease_token is null and client_artifact_key is null) or
(creator_job_id is not null and producing_lease_token is not null and client_artifact_key is not null)),
check(object_key ~ ('^'||owner_id::text||'/'||project_id::text||'/'||id::text||'/[a-zA-Z0-9_-]+[.][a-zA-Z0-9]+$')),
check(state not in ('received','validated','available') or (received_at is not null and byte_size is not null)),
check(state not in ('validated','available') or (validated_at is not null and checksum is not null and detected_mime is not null))
);
alter table public.assets enable row level security;
revoke all on public.assets from public, anon, authenticated;
grant all on public.assets to service_role;

create table public.upload_allocations (
id uuid primary key default gen_random_uuid(), project_id uuid not null, owner_id uuid not null references public.profiles(id) on delete restrict, foreign key(project_id,owner_id) references public.projects(id,owner_id), unique(id,project_id,owner_id), asset_id uuid not null unique, reservation_id uuid not null unique,
expected_bytes bigint not null check(expected_bytes between 1 and 45000000), expected_mime text not null,
source_role text not null check (source_role in ('image','recording','logo')), protocol text not null check (protocol in ('standard','tus')),
state text not null default 'allocated' check(state in ('allocated','received','rejected','abandoned')),
expires_at timestamptz not null, completed_at timestamptz, created_at timestamptz not null default now(),
foreign key(asset_id,project_id,owner_id) references public.assets(id,project_id,owner_id),
check(expires_at>created_at),
check((source_role='recording' and expected_mime in ('video/mp4','video/webm')) or
(source_role in ('image','logo') and expected_bytes<=5000000 and expected_mime in ('image/png','image/jpeg','image/webp')))
);
alter table public.upload_allocations enable row level security;
revoke all on public.upload_allocations from public, anon, authenticated;
grant all on public.upload_allocations to service_role;

create table public.checkpoints (
id uuid primary key default gen_random_uuid(), project_id uuid not null, owner_id uuid not null references public.profiles(id) on delete restrict, foreign key(project_id,owner_id) references public.projects(id,owner_id), unique(id,project_id,owner_id), revision_id uuid not null, foreign key(revision_id,project_id,owner_id) references public.revisions(id,project_id,owner_id), job_id uuid not null,
stage text not null check (stage in ('understand','story','voice','render')), unit_key varchar(100) not null,
dependency_hash text not null check(dependency_hash ~ '^[0-9a-f]{64}$'), producer_version text not null,
state text not null default 'complete' check(state in ('complete','invalid')), manifest jsonb not null default '{}'::jsonb check (private.bounded_object(manifest)), producing_lease_token bigint not null check(producing_lease_token>0),
source_checkpoint_id uuid, created_at timestamptz not null default now(), unique(job_id,stage,unit_key,dependency_hash), unique(id,job_id,revision_id,project_id,owner_id),
foreign key(job_id,revision_id,project_id,owner_id) references public.jobs(id,revision_id,project_id,owner_id),
foreign key(job_id,producing_lease_token) references public.job_runs(job_id,lease_token),
foreign key(source_checkpoint_id,project_id,owner_id) references public.checkpoints(id,project_id,owner_id), check(source_checkpoint_id is distinct from id)
);
alter table public.checkpoints enable row level security;
revoke all on public.checkpoints from public, anon, authenticated;
grant all on public.checkpoints to service_role;

create table public.revision_assets (
revision_id uuid not null, asset_id uuid not null, project_id uuid not null, owner_id uuid not null,
purpose text not null check (purpose in ('input','normalized','plan_dependency','published','intermediate')), retain_until timestamptz not null, created_at timestamptz not null default now(), primary key(revision_id,asset_id,purpose),
foreign key(revision_id,project_id,owner_id) references public.revisions(id,project_id,owner_id),
foreign key(asset_id,project_id,owner_id) references public.assets(id,project_id,owner_id)
);
alter table public.revision_assets enable row level security;
revoke all on public.revision_assets from public, anon, authenticated;
grant all on public.revision_assets to service_role;

create table public.checkpoint_assets (
checkpoint_id uuid not null, asset_id uuid not null, job_id uuid not null, revision_id uuid not null, project_id uuid not null, owner_id uuid not null,
role text not null, dependency_hash text not null check(dependency_hash ~ '^[0-9a-f]{64}$'), created_at timestamptz not null default now(), primary key(checkpoint_id,asset_id),
foreign key(checkpoint_id,job_id,revision_id,project_id,owner_id) references public.checkpoints(id,job_id,revision_id,project_id,owner_id),
foreign key(asset_id,project_id,owner_id) references public.assets(id,project_id,owner_id)
);
alter table public.checkpoint_assets enable row level security;
revoke all on public.checkpoint_assets from public, anon, authenticated;
grant all on public.checkpoint_assets to service_role;

create table public.exports (
id uuid primary key default gen_random_uuid(), project_id uuid not null, owner_id uuid not null references public.profiles(id) on delete restrict, foreign key(project_id,owner_id) references public.projects(id,owner_id), unique(id,project_id,owner_id), revision_id uuid not null, foreign key(revision_id,project_id,owner_id) references public.revisions(id,project_id,owner_id), variant text not null check (variant in ('clean','burned')),
state text not null default 'pending' check(state in ('pending','rendering','ready','failed','expired')), job_id uuid not null,
video_asset_id uuid, thumbnail_asset_id uuid, vtt_asset_id uuid, srt_asset_id uuid, verification_asset_id uuid,
ready_at timestamptz, expires_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(revision_id,variant), unique(id,revision_id,project_id,owner_id),
foreign key(job_id,revision_id,project_id,owner_id) references public.jobs(id,revision_id,project_id,owner_id),
foreign key(video_asset_id,project_id,owner_id) references public.assets(id,project_id,owner_id),
foreign key(thumbnail_asset_id,project_id,owner_id) references public.assets(id,project_id,owner_id),
foreign key(vtt_asset_id,project_id,owner_id) references public.assets(id,project_id,owner_id),
foreign key(srt_asset_id,project_id,owner_id) references public.assets(id,project_id,owner_id),
foreign key(verification_asset_id,project_id,owner_id) references public.assets(id,project_id,owner_id),
check(state<>'ready' or (ready_at is not null and expires_at is not null and video_asset_id is not null and verification_asset_id is not null
and (variant='burned' or (thumbnail_asset_id is not null and vtt_asset_id is not null and srt_asset_id is not null))))
);
alter table public.exports enable row level security;
revoke all on public.exports from public, anon, authenticated;
grant all on public.exports to service_role;

alter table public.jobs add constraint jobs_export_fk foreign key(export_id,revision_id,project_id,owner_id) references public.exports(id,revision_id,project_id,owner_id) deferrable initially deferred;
create table public.scene_timings (
job_id uuid not null, checkpoint_id uuid not null, scene_id uuid not null, plan_id uuid not null,
revision_id uuid not null, project_id uuid not null, owner_id uuid not null, primary key(job_id,checkpoint_id,scene_id),
start_frame integer not null check(start_frame>=0), duration_frames integer not null check(duration_frames>0),
audio_asset_id uuid not null, captions_asset_id uuid not null, mouth_cues_asset_id uuid, measured_audio_ms bigint not null check(measured_audio_ms>0),
foreign key(checkpoint_id,job_id,revision_id,project_id,owner_id) references public.checkpoints(id,job_id,revision_id,project_id,owner_id),
foreign key(scene_id,plan_id,revision_id,project_id,owner_id) references public.scenes(id,plan_id,revision_id,project_id,owner_id),
foreign key(audio_asset_id,project_id,owner_id) references public.assets(id,project_id,owner_id),
foreign key(captions_asset_id,project_id,owner_id) references public.assets(id,project_id,owner_id),
foreign key(mouth_cues_asset_id,project_id,owner_id) references public.assets(id,project_id,owner_id)
);
alter table public.scene_timings enable row level security;
revoke all on public.scene_timings from public, anon, authenticated;
grant all on public.scene_timings to service_role;

create index assets_project_idx on public.assets(project_id,owner_id,state);
create index assets_creator_idx on public.assets(creator_job_id,producing_lease_token);
create index uploads_expiry_idx on public.upload_allocations(expires_at) where state='allocated';
create index revision_assets_asset_idx on public.revision_assets(asset_id,revision_id);
create index checkpoint_assets_asset_idx on public.checkpoint_assets(asset_id,checkpoint_id);

commit;
