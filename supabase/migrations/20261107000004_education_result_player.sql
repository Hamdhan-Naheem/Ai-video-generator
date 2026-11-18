begin;
set local lock_timeout='5s';set local statement_timeout='60s';
create function private.education_result_metadata(actor uuid,project uuid,revision uuid) returns jsonb language plpgsql stable set search_path='' as $$
declare p public.projects;r public.revisions;e public.exports;report jsonb;result_state text;stamp timestamptz:=clock_timestamp();valid_count integer;
begin
 if not exists(select 1 from public.profiles where id=actor and status='active') then raise exception using errcode='42501',message='Result unavailable';end if;
 select * into p from public.projects where id=project and owner_id=actor and mode='education' and deleted_at is null;
 if not found then raise exception using errcode='42501',message='Result unavailable';end if;
 select * into r from public.revisions where id=revision and project_id=p.id and owner_id=actor;
 if not found then raise exception using errcode='42501',message='Result unavailable';end if;
 select * into e from public.exports where revision_id=r.id and variant='clean';
 select provider_metadata->'verification' into report from public.assets where id=e.verification_asset_id and owner_id=actor and project_id=p.id and state='available' and deleted_at is null;
 select count(*) into valid_count from public.assets a where a.owner_id=actor and a.project_id=p.id and a.state='available' and a.deleted_at is null and a.expires_at>stamp and exists(select 1 from storage.objects o where o.bucket_id=a.bucket and o.name=a.object_key and o.metadata->>'size'=a.byte_size::text)
 and ((a.id=e.video_asset_id and a.kind='video') or (a.id=e.thumbnail_asset_id and a.kind='thumbnail') or (a.id=e.srt_asset_id and a.kind='captions_srt') or (a.id=e.vtt_asset_id and a.kind='captions_vtt') or (a.id=e.verification_asset_id and a.kind='report'));
 result_state:=case when r.deleted_at is not null then 'unavailable' when r.expires_at<=stamp then 'expired'
 when r.status='ready' and e.state='ready' and e.expires_at=r.expires_at and e.expires_at>stamp and valid_count=5 and report->>'fullDecode'='true' and report->>'audio'='true' and report->>'orientation'=r.orientation and report->>'provider' in ('gemini','elevenlabs') and exists(select 1 from public.jobs j where j.revision_id=r.id and j.status='succeeded') then 'ready' else 'unavailable' end;
 return jsonb_build_object('revisionId',r.id,'title',coalesce(nullif(r.input_snapshot->'input'->>'title',''),p.title),'version',r.revision_number,'status',result_state,'orientation',r.orientation,'targetSeconds',r.target_seconds,
 'durationMs',case when report->>'durationMs'~'^[0-9]{1,6}$' then (report->>'durationMs')::integer else null end,
 'completedAt',case when r.completed_at is null then null else to_char(r.completed_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') end,
 'expiresAt',case when r.expires_at is null then null else to_char(r.expires_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') end,
 'serverTime',to_char(stamp at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
 'narration',jsonb_build_object('provider',case when report->>'provider' in ('gemini','elevenlabs') then report->>'provider' else 'unknown' end,'voice',case when length(report->>'voice') between 1 and 100 then report->>'voice' else null end));
end $$;
revoke all on function private.education_result_metadata(uuid,uuid,uuid) from public,anon,authenticated;
create function public.get_education_result(project uuid,revision uuid) returns jsonb language sql security definer set search_path='' as $$select private.education_result_metadata(auth.uid(),project,revision)$$;
revoke all on function public.get_education_result(uuid,uuid) from public,anon;
grant execute on function public.get_education_result(uuid,uuid) to authenticated;
create function public.describe_education_revision_media(actor uuid,project uuid,revision uuid,kind text) returns jsonb language plpgsql security definer set search_path='' as $$
declare metadata jsonb;e public.exports;a public.assets;r public.revisions;deadline timestamptz;
begin
 metadata:=private.education_result_metadata(actor,project,revision);
 if metadata->>'status'<>'ready' then raise exception using errcode='P2001',message='Result expired or unavailable';end if;
 if kind not in ('video','srt','vtt','thumbnail') or kind is null then raise exception using errcode='22023',message='Invalid media';end if;
 select * into r from public.revisions where id=revision;
 select * into e from public.exports where revision_id=revision and variant='clean';
 select * into a from public.assets where id=case $4 when 'video' then e.video_asset_id when 'srt' then e.srt_asset_id when 'vtt' then e.vtt_asset_id else e.thumbnail_asset_id end;
 deadline:=least(r.expires_at,e.expires_at,a.expires_at);
 return jsonb_build_object('bucket',a.bucket,'objectKey',a.object_key,'expiresAt',to_char(deadline at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'));
end $$;
revoke all on function public.describe_education_revision_media(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.describe_education_revision_media(uuid,uuid,uuid,text) to service_role;
commit;
