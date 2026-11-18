-- This batch exposes reads only. User mutations will be introduced with their API features.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create function private.revision_visible(revision uuid, project uuid, actor uuid)
returns boolean language sql stable security definer set search_path = '' as $$
select private.project_visible(project,actor) and exists(
 select 1 from public.revisions r where r.id=revision and r.project_id=project and r.owner_id=actor
 and r.deleted_at is null and (r.expires_at is null or r.expires_at>now())
)
$$;
grant execute on function private.revision_visible(uuid,uuid,uuid) to authenticated;

create policy profiles_own_read on public.profiles for select to authenticated
using (id=(select auth.uid()) and private.active_user());
grant select(id,display_name,role,status,defaults,settings_version,created_at,updated_at) on public.profiles to authenticated;

create policy projects_own_read on public.projects for select to authenticated
using (owner_id=(select auth.uid()) and private.active_user() and deleted_at is null);
grant select on public.projects to authenticated;

create policy revisions_own_read on public.revisions for select to authenticated
using (private.revision_visible(id,project_id,owner_id));
grant select(id,project_id,owner_id,revision_number,parent_revision_id,request_kind,status,target_seconds,
orientation,voice_profile_id,completed_at,expires_at,deleted_at,created_at,updated_at) on public.revisions to authenticated;

create policy jobs_own_read on public.jobs for select to authenticated
using (private.revision_visible(revision_id,project_id,owner_id));
grant select(id,project_id,owner_id,revision_id,kind,status,stage,safe_error_code,safe_message,retry_at,
progress,event_sequence,created_at,updated_at) on public.jobs to authenticated;
create view public.job_summaries with(security_invoker=true) as
select id,project_id,owner_id,revision_id,kind,status,stage,safe_error_code,safe_message,retry_at,
progress,event_sequence,created_at,updated_at from public.jobs;
revoke all on public.job_summaries from public,anon,authenticated;
grant select on public.job_summaries to authenticated,service_role;

create policy events_own_read on public.job_events for select to authenticated
using (exists(select 1 from public.jobs j where j.id=job_id));
grant select(job_id,sequence,stage,code,safe_message,created_at) on public.job_events to authenticated;

create policy exports_own_read on public.exports for select to authenticated
using (private.revision_visible(revision_id,project_id,owner_id)
 and state='ready' and expires_at>now());
grant select(id,project_id,owner_id,revision_id,variant,state,ready_at,expires_at,created_at) on public.exports to authenticated;

-- No object URL/key read is granted to the browser. Only exact, short-lived upload allocations.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('sources','sources',false,45000000,array['image/png','image/jpeg','image/webp','video/mp4','video/webm']),
 ('artifacts','artifacts',false,52428800,array['video/mp4','image/png','image/jpeg','audio/wav','audio/mpeg','application/json','text/plain','text/vtt','application/x-subrip']);

create function private.can_upload(bucket_name text, key_name text)
returns boolean language sql stable security definer set search_path = '' as $$
select bucket_name='sources' and private.active_user() and exists(
 select 1 from public.upload_allocations u
 join public.assets a on (a.id,a.project_id,a.owner_id)=(u.asset_id,u.project_id,u.owner_id)
 join public.projects p on (p.id,p.owner_id)=(u.project_id,u.owner_id)
 join public.usage_reservations r on r.id=u.reservation_id and r.upload_allocation_id=u.id and r.owner_id=u.owner_id
 where u.owner_id=(select auth.uid()) and u.state='allocated' and u.expires_at>now()
 and a.bucket=bucket_name and a.object_key=key_name and a.state='allocated'
 and a.kind in ('source_image','source_recording') and a.declared_bytes=u.expected_bytes and a.declared_mime=u.expected_mime
 and p.deleted_at is null and p.draft_state='active'
 and r.state='reserved' and r.bytes_remaining>=u.expected_bytes
 and (r.expires_at is null or r.expires_at>now())
) and not exists(select 1 from storage.objects o where o.bucket_id=bucket_name and o.name=key_name)
$$;
grant execute on function private.can_upload(text,text) to authenticated;
create policy exact_source_allocation_insert on storage.objects for insert to authenticated
with check (private.can_upload(bucket_id,name));
-- Revoke application-issued grants. Supabase's storage role retains its own managed grants;
-- those do not bypass RLS. No SELECT/UPDATE/DELETE policy is created for browser roles.
revoke all on storage.objects from public,anon,authenticated;
-- INSERT is necessary for ordinary uploads; upsert needs UPDATE and remains forbidden.
grant insert on storage.objects to authenticated;
revoke all on storage.buckets from public,anon,authenticated;

