begin;
set local lock_timeout='5s';set local statement_timeout='60s';
-- P1604 is reserved for daily provider admission. Storage confirmation has its
-- own code so cached-only recovery does not depend on new AI allowance.
do $migration$
declare definition text;anchor text:='errcode=''P1604'',message=''Artifact upload incomplete''';
begin
 definition:=pg_get_functiondef('public.worker_execute(text,integer,jsonb)'::regprocedure);
 if position(anchor in definition)=0 then raise exception 'Missing artifact confirmation guard';end if;
 execute replace(definition,anchor,'errcode=''P1605'',message=''Artifact upload incomplete''');
end $migration$;
commit;
