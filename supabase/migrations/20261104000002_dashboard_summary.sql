-- W-08: bounded read projection; no table grants, mutation or service-role web client.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
create function public.get_dashboard() returns jsonb
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
   'id',p.id,'title',p.title,'mode',p.mode,
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
revoke all on function public.get_dashboard() from public,anon,authenticated;
grant execute on function public.get_dashboard() to authenticated;
commit;
