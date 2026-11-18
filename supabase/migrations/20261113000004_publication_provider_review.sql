begin;
set local lock_timeout='5s';set local statement_timeout='60s';
-- Preserve the installed worker executor and its fences/receipts. An uncertain
-- primary TTS request must block publication even if a fallback has succeeded.
do $migration$
declare definition text;
 anchor text:='  if count_assets<>5 or exists(select 1 from public.provider_attempts where job_id=j.id and status in (''dispatched'',''reserved'')) then raise exception using errcode=''P1601'',message=''Complete output set required'';end if;';
 replacement text:=E'  if exists(select 1 from public.provider_attempts where job_id=j.id and status in (''dispatched'',''reserved'',''outcome_unknown'')) then raise exception using errcode=''P1603'',message=''Provider reconciliation required'';end if;\n  if count_assets<>5 then raise exception using errcode=''P1601'',message=''Complete output set required'';end if;';
begin
 definition:=pg_get_functiondef('public.worker_execute(text,integer,jsonb)'::regprocedure);
 if position(anchor in definition)=0 then raise exception 'Missing worker publication guard anchor';end if;
 execute replace(definition,anchor,replacement);
end $migration$;
commit;
