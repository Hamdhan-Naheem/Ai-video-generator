begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create function private.guard_asset_identity() returns trigger language plpgsql set search_path = '' as $$
begin
 if row(new.id,new.project_id,new.owner_id,new.bucket,new.object_key,new.creator_job_id,new.producing_lease_token,new.client_artifact_key,new.kind,new.created_at)
 is distinct from row(old.id,old.project_id,old.owner_id,old.bucket,old.object_key,old.creator_job_id,old.producing_lease_token,old.client_artifact_key,old.kind,old.created_at) then
 raise exception using errcode='23514',message='Asset identity is immutable'; end if;
 new.updated_at:=now(); return new;
end $$;
create trigger assets_identity before update on public.assets for each row execute function private.guard_asset_identity();

create function private.guard_plan() returns trigger language plpgsql set search_path = '' as $$
declare plan public.plan_versions; scene_count integer; first_scene integer; last_scene integer;
begin
 if tg_table_name='scenes' then
  select * into plan from public.plan_versions where id=case when tg_op='DELETE' then old.plan_id else new.plan_id end for update;
  if plan.status='validated' then raise exception using errcode='23514',message='Validated scenes are immutable'; end if;
  if tg_op='UPDATE' and new.plan_id<>old.plan_id then
   if exists(select 1 from public.plan_versions where id=old.plan_id and status='validated') then raise exception using errcode='23514',message='Validated scenes are immutable'; end if;
  end if;
  if tg_op='DELETE' then return old; end if; return new;
 end if;
 if tg_op='DELETE' then
  if old.status='validated' then raise exception using errcode='23514',message='Validated plan is immutable'; end if;
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
create trigger plans_guard before insert or update or delete on public.plan_versions for each row execute function private.guard_plan();
create trigger scenes_guard before insert or update or delete on public.scenes for each row execute function private.guard_plan();

create function private.guard_asset_reference() returns trigger language plpgsql set search_path = '' as $$
declare source public.assets;
begin
 select * into source from public.assets where id=new.asset_id for update;
 if source.state in ('rejected','expired','deleting','deleted') or (source.expires_at is not null and source.expires_at<=now()) then
 raise exception using errcode='23514',message='Asset is unavailable for new references'; end if;
 return new;
end $$;
create trigger revision_assets_guard before insert or update on public.revision_assets for each row execute function private.guard_asset_reference();
create trigger checkpoint_assets_guard before insert or update on public.checkpoint_assets for each row execute function private.guard_asset_reference();

-- Fail closed until a future finalization transaction supplies the required export/asset evidence.
-- This checks metadata consistency, not media content; the worker must later verify actual bytes.
create function private.check_ready_revision() returns trigger language plpgsql set search_path = '' as $$
declare result public.revisions;
begin
 select * into result from public.revisions where id=new.id;
 if result.status='ready' and result.deleted_at is null and not exists(
  select 1 from public.exports e where e.revision_id=result.id and e.variant='clean' and e.state='ready'
  and e.expires_at=result.expires_at
 ) then raise exception using errcode='23514',message='Ready revision requires verified clean export'; end if;
 return null;
end $$;
create constraint trigger ready_revision_guard after insert or update on public.revisions deferrable initially deferred
for each row execute function private.check_ready_revision();

create function private.check_export() returns trigger language plpgsql set search_path = '' as $$
declare result public.revisions; expected integer; actual integer; current_export public.exports;
begin
 select * into current_export from public.exports where id=new.id;
 if not found or current_export.state<>'ready' then return null; end if;
 select * into result from public.revisions where id=current_export.revision_id;
 if result.deleted_at is not null or result.expires_at is null or result.expires_at<=now()
 or current_export.expires_at is distinct from result.expires_at then
 raise exception using errcode='23514',message='Export retention must match live revision'; end if;
 expected:=case when current_export.variant='clean' then 5 else 2 end;
 select count(*) into actual from public.assets a where a.project_id=result.project_id and a.owner_id=result.owner_id
 and a.state='available' and a.checksum is not null and a.byte_size is not null
 and ((a.id=current_export.video_asset_id and a.kind='video') or (a.id=current_export.verification_asset_id and a.kind='report')
 or (current_export.variant='clean' and ((a.id=current_export.thumbnail_asset_id and a.kind='thumbnail')
 or (a.id=current_export.vtt_asset_id and a.kind='captions_vtt') or (a.id=current_export.srt_asset_id and a.kind='captions_srt'))));
 if actual<>expected then raise exception using errcode='23514',message='Ready export requires available typed artifacts'; end if;
 return null;
end $$;
create constraint trigger exports_ready_guard after insert or update on public.exports deferrable initially deferred
for each row execute function private.check_export();

create function private.check_latest_ready() returns trigger language plpgsql set search_path = '' as $$
declare project public.projects;
begin
 select * into project from public.projects where id=new.id;
 if project.latest_ready_revision_id is not null and not exists(select 1 from public.revisions r
 where r.id=project.latest_ready_revision_id and r.project_id=project.id and r.owner_id=project.owner_id
 and r.status='ready' and r.deleted_at is null and r.expires_at>now()) then
 raise exception using errcode='23514',message='Latest result must be a live ready revision'; end if;
 return null;
end $$;
create constraint trigger latest_ready_guard after insert or update on public.projects deferrable initially deferred
for each row execute function private.check_latest_ready();

-- Index every foreign-key tuple, unless an existing index already begins with those columns.
-- Stable names and small initial tables keep this migration transactional.
do $$
declare fk record;
begin
 for fk in select c.conrelid, c.conname, c.conkey,
  (select string_agg(quote_ident(a.attname),',' order by keys.ordinality)
   from unnest(c.conkey) with ordinality keys(attnum,ordinality)
   join pg_attribute a on a.attrelid=c.conrelid and a.attnum=keys.attnum) columns_sql
 from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
 where c.contype='f' and n.nspname='public'
 loop
  if not exists(select 1 from pg_index i where i.indrelid=fk.conrelid and i.indisvalid and i.indpred is null
    and array(select k from unnest(i.indkey) with ordinality keys(k,ordinality) where ordinality<=cardinality(fk.conkey) order by ordinality)=fk.conkey) then
   execute format('create index %I on %s (%s)',left(fk.conname,54)||'_idx',fk.conrelid::regclass,fk.columns_sql);
  end if;
 end loop;
end $$;

-- Safely paused until actual storage allowance is configured by an operator, not guessed here.
insert into public.app_settings(id,limits) values('global','{
 "contractVersion":1,"retainedOutputsPerUser":3,"activeJobsPerUser":1,"workerSlots":1,
 "generationReservationBytes":"167772160","maxMp4Bytes":"52428800",
 "sourceUploadBytes":"60000000","retentionDays":7,"signedReadSeconds":60,
 "leaseSeconds":90,"heartbeatSeconds":20,"maxRepairs":2,"globalByteLimitConfigured":false
}');
insert into public.usage_accounts(scope,byte_limit) values('global',0);
insert into public.worker_slots(slot_name) values('processing');
commit;
