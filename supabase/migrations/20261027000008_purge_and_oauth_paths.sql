-- Forward repair: preserve ordinary validated-content immutability and match auth return paths.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create function private.valid_oauth_return_path(value text)
returns boolean language sql immutable set search_path = '' as $$
select coalesce(
 value in ('/dashboard','/videos','/settings','/projects/new')
 or (char_length(value)=46 and value ~ '^/projects/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'),false)
$$;
revoke all on function private.valid_oauth_return_path(text) from public,anon,authenticated;
grant execute on function private.valid_oauth_return_path(text) to service_role;
alter table public.oauth_flows drop constraint oauth_flows_return_path_check;
-- Normalize the original new-project destination to the canonical shared-contract route.
update public.oauth_flows set return_path='/projects/new' where return_path='/create';
alter table public.oauth_flows add constraint oauth_flows_return_path_check
check(private.valid_oauth_return_path(return_path)) not valid;
alter table public.oauth_flows validate constraint oauth_flows_return_path_check;

create function private.plan_purge_permitted(target_revision uuid, target_project uuid, target_owner uuid)
returns boolean language sql stable security definer set search_path = '' as $$
select exists(
 select 1 from public.profiles a
 join public.account_deletions d on d.owner_id=a.id
 join public.projects p on p.owner_id=a.id and p.id=target_project
 join public.revisions r on (r.project_id,r.owner_id)=(p.id,p.owner_id) and r.id=target_revision
 where a.id=target_owner and a.status='deleting' and a.deletion_requested_at is not null
 and d.status='purging' and p.deleted_at is not null and r.deleted_at is not null
) and not exists(
 select 1 from public.jobs j where j.owner_id=target_owner
 and j.status in ('queued','waiting_worker','running','waiting_quota','cancel_requested')
)
$$;
revoke all on function private.plan_purge_permitted(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function private.plan_purge_permitted(uuid,uuid,uuid) to service_role;

create or replace function private.guard_plan() returns trigger language plpgsql set search_path = '' as $$
declare plan public.plan_versions; scene_count integer; first_scene integer; last_scene integer;
begin
 if tg_table_name='scenes' then
  select * into plan from public.plan_versions where id=case when tg_op='DELETE' then old.plan_id else new.plan_id end for update;
  if plan.status='validated' then
   if tg_op='DELETE' and current_user in ('postgres','service_role') then
    if private.plan_purge_permitted(plan.revision_id,plan.project_id,plan.owner_id) then return old; end if;
   end if;
   raise exception using errcode='23514',message='Validated scenes are immutable';
  end if;
  if tg_op='UPDATE' and new.plan_id<>old.plan_id then
   if exists(select 1 from public.plan_versions where id=old.plan_id and status='validated') then raise exception using errcode='23514',message='Validated scenes are immutable'; end if;
  end if;
  if tg_op='DELETE' then return old; end if; return new;
 end if;
 if tg_op='DELETE' then
  if old.status='validated' then
   if current_user in ('postgres','service_role') then
    if private.plan_purge_permitted(old.revision_id,old.project_id,old.owner_id) then return old; end if;
   end if;
   raise exception using errcode='23514',message='Validated plan is immutable';
  end if;
  return old;
 end if;
 if tg_op='UPDATE' and old.status='validated' and new is distinct from old then raise exception using errcode='23514',message='Validated plan is immutable'; end if;
 if new.status='validated' then
  select count(*),min(ordinal),max(ordinal) into scene_count,first_scene,last_scene from public.scenes where plan_id=new.id;
  if scene_count not between 4 and 6 or first_scene<>0 or last_scene<>scene_count-1 then
   raise exception using errcode='23514',message='Validated plan requires four to six consecutive scenes'; end if;
 end if;
 return new;
end $$;

-- Building block for the future server account-purge workflow, not a user delete endpoint.
-- No bypass GUC or caller-supplied authorization flag; normal mutations remain guarded.
create function public.purge_revision_plans(target_revision uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare target_project uuid; target_owner uuid; removed integer;
begin
 select r.project_id,r.owner_id into target_project,target_owner from public.revisions r where r.id=target_revision;
 if not found then raise exception using errcode='42501',message='Revision unavailable for purge'; end if;
 -- Acquire lifecycle locks before project/revision/plan locks, consistent with admission/deletion.
 perform 1 from public.profiles a where a.id=target_owner for update;
 perform 1 from public.account_deletions d where d.owner_id=target_owner for update;
 perform 1 from public.projects p where p.id=target_project and p.owner_id=target_owner for update;
 perform 1 from public.revisions r where r.id=target_revision and r.project_id=target_project and r.owner_id=target_owner for update;
 if not private.plan_purge_permitted(target_revision,target_project,target_owner) then
  raise exception using errcode='42501',message='Account purge is not authorized or work is still active';
 end if;
 perform 1 from public.plan_versions p where p.revision_id=target_revision order by p.id for update;
 if exists(select 1 from public.scene_timings t where t.revision_id=target_revision) then
  raise exception using errcode='55000',message='Purge scene timing references before plans';
 end if;
 update public.revisions r set selected_plan_id=null where r.id=target_revision and r.selected_plan_id is not null;
 delete from public.scenes s where s.revision_id=target_revision and s.project_id=target_project and s.owner_id=target_owner;
 delete from public.plan_versions p where p.revision_id=target_revision and p.project_id=target_project and p.owner_id=target_owner;
 get diagnostics removed = row_count;
 return removed;
end $$;
revoke all on function public.purge_revision_plans(uuid) from public,anon,authenticated;
grant execute on function public.purge_revision_plans(uuid) to service_role;
commit;
