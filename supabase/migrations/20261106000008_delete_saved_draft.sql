begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
create function public.delete_saved_draft(project uuid,expected_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); p public.projects; upload_id uuid;
begin
 -- Same lock order as generation/source mutations; only mutable draft is removed.
 perform private.lock_usage_scope(actor);
 perform 1 from public.profiles where id=actor and status='active' for update;
 if not found then raise exception using errcode='42501',message='Account unavailable';end if;
 select * into p from public.projects where id=project and owner_id=actor and deleted_at is null for update;
 if not found then raise exception using errcode='42501',message='Draft unavailable';end if;
 if expected_version is null or expected_version<1 then raise exception using errcode='22023',message='Invalid draft version';end if;
 -- Lost-response retries keep the original version.
 if p.draft_state='removed' then return jsonb_build_object('deleted',true,'cleanupState','pending');end if;
 if p.draft_version<>expected_version then raise exception using errcode='40001',message='Draft changed';end if;
 if exists(select 1 from public.jobs where project_id=project and owner_id=actor
   and status in ('queued','waiting_worker','running','waiting_quota','cancel_requested')) then
  raise exception using errcode='P1401',message='Active generation must finish or be cancelled first';
 end if;
 -- Reuse reservation/ledger and partial-transfer accounting. Frozen references
 -- retain their sources; cleanup is scheduled only for unreferenced uploads.
 for upload_id in select u.id from public.upload_allocations u join public.assets a on a.id=u.asset_id
   where u.project_id=project and u.owner_id=actor and u.state<>'abandoned'
   and not exists(select 1 from public.revision_assets ra where ra.asset_id=a.id)
   and not exists(select 1 from public.checkpoint_assets ca where ca.asset_id=a.id)
   order by u.id
 loop
  perform public.change_source_upload(upload_id,'remove');
 end loop;
 update public.projects set draft_input='{}'::jsonb,draft_state='removed' where id=project and owner_id=actor;
 return jsonb_build_object('deleted',true,'cleanupState','pending');
end $$;
revoke all on function public.delete_saved_draft(uuid,integer) from public,anon,authenticated;
grant execute on function public.delete_saved_draft(uuid,integer) to authenticated;
commit;
