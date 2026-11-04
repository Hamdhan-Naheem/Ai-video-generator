-- A scene belongs to one plan for its lifetime. Reuse content by inserting a new row.
-- Reject reparenting before choosing a parent lock, closing validation/move races.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create or replace function private.guard_plan() returns trigger language plpgsql set search_path = '' as $$
declare plan public.plan_versions; scene_count integer; first_scene integer; last_scene integer;
begin
 if tg_table_name='scenes' then
  if tg_op='UPDATE' then
   if new.plan_id is distinct from old.plan_id then
    raise exception using errcode='23514',message='Scene plan membership is immutable';
   end if;
  end if;
  select * into plan from public.plan_versions where id=case when tg_op='DELETE' then old.plan_id else new.plan_id end for update;
  if plan.status='validated' then
   if tg_op='DELETE' and current_user in ('postgres','service_role') then
    if private.plan_purge_permitted(plan.revision_id,plan.project_id,plan.owner_id) then return old; end if;
   end if;
   raise exception using errcode='23514',message='Validated scenes are immutable';
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
commit;
