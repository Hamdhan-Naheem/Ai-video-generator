-- Run once in the linked hosted project's SQL Editor after the anchor failure.
-- Changes only CRLF line endings in this existing function, never its logic/grants.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $repair$
declare definition text; normalized text;
begin
 definition:=pg_get_functiondef('private.generation_recovery_reason(public.jobs)'::regprocedure);
 normalized:=replace(definition,chr(13)||chr(10),chr(10));
 if position(E' return ''retry'';\nend' in normalized)=0 then
  raise exception 'Unexpected recovery validator; stop and inspect before retrying migrations';
 end if;
 if normalized is distinct from definition then execute normalized;end if;
end $repair$;
commit;
