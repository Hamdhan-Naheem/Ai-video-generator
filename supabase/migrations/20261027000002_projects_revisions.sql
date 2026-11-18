-- W-04: local application schema. Apply through versioned migrations.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create table public.projects (
id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete restrict, unique(id,owner_id),
title varchar(120) not null check(title=private.trim_text(title) and private.utf16_length(title) between 1 and 120),
mode text not null check (mode in ('education','software','branding')), draft_input jsonb not null default '{}'::jsonb check (private.bounded_object(draft_input)),
draft_state text not null default 'active' check(draft_state in ('active','removed')),
preferences jsonb not null default '{}' check(private.valid_preferences(preferences)),
draft_version integer not null default 1 check(draft_version>0), next_revision_number integer not null default 1 check(next_revision_number>0),
latest_ready_revision_id uuid, deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
check(draft_state <> 'removed' or draft_input='{}'::jsonb)
);
alter table public.projects enable row level security;
revoke all on public.projects from public, anon, authenticated;
grant all on public.projects to service_role;

create table public.revisions (
id uuid primary key default gen_random_uuid(), project_id uuid not null, owner_id uuid not null references public.profiles(id) on delete restrict, foreign key(project_id,owner_id) references public.projects(id,owner_id), unique(id,project_id,owner_id), revision_number integer not null check(revision_number>0),
parent_revision_id uuid, input_snapshot jsonb not null default '{}'::jsonb check (private.bounded_object(input_snapshot)), input_hash text not null check(input_hash ~ '^[0-9a-f]{64}$'), instruction varchar(4000),
request_kind text not null check (request_kind in ('initial','revise','regenerate','format')),
status text not null default 'pending' check(status in ('pending','processing','needs_input','failed','cancelled','ready','expired')),
target_seconds smallint not null check(target_seconds in (60,75,90)),
orientation text not null check (orientation in ('landscape','portrait')), voice_profile_id varchar(80) not null check(voice_profile_id ~ '^[a-zA-Z0-9][a-zA-Z0-9_-]*$'),
schema_version integer not null check(schema_version>0), prompt_version text not null, composition_version text not null,
selected_plan_id uuid, completed_at timestamptz, expires_at timestamptz, deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
unique(project_id,revision_number),
foreign key(parent_revision_id,project_id,owner_id) references public.revisions(id,project_id,owner_id),
check(parent_revision_id is distinct from id),
check((completed_at is null and expires_at is null) or (completed_at is not null and expires_at is not null and expires_at=completed_at+interval '7 days')),
check(status not in ('ready','expired') or completed_at is not null)
);
alter table public.revisions enable row level security;
revoke all on public.revisions from public, anon, authenticated;
grant all on public.revisions to service_role;

alter table public.projects add constraint projects_latest_revision_fk foreign key(latest_ready_revision_id,id,owner_id)
references public.revisions(id,project_id,owner_id) deferrable initially deferred;
create function private.project_visible(project uuid, actor uuid) returns boolean language sql stable security definer set search_path = '' as $$
select actor=(select auth.uid()) and private.active_user() and exists(select 1 from public.projects p where p.id=project and p.owner_id=actor and p.deleted_at is null)
$$;
grant execute on function private.project_visible(uuid,uuid) to authenticated;
create function private.guard_revision_input() returns trigger language plpgsql set search_path = '' as $$
begin
 if row(new.id,new.project_id,new.owner_id,new.revision_number,new.parent_revision_id,new.input_snapshot,new.input_hash,new.instruction,new.request_kind,new.target_seconds,new.orientation,new.voice_profile_id,new.schema_version,new.prompt_version,new.composition_version,new.created_at)
 is distinct from row(old.id,old.project_id,old.owner_id,old.revision_number,old.parent_revision_id,old.input_snapshot,old.input_hash,old.instruction,old.request_kind,old.target_seconds,old.orientation,old.voice_profile_id,old.schema_version,old.prompt_version,old.composition_version,old.created_at) then
 raise exception using errcode='23514',message='Revision request is immutable'; end if;
 if old.completed_at is not null and row(new.completed_at,new.expires_at) is distinct from row(old.completed_at,old.expires_at) then
 raise exception using errcode='23514',message='Revision retention is immutable'; end if;
 new.updated_at := now(); return new;
end $$;
create trigger revisions_immutable before update on public.revisions for each row execute function private.guard_revision_input();
create function private.guard_project() returns trigger language plpgsql set search_path = '' as $$
begin
 if row(new.id,new.owner_id,new.created_at) is distinct from row(old.id,old.owner_id,old.created_at) then raise exception using errcode='23514',message='Project identity is immutable'; end if;
 if new.mode<>old.mode and exists(select 1 from public.revisions where project_id=old.id) then raise exception using errcode='23514',message='Generated project mode is immutable'; end if;
 if row(new.title,new.mode,new.draft_input,new.preferences,new.draft_state) is distinct from row(old.title,old.mode,old.draft_input,old.preferences,old.draft_state) then
  new.draft_version:=old.draft_version+1;
 elsif new.draft_version<>old.draft_version then raise exception using errcode='23514',message='Draft version is server controlled'; end if;
 new.updated_at:=now(); return new;
end $$;
create trigger projects_guard before update on public.projects for each row execute function private.guard_project();
create index projects_owner_recent_idx on public.projects(owner_id,updated_at desc,id desc) where deleted_at is null;
create index revisions_owner_expiry_idx on public.revisions(owner_id,expires_at,id) where deleted_at is null and status='ready';
create index revisions_parent_idx on public.revisions(parent_revision_id,project_id,owner_id);

commit;
