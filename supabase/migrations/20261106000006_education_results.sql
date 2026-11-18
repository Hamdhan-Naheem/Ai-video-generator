begin;
create function public.get_education_run(project uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();j public.jobs;r public.revisions;
begin
 if not private.active_user() or not exists(select 1 from public.projects where id=project and owner_id=actor and deleted_at is null and mode='education') then raise exception using errcode='42501',message='Project unavailable';end if;
 select * into j from public.jobs where project_id=project and owner_id=actor and kind='generation' order by created_at desc,id desc limit 1;
 if not found then return null;end if;
 select * into r from public.revisions where id=j.revision_id;
 return jsonb_build_object('jobId',j.id,'status',case when j.status='succeeded' and (r.deleted_at is not null or r.expires_at<=clock_timestamp()) then 'expired' else j.status end,'stage',j.stage,'activeMs',j.active_ms::text,'revisionId',r.id,'expiresAt',case when r.expires_at is null then null else to_char(r.expires_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') end);
end $$;
revoke all on function public.get_education_run(uuid) from public,anon;grant execute on function public.get_education_run(uuid) to authenticated;
create function public.describe_education_result(actor uuid,project uuid,variant text) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.assets;
begin
 if variant not in ('video','srt','vtt') or not exists(select 1 from public.profiles where id=actor and status='active') then raise exception using errcode='42501',message='Result unavailable';end if;
 select aa.* into a from public.projects p join public.revisions r on r.id=p.latest_ready_revision_id join public.exports e on e.revision_id=r.id and e.variant='clean' join public.assets aa on aa.id=case $3 when 'video' then e.video_asset_id when 'srt' then e.srt_asset_id else e.vtt_asset_id end
 where p.id=project and p.owner_id=actor and p.mode='education' and p.deleted_at is null and r.status='ready' and r.deleted_at is null and r.expires_at>clock_timestamp() and e.state='ready' and e.expires_at=r.expires_at and aa.state='available' and aa.deleted_at is null and aa.expires_at>clock_timestamp();
 if not found then raise exception using errcode='42501',message='Result unavailable';end if;
 return jsonb_build_object('bucket',a.bucket,'objectKey',a.object_key,'expiresAt',to_char(a.expires_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'));
end $$;
revoke all on function public.describe_education_result(uuid,uuid,text) from public,anon,authenticated;grant execute on function public.describe_education_result(uuid,uuid,text) to service_role;
create function public.education_execution_available() returns boolean language sql stable security definer set search_path='' as $$
select private.active_user() and exists(select 1 from public.app_settings where id='global' and not generation_paused and not claims_paused and limits->>'educationExecutionVerified'='true' and (limits->'enabledGenerationModes')?'education')
 and exists(select 1 from public.workers where enabled and protocol_version=1 and capabilities->>'executionReady'='true' and health->>'executionReady'='true' and last_seen_at>clock_timestamp()-interval '90 seconds')
 and exists(select 1 from public.usage_accounts where owner_id=auth.uid() and byte_limit-used_bytes-reserved_bytes>=167772160 and retained_outputs+reserved_outputs<least(output_limit,3))
 and exists(select 1 from public.usage_accounts where scope='global' and byte_limit-used_bytes-reserved_bytes>=167772160);
$$;
revoke all on function public.education_execution_available() from public,anon;grant execute on function public.education_execution_available() to authenticated;
commit;
