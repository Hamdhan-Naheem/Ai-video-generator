begin;
set local lock_timeout='5s';set local statement_timeout='60s';
-- Deferred triggers execute after the user RPC returns; keep invariant reads internal.
alter function private.check_export() security definer;
revoke all on function private.check_export() from public,anon,authenticated;
-- Only finalized owned results are removed. Immutable input and editable drafts remain.
create function public.get_video_deletion(project uuid,revision uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid();r public.revisions;
begin
 if not private.active_user() then raise exception using errcode='42501',message='Account unavailable';end if;
 select v.* into r from public.revisions v join public.projects p on p.id=v.project_id and p.owner_id=actor
 where v.id=revision and v.project_id=project and v.owner_id=actor and p.deleted_at is null and p.mode='education' and v.deleted_at is not null;
 if not found then raise exception using errcode='42501',message='Deleted video unavailable';end if;
 return jsonb_build_object('deleted',true,'revisionId',r.id,'cleanupState',case when exists(
  select 1 from public.assets a join public.jobs j on j.id=a.creator_job_id where j.revision_id=r.id and a.bucket='artifacts' and a.owner_id=actor and a.state<>'deleted'
 ) then 'pending' else 'complete' end);
end $$;
revoke all on function public.get_video_deletion(uuid,uuid) from public,anon,authenticated;
grant execute on function public.get_video_deletion(uuid,uuid) to authenticated;

create function public.delete_education_video(project uuid,revision uuid,expected_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();r public.revisions;a record;ua public.usage_accounts;g public.usage_accounts;live_count integer;retired integer;stamp timestamptz;
begin
 perform private.lock_usage_scope(actor);
 perform 1 from public.profiles where id=actor and status='active' for update;
 if not found then raise exception using errcode='42501',message='Account unavailable';end if;
 perform 1 from public.projects where id=project and owner_id=actor and deleted_at is null and mode='education' for update;
 if not found then raise exception using errcode='42501',message='Video unavailable';end if;
 select * into r from public.revisions where id=revision and project_id=project and owner_id=actor for update;
 if not found then raise exception using errcode='42501',message='Video unavailable';end if;
 if expected_version is null or expected_version<1 then raise exception using errcode='22023',message='Invalid video version';end if;
 if r.revision_number<>expected_version then raise exception using errcode='40001',message='Video version changed';end if;
 if r.deleted_at is not null then return public.get_video_deletion(project,revision);end if;
 if r.completed_at is null or r.status not in ('ready','expired') or not exists(select 1 from public.jobs where revision_id=r.id and owner_id=actor and status='succeeded') then raise exception using errcode='P2404',message='Only completed videos can be deleted';end if;
 if exists(select 1 from public.jobs where project_id=project and owner_id=actor and status in ('queued','waiting_worker','running','waiting_quota','cancel_requested')) then raise exception using errcode='P1401',message='Finish or cancel active generation first';end if;
 stamp:=clock_timestamp();
 update public.projects set latest_ready_revision_id=null where id=project and latest_ready_revision_id=r.id;
 update public.exports set state='expired',updated_at=stamp where revision_id=r.id and state='ready';
 update public.revisions set deleted_at=stamp where id=r.id;
 -- Release the logical retained-video slot once; bytes stay charged until physical removal.
 select * into ua from public.usage_accounts where owner_id=actor;select * into g from public.usage_accounts where scope='global';
 select count(*)::integer into live_count from public.revisions v join public.projects p on p.id=v.project_id and p.owner_id=actor
 where v.owner_id=actor and p.deleted_at is null and v.deleted_at is null and v.status='ready' and v.expires_at>stamp;
 if ua.id is null or g.id is null then raise exception using errcode='P2403',message='Accounting unavailable';end if;
 retired:=ua.retained_outputs-live_count;
 if retired<0 or retired>g.retained_outputs then raise exception using errcode='P2403',message='Accounting requires reconciliation';end if;
 update public.usage_accounts set retained_outputs=retained_outputs-retired,updated_at=stamp where scope='global' or owner_id=actor;
 insert into public.usage_ledger(operation_key,owner_id,used_bytes_delta,reserved_bytes_delta,retained_outputs_delta,reserved_outputs_delta,reason)
 values('video:delete:'||r.id,actor,0,0,-retired,0,'owned video removed; media bytes pending cleanup');
 for a in select x.id,x.bucket,x.object_key,x.created_at,j.finished_at from public.assets x join public.jobs j on j.id=x.creator_job_id
  where j.revision_id=r.id and x.owner_id=actor and x.bucket='artifacts' and x.state<>'deleted' order by x.id
 loop
  insert into public.cleanup_tasks(asset_id,bucket,object_key,owner_id,reason,next_attempt_at)
  values(a.id,a.bucket,a.object_key,actor,'media retention',greatest(stamp,greatest(a.created_at,a.finished_at)+interval '24 hours')) on conflict do nothing;
 end loop;
 return public.get_video_deletion(project,revision);
end $$;
revoke all on function public.delete_education_video(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.delete_education_video(uuid,uuid,integer) to authenticated;

create or replace function private.media_cleanup_eligible(asset uuid,stamp timestamptz) returns boolean
language sql stable set search_path='' as $$
 select exists(select 1 from public.assets a join public.jobs j on j.id=a.creator_job_id and j.owner_id=a.owner_id and j.project_id=a.project_id
 where a.id=asset and a.bucket='artifacts' and a.state<>'deleted'
 and (a.expires_at<=stamp or exists(select 1 from public.revisions deleted where deleted.id=j.revision_id and deleted.deleted_at is not null))
 and j.status in ('succeeded','failed','cancelled','needs_input') and j.finished_at is not null
 and (j.status<>'failed' or j.finished_at<=stamp-interval '48 hours')
 and greatest(a.created_at,j.finished_at)+interval '24 hours'<=stamp
 and not exists(select 1 from public.jobs active where active.project_id=a.project_id and active.owner_id=a.owner_id and active.status in ('queued','waiting_worker','running','waiting_quota','cancel_requested'))
 and not exists(select 1 from public.revision_assets ra join public.revisions r on r.id=ra.revision_id
  where ra.asset_id=a.id and (ra.retain_until>stamp or (r.deleted_at is null and r.expires_at>stamp)) and not (r.id=j.revision_id and r.deleted_at is not null))
 and not exists(select 1 from public.checkpoint_assets ca join public.revisions r on r.id=ca.revision_id where ca.asset_id=a.id and r.deleted_at is null and r.expires_at>stamp)
 and not exists(select 1 from public.exports e where (e.video_asset_id=a.id or e.thumbnail_asset_id=a.id or e.vtt_asset_id=a.id or e.srt_asset_id=a.id or e.verification_asset_id=a.id)
  and (e.state in ('pending','rendering') or (e.state='ready' and e.expires_at>stamp))))
$$;
revoke all on function private.media_cleanup_eligible(uuid,timestamptz) from public,anon,authenticated;
commit;
