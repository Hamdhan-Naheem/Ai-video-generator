-- Reject ordinary JWTs before contending on shared generation resources.
begin;
set local lock_timeout='5s';
alter function public.operator_console(text,jsonb) rename to operator_console_internal;
alter function public.operator_console_internal(text,jsonb) set schema private;
revoke all on function private.operator_console_internal(text,jsonb) from public,anon,authenticated,service_role;
create function public.operator_console(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' set lock_timeout='3s' set statement_timeout='8s' as $$
begin
 if auth.uid() is null or auth.role() is distinct from 'authenticated' or not exists(select 1 from public.profiles where id=auth.uid() and role='operator' and status='active') then
  raise exception using errcode='42501',message='Operator required';
 end if;
 -- The internal function repeats the authorization check under its global-first
 -- row locks, preventing a concurrent disable/demotion from bypassing the guard.
 return private.operator_console_internal(action,payload);
end $$;
revoke all on function public.operator_console(text,jsonb) from public,anon;
grant execute on function public.operator_console(text,jsonb) to authenticated;
commit;