-- Guard the mutation primitives used later by W-05/W-09. No API/UI integration in W-04.
create function public.update_display_name(expected_version integer, new_name text)
returns table(display_name text, settings_version integer)
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); current_profile public.profiles;
begin
 if actor is null then raise exception using errcode='42501',message='Authentication required'; end if;
 select * into current_profile from public.profiles where id=actor for update;
 if not found or current_profile.status<>'active' then raise exception using errcode='42501',message='Account unavailable'; end if;
 if expected_version is null or expected_version<>current_profile.settings_version then raise exception using errcode='40001',message='Settings version conflict'; end if;
 if new_name is null or char_length(private.trim_text(new_name)) not between 1 and 80 then raise exception using errcode='22023',message='Invalid display name'; end if;
 update public.profiles p set display_name=private.trim_text(new_name), settings_version=p.settings_version+1, updated_at=now() where p.id=actor;
 return query select p.display_name::text,p.settings_version from public.profiles p where p.id=actor;
end $$;
revoke all on function public.update_display_name(integer,text) from public,anon,authenticated;
grant execute on function public.update_display_name(integer,text) to authenticated;

create function public.save_project_draft(project uuid, expected_version integer, new_title text,
 new_mode text, new_input jsonb, new_preferences jsonb)
returns table(id uuid, draft_version integer)
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); account_status text; current_project public.projects;
begin
 if actor is null then raise exception using errcode='42501',message='Authentication required'; end if;
 -- Profile before project matches the shared lock order; disabling/deletion serializes with saves.
 select status into account_status from public.profiles where profiles.id=actor for update;
 if account_status is distinct from 'active' then raise exception using errcode='42501',message='Account unavailable'; end if;
 if project is null or new_title is null or private.utf16_length(private.trim_text(new_title)) not between 1 and 120
 or new_mode is null or new_mode not in ('education','software','branding')
 or new_input is null or not private.bounded_object(new_input)
 or new_preferences is null or not private.valid_preferences(new_preferences) then
 raise exception using errcode='22023',message='Invalid draft'; end if;
 select * into current_project from public.projects p where p.id=project and p.owner_id=actor and p.deleted_at is null for update;
 if not found then
  if expected_version is distinct from 0 or exists(select 1 from public.projects p where p.id=project) then
   raise exception using errcode='42501',message='Project unavailable'; end if;
  insert into public.projects(id,owner_id,title,mode,draft_input,preferences)
  values(project,actor,private.trim_text(new_title),new_mode,new_input,new_preferences);
 else
  if expected_version is null or expected_version<>current_project.draft_version then raise exception using errcode='40001',message='Draft version conflict'; end if;
  if current_project.draft_state<>'active' then raise exception using errcode='42501',message='Draft unavailable'; end if;
  update public.projects p set title=private.trim_text(new_title),mode=new_mode,draft_input=new_input,preferences=new_preferences where p.id=project and p.owner_id=actor;
 end if;
 return query select p.id,p.draft_version from public.projects p where p.id=project and p.owner_id=actor;
end $$;
revoke all on function public.save_project_draft(uuid,integer,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.save_project_draft(uuid,integer,text,text,jsonb,jsonb) to authenticated;
commit;
