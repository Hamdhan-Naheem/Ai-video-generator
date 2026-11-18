begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
create function private.project_draft_json(p public.projects) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('id',p.id,'title',p.title,'mode',p.mode,
 'draftInput',p.draft_input || jsonb_build_object('mode',p.mode,'title',p.title),
 'preferences','{"targetSeconds":60,"orientation":"landscape","voiceProfileId":"Kore"}'::jsonb || p.preferences,
 'draftVersion',p.draft_version,'draftState',p.draft_state,
 'updatedAt',to_char(p.updated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
 'modeLocked',exists(select 1 from public.revisions r where r.project_id=p.id and r.owner_id=p.owner_id));
$$;
revoke all on function private.project_draft_json(public.projects) from public,anon,authenticated;

create function public.get_project_draft(project uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result jsonb;
begin
 if actor is null or not private.active_user() then raise exception using errcode='42501',message='Account unavailable'; end if;
 select private.project_draft_json(p) into result from public.projects p
 where p.id=project and p.owner_id=actor and p.deleted_at is null and p.draft_state='active';
 return result;
end $$;
revoke all on function public.get_project_draft(uuid) from public,anon,authenticated;
grant execute on function public.get_project_draft(uuid) to authenticated;

create function public.update_project_draft(project uuid,expected_version integer,new_title text,new_input jsonb,new_preferences jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare current_project public.projects; account_status text;
begin
 select status into account_status from public.profiles where id=auth.uid() for update;
 if account_status is distinct from 'active' then raise exception using errcode='42501',message='Account unavailable'; end if;
 select * into current_project from public.projects p where p.id=project and p.owner_id=auth.uid() and p.deleted_at is null and p.draft_state='active' for update;
 if not found then raise exception using errcode='42501',message='Draft unavailable'; end if;
 perform public.save_project_draft(project,expected_version,new_title,current_project.mode,new_input,new_preferences);
 return public.get_project_draft(project);
end $$;
revoke all on function public.update_project_draft(uuid,integer,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.update_project_draft(uuid,integer,text,jsonb,jsonb) to authenticated;

create function public.create_project_draft(project uuid,request_key text,request_hash text,new_title text,new_mode text,new_input jsonb,new_preferences jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); account_status text; previous public.idempotency_requests; result jsonb;
begin
 -- Reuse the established lock order. The profile lock serializes first use of a key.
 select status into account_status from public.profiles where id=actor for update;
 if account_status is distinct from 'active' then raise exception using errcode='42501',message='Account unavailable'; end if;
 if request_key is null or request_key !~ '^[a-zA-Z0-9_-]{1,128}$' or request_hash is null or request_hash !~ '^[a-f0-9]{64}$' then
  raise exception using errcode='22023',message='Invalid request identity'; end if;
 select * into previous from public.idempotency_requests i where i.owner_id=actor and i.operation='create_project_draft' and i.key=request_key for update;
 if found then
  if previous.request_hash<>request_hash then raise exception using errcode='23505',message='Request key already used'; end if;
  if not exists(select 1 from public.projects p where p.id=previous.resource_id and p.owner_id=actor and p.deleted_at is null and p.draft_state='active') then
   raise exception using errcode='42501',message='Draft unavailable'; end if;
  return previous.safe_response;
 end if;
 perform public.save_project_draft(project,0,new_title,new_mode,new_input,new_preferences);
 result:=public.get_project_draft(project);
 insert into public.idempotency_requests(owner_id,operation,key,request_hash,resource_type,resource_id,response_status,safe_response)
 values(actor,'create_project_draft',request_key,request_hash,'project',project,201,result);
 return result;
end $$;
revoke all on function public.create_project_draft(uuid,text,text,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.create_project_draft(uuid,text,text,text,text,jsonb,jsonb) to authenticated;
create or replace function public.get_dashboard() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); snapshot jsonb;
begin
 if actor is null or not private.active_user() then
  raise exception using errcode='42501',message='Account unavailable';
 end if;
 with owned as (
  select p.id,p.title,p.mode,p.draft_state,p.updated_at,p.latest_ready_revision_id
  from public.projects p where p.owner_id=actor and p.deleted_at is null
  and (p.draft_state='active' or exists(select 1 from public.revisions r where r.project_id=p.id and r.owner_id=actor and r.deleted_at is null))
 ), recent as (
  select p.*,r.status revision_status,r.expires_at,j.status job_status,
   live.id live_result
  from (select * from owned order by updated_at desc,id desc limit 6) p
  left join lateral (select r.status,r.expires_at from public.revisions r
   where r.project_id=p.id and r.owner_id=actor and r.deleted_at is null order by r.revision_number desc limit 1) r on true
  left join lateral (select j.status from public.jobs j join public.revisions v on v.id=j.revision_id
   where j.project_id=p.id and j.owner_id=actor and v.owner_id=actor and v.deleted_at is null
   and (v.expires_at is null or v.expires_at>now())
   and j.status in ('queued','waiting_worker','running','waiting_quota','cancel_requested')
   order by j.created_at desc,j.id desc limit 1) j on true
  left join public.revisions live on live.id=p.latest_ready_revision_id and live.project_id=p.id
   and live.owner_id=actor and live.deleted_at is null and live.status='ready' and live.expires_at>now()
 ), configuration as (
  select s.generation_paused or s.claims_paused paused,
   case when s.limits->>'retainedOutputsPerUser' ~ '^[0-9]{1,6}$' then (s.limits->>'retainedOutputsPerUser')::integer end max_outputs,
   coalesce(s.limits->'globalByteLimitConfigured'='true'::jsonb,false) and exists(
    select 1 from public.usage_accounts g where g.scope='global' and g.byte_limit>0) storage_configured
  from public.app_settings s where s.id='global'
 ), account as (
  select a.* from public.usage_accounts a where a.scope='user' and a.owner_id=actor
 )
 select jsonb_build_object(
  'asOf',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'projectCount',(select count(*)::integer from owned),
  'recentProjects',coalesce((select jsonb_agg(jsonb_build_object(
   'id',p.id,'title',p.title,'mode',p.mode,'canEditDraft',p.draft_state='active',
   'updatedAt',to_char(p.updated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
   'state',case when p.job_status is not null then p.job_status when p.live_result is not null then 'ready'
    when p.expires_at<=now() or p.revision_status='expired' then 'expired'
    when p.revision_status in ('failed','cancelled','needs_input') then p.revision_status
    when p.draft_state='active' then 'draft' else 'saved' end
  ) order by p.updated_at desc,p.id desc) from recent p),'[]'::jsonb),
  'usage',jsonb_build_object(
   'retainedOutputs',(select count(*)::integer from public.revisions r join public.projects p on p.id=r.project_id and p.owner_id=actor
     where r.owner_id=actor and p.deleted_at is null and r.deleted_at is null and r.status='ready' and r.expires_at>now()),
   'reservedOutputs',(select a.reserved_outputs from account a),
   'maxOutputs',least((select c.max_outputs from configuration c),(select a.output_limit from account a)),
   'usedBytes',(select a.used_bytes::text from account a),
   'reservedBytes',(select a.reserved_bytes::text from account a),
   'byteLimit',(select a.byte_limit::text from account a),
   'accountingConfigured',exists(select 1 from account a,configuration c where a.byte_limit>0 and c.storage_configured)
  ),
  'worker',jsonb_build_object(
   'status',case when not exists(select 1 from public.workers w where w.enabled and w.protocol_version=1) then 'not_configured'
    when exists(select 1 from public.workers w where w.enabled and w.protocol_version=1 and w.last_seen_at>now()-interval '90 seconds' and w.last_seen_at<=now()) then 'online' else 'offline' end,
   'processingPaused',coalesce((select c.paused from configuration c),true)
  )
 ) into snapshot;
 return snapshot;
end $$;

commit;
