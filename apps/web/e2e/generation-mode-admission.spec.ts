import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {ErrorEnvelopeSchema} from '../../../shared/contracts/index.ts';
const origin=`http://127.0.0.1:${process.env.PLAYWRIGHT_PORT??'3100'}`;
function sql(input:string){return execFileSync('docker',['exec','-i','supabase_db_ai-video-studio-local','psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-Atq'],{input,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']}).trim();}
test('Coming soon modes reject direct authenticated API submission without consuming generation capacity',async({request})=>{
 test.skip(process.env.W05_AUTH_TESTS!=='1','Existing local Supabase required');test.setTimeout(180000);
 expect(sql(`select (not generation_paused and limits->'enabledGenerationModes'='["education"]'::jsonb)::text from public.app_settings where id='global';`)).toBe('true');
 let owner='';
 async function post(path:string,body:unknown){const token=(await(await request.get('/api/v1/auth/csrf')).json()).data.csrfToken;return request.post('/api/v1/'+path,{data:body,headers:{Origin:origin,'X-CSRF-Token':token,'Idempotency-Key':randomUUID()}});}
 try{
  const signup=await post('auth/sign-up',{email:'mode-api-'+randomUUID()+'@example.invalid',password:'Mode-fixture-private-2026!',displayName:'Mode Fixture'});expect(signup.status()).toBe(201);const id=(await signup.json()).data.user.id as string;if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid fixture identity');owner=id;
  sql(`insert into public.usage_accounts(scope,owner_id,byte_limit,output_limit) values('user','${owner}',200000000,3);`);
  for(const mode of ['software','branding']){
   const project=randomUUID(),draft={mode,intendedUse:'personal-learning',sources:[],...(mode==='software'?{softwareName:'App',brief:'Explain its features'}:{productName:'Bag'})};
   sql(`insert into public.projects(id,owner_id,title,mode,draft_input) values('${project}','${owner}','Mode fixture','${mode}','${JSON.stringify(draft)}');`);
   sql(`select set_config('request.jwt.claims','{"sub":"${owner}","role":"authenticated"}',false);select public.reserve_source_upload('${project}',1,'mode-source',repeat('a',64),'fixture.png','image/png',68,'image');`);
   expect(sql(`select private.complete_generation_input(draft_input||jsonb_build_object('mode',mode,'title',title),mode)::text from public.projects where id='${project}';`)).toBe('true');
   const before=sql(`select used_bytes||'|'||reserved_bytes||'|'||reserved_outputs from public.usage_accounts where owner_id='${owner}';`);
   const response=await post('projects/'+project+'/generations',{draftVersion:2,preferences:{targetSeconds:60,orientation:'landscape',voiceProfileId:'Kore'},acknowledgments:{sourceRights:true,externalAiProcessing:true,policyVersion:'v1'}});
   expect(response.status()).toBe(503);expect(ErrorEnvelopeSchema.parse(await response.json()).error.code).toBe('GENERATION_PAUSED');
   expect(sql(`select used_bytes||'|'||reserved_bytes||'|'||reserved_outputs from public.usage_accounts where owner_id='${owner}';`)).toBe(before);
  }
  for(const table of ['jobs','revisions'])expect(sql(`select count(*) from public.${table} where owner_id='${owner}';`)).toBe('0');
  expect(sql(`select count(*) from public.usage_reservations where owner_id='${owner}' and kind='generation';`)).toBe('0');
  expect(sql(`select count(*) from public.idempotency_requests where owner_id='${owner}' and operation like 'enqueue_generation:%';`)).toBe('0');
  expect(sql(`select (reserved_outputs=0)::text from public.usage_accounts where owner_id='${owner}';`)).toBe('true');
 }finally{
  if(owner)sql(`begin;set constraints all deferred;select id from public.usage_accounts where scope='global' for update;update public.usage_accounts set used_bytes=used_bytes-coalesce((select used_bytes from public.usage_accounts where owner_id='${owner}'),0),reserved_bytes=reserved_bytes-coalesce((select reserved_bytes from public.usage_accounts where owner_id='${owner}'),0) where scope='global';delete from public.usage_ledger where owner_id='${owner}';delete from public.cleanup_tasks where owner_id='${owner}';delete from public.idempotency_requests where owner_id='${owner}';delete from public.usage_reservations where owner_id='${owner}';delete from public.upload_allocations where owner_id='${owner}';delete from public.assets where owner_id='${owner}';delete from public.projects where owner_id='${owner}';delete from public.usage_accounts where owner_id='${owner}';delete from public.profiles where id='${owner}';delete from auth.users where id='${owner}';commit;`);
 }
});
