begin;
create function public.list_saved_drafts(before_time timestamptz default null,before_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.active_user() then raise exception using errcode='42501',message='Account unavailable';end if;
 if (before_time is null)<>(before_id is null) then raise exception using errcode='22023',message='Invalid cursor';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'title',p.title,'mode',p.mode,'draftVersion',p.draft_version,
 'updatedAt',to_char(p.updated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')) order by p.updated_at desc,p.id desc),'[]'::jsonb) into result
 from (select p.id,p.title,p.mode,p.draft_version,p.updated_at from public.projects p
 where p.owner_id=auth.uid() and p.deleted_at is null and p.draft_state='active'
 and (before_time is null or (p.updated_at,p.id)<(before_time,before_id))
 order by p.updated_at desc,p.id desc limit 21) p;
 return result;
end $$;
revoke all on function public.list_saved_drafts(timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.list_saved_drafts(timestamptz,uuid) to authenticated;
-- Keep the shared auth return allowlist in parity even though Google is deferred.
create or replace function private.valid_oauth_return_path(value text)
returns boolean language sql immutable set search_path='' as $$
select coalesce(value in ('/dashboard','/drafts','/videos','/settings','/projects/new')
 or (char_length(value)=46 and value ~ '^/projects/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'),false)
$$;
commit;
