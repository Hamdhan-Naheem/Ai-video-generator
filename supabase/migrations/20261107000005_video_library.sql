begin;
set local lock_timeout='5s';set local statement_timeout='60s';
create index revisions_owner_completed_idx on public.revisions(owner_id,completed_at desc,id desc)
 where deleted_at is null and status in ('ready','expired');
create function public.list_education_videos(before_time timestamptz default null,before_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid();items jsonb;summary jsonb;
begin
 if actor is null or not private.active_user() then raise exception using errcode='42501',message='Account unavailable';end if;
 if (before_time is null)<>(before_id is null) then raise exception using errcode='22023',message='Invalid cursor';end if;
 -- Freeze the bounded page before checking Storage/report metadata. Never scan
 -- all owned results through the more expensive private verification helper.
 with page as materialized (
  select r.id,r.project_id,r.completed_at,p.draft_state from public.revisions r
  join public.projects p on p.id=r.project_id and p.owner_id=actor
  where r.owner_id=actor and r.deleted_at is null and r.status in ('ready','expired')
   and r.completed_at is not null and p.deleted_at is null and p.mode='education'
   and (before_time is null or (r.completed_at,r.id)<(before_time,before_id))
  order by r.completed_at desc,r.id desc limit 21
 ) select coalesce(jsonb_agg(private.education_result_metadata(actor,p.project_id,p.id)
  ||jsonb_build_object('projectId',p.project_id,'canEditDraft',p.draft_state='active')
  order by p.completed_at desc,p.id desc),'[]'::jsonb) into items from page p;
 summary:=public.get_dashboard();
 return jsonb_build_object('items',items,'usage',summary->'usage','asOf',summary->'asOf');
end $$;
revoke all on function public.list_education_videos(timestamptz,uuid) from public,anon;
grant execute on function public.list_education_videos(timestamptz,uuid) to authenticated;
commit;
