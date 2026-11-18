begin;
set local lock_timeout='5s';set local statement_timeout='60s';
-- Missing/malformed configuration must never turn Coming soon modes on.
-- Preserve receipt recovery, owner locks and existing admission/accounting.
do $migration$
declare definition text;
 anchor text:='if settings.limits?''enabledGenerationModes'' and not coalesce((settings.limits->''enabledGenerationModes'')?p.mode,false) then';
begin
 definition:=pg_get_functiondef('public.enqueue_generation(uuid,text,jsonb)'::regprocedure);
 if position(anchor in definition)=0 then raise exception 'Missing mode admission guard';end if;
 execute replace(definition,anchor,'if jsonb_typeof(settings.limits->''enabledGenerationModes'') is distinct from ''array'' or not coalesce((settings.limits->''enabledGenerationModes'')?p.mode,false) then');
end $migration$;
commit;
