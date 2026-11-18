begin;
set local lock_timeout='5s';set local statement_timeout='60s';
-- A render/storage retry can finish entirely from cache. Charge/check only actual
-- new dispatches; show the daily waiting state after a provider-stage failure.
do $migration$
declare definition text;anchor text:='if not private.provider_daily_available(j.owner_id) then';
begin
 definition:=pg_get_functiondef('private.generation_recovery_reason(public.jobs)'::regprocedure);
 if position(anchor in definition)=0 then raise exception 'Missing daily recovery guard';end if;
 execute replace(definition,anchor,'if j.safe_error_code=''PROVIDER_UNAVAILABLE'' and not private.provider_daily_available(j.owner_id) then');
end $migration$;
commit;
