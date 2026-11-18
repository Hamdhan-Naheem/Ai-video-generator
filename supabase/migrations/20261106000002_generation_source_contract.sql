begin;
-- Match the strict shared UUID contract before PostgreSQL's more permissive cast.
create or replace function private.complete_generation_input(value jsonb,mode text) returns boolean
language plpgsql immutable set search_path='' as $$
declare item jsonb; key text; text_limit integer; allowed text[]; required text[]; total integer:=0; images integer:=0; recordings integer:=0; seen uuid[]:='{}'; source uuid;
begin
 if value is null or not private.bounded_object(value) or value->>'mode' is distinct from mode then return false;end if;
 allowed:=array['mode','title','brief','sources','intendedUse'];
 if mode='education' then allowed:=allowed||array['topic','audience','learningObjective','referenceNotes'];required:=array['title','topic'];
 elsif mode='software' then allowed:=allowed||array['softwareName','featureHighlights'];required:=array['title','softwareName','brief'];
 elsif mode='branding' then allowed:=allowed||array['productName','benefits','brandDetails','brandColors','callToAction','intendedAudience'];required:=array['title','productName'];
 else return false;end if;
 if value-allowed<>'{}'::jsonb or value->>'intendedUse' not in ('personal-learning','promotional') or jsonb_typeof(value->'intendedUse') is distinct from 'string' then return false;end if;
 foreach key in array required loop
  if jsonb_typeof(value->key) is distinct from 'string' or private.trim_text(value->>key)='' then return false;end if;
 end loop;
 foreach key in array allowed loop
  if key in ('mode','sources','benefits','brandColors') or not value?key then continue;end if;
  text_limit:=case key when 'title' then 120 when 'softwareName' then 120 when 'productName' then 120 when 'topic' then 300 when 'learningObjective' then 500 when 'referenceNotes' then 10000 when 'callToAction' then 160 when 'intendedAudience' then 200 when 'audience' then 20 when 'intendedUse' then 20 else 4000 end;
  if jsonb_typeof(value->key)<>'string' or private.utf16_length(value->>key)>text_limit then return false;end if;
  if key in ('brief','learningObjective','featureHighlights','brandDetails','callToAction','intendedAudience') then total:=total+private.utf16_length(value->>key);end if;
 end loop;
 if mode='education' and (jsonb_typeof(value->'audience') is distinct from 'string' or value->>'audience' not in ('beginner','school','adult')) then return false;end if;
 if value?'benefits' then
  if jsonb_typeof(value->'benefits')<>'array' or jsonb_array_length(value->'benefits')>8 then return false;end if;
  for item in select * from jsonb_array_elements(value->'benefits') loop
   if jsonb_typeof(item)<>'string' or private.trim_text(item#>>'{}')='' or private.utf16_length(item#>>'{}')>200 then return false;end if;
   total:=total+private.utf16_length(item#>>'{}');
  end loop;
 end if;
 if total>4000 then return false;end if;
 if value?'brandColors' then
  if jsonb_typeof(value->'brandColors')<>'array' or jsonb_array_length(value->'brandColors')>4 then return false;end if;
  for item in select * from jsonb_array_elements(value->'brandColors') loop
   if jsonb_typeof(item)<>'string' or (item#>>'{}')!~'^#[0-9a-fA-F]{6}$' then return false;end if;
  end loop;
 end if;
 if jsonb_typeof(value->'sources') is distinct from 'array' or jsonb_array_length(value->'sources')>9 then return false;end if;
 for item in select * from jsonb_array_elements(value->'sources') loop
  if jsonb_typeof(item)<>'object' or not item?&array['assetId','role'] or item-array['assetId','role']<>'{}'::jsonb or jsonb_typeof(item->'assetId')<>'string' or jsonb_typeof(item->'role')<>'string' then return false;end if;
  if (item->>'assetId')!~'^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$' then return false;end if;
  source:=(item->>'assetId')::uuid;
  if source=any(seen) or item->>'role' not in ('image','recording','logo') then return false;end if;seen:=array_append(seen,source);
  if item->>'role'='recording' then recordings:=recordings+1;else images:=images+1;end if;
  if (mode='education') or (mode='software' and item->>'role'='logo') or (mode='branding' and item->>'role'='recording') then return false;end if;
 end loop;
 if images>8 or recordings>1 or (mode='software' and images+recordings=0) or (mode='branding' and not exists(select 1 from jsonb_array_elements(value->'sources') s where s->>'role'='image')) then return false;end if;
 return true;
exception when invalid_text_representation or invalid_parameter_value or numeric_value_out_of_range then return false;
end $$;
commit;
