-- Existing result retention must not prevent edits to retained project metadata.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Deferred triggers run after the draft RPC's security-definer context ends.
-- Read the scoped revision here even when expiry correctly hides it through RLS.
create or replace function private.check_latest_ready() returns trigger language plpgsql security definer set search_path = '' as $$
declare project public.projects; assigning boolean := true;
begin
 -- Deferred events still inspect the final row. Only an unchanged pointer may
 -- outlive its retention; any assignment event must pass the freshness check.
 if tg_op='UPDATE' then
  assigning := new.latest_ready_revision_id is distinct from old.latest_ready_revision_id;
 end if;
 select * into project from public.projects where id=new.id;
 if project.latest_ready_revision_id is not null and not exists(select 1 from public.revisions r
 where r.id=project.latest_ready_revision_id and r.project_id=project.id and r.owner_id=project.owner_id
 and r.status='ready' and r.deleted_at is null
 and (not assigning or r.expires_at>now())) then
 raise exception using errcode='23514',message='Latest result must be a live ready revision'; end if;
 return null;
end $$;
revoke all on function private.check_latest_ready() from public,anon,authenticated;

commit;
