import {test,expect as baseExpect,type APIRequestContext} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const origin=`http://127.0.0.1:${process.env.PLAYWRIGHT_PORT??'3100'}`;
const owners:string[]=[];
// Allow bounded local API work and cold route compilation to settle.
const expect=baseExpect.configure({timeout:30000});
function sql(input:string){return execFileSync('docker',['exec','-i','supabase_db_ai-video-studio-local','psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-Atq'],{input,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']}).trim();}
async function mutate(api:APIRequestContext,path:string,body:unknown){const token=(await(await api.get('/api/v1/auth/csrf')).json()).data.csrfToken;return api.post('/api/v1/'+path,{data:body,headers:{Origin:origin,'X-CSRF-Token':token}});}
test.describe('W16 Education submission recovery',()=>{
 test.skip(process.env.W05_AUTH_TESTS!=='1','Local Supabase required');test.setTimeout(180000);
 test.afterAll(()=>{for(const actor of owners)sql(`begin;set constraints all deferred;select id from public.usage_accounts where scope='global' for update;update public.usage_accounts set reserved_bytes=reserved_bytes-coalesce((select reserved_bytes from public.usage_accounts where owner_id='${actor}'),0),reserved_outputs=reserved_outputs-coalesce((select reserved_outputs from public.usage_accounts where owner_id='${actor}'),0) where scope='global';delete from public.job_events where job_id in(select id from public.jobs where owner_id='${actor}');delete from public.usage_ledger where owner_id='${actor}';delete from public.idempotency_requests where owner_id='${actor}';delete from public.usage_reservations where owner_id='${actor}';delete from public.revision_assets where owner_id='${actor}';delete from public.jobs where owner_id='${actor}';delete from public.revisions where owner_id='${actor}';delete from public.projects where owner_id='${actor}';delete from public.usage_accounts where owner_id='${actor}';delete from public.profiles where id='${actor}';delete from auth.users where id='${actor}';commit;`);});
 test('validates consent, saves before enqueue and recovers a lost response without discarding later edits',async({page,context})=>{
  const result=await mutate(context.request,'auth/sign-up',{email:`w16-ui-${randomUUID()}@example.invalid`,password:'Private-education-ui-2026!',displayName:'Education Creator'});expect(result.status()).toBe(201);const actor=(await result.json()).data.user.id as string;expect(actor).toMatch(/^[a-f0-9-]{36}$/);owners.push(actor);
  // Only client availability is simulated. Admission/receipts/status are real
  // PostgreSQL/Auth operations, with global pauses restored before commit.
  await page.route('**/api/v1/capabilities',async route=>{const response=await route.fetch();const data=await response.json();data.data.educationCapabilities.generation=true;data.data.modes.find((m:{id:string})=>m.id==='education').generationAvailable=true;await route.fulfill({response,json:data});});
  let recovery=false,requests=0,firstKey='',firstBody:unknown;let project='';
  await page.route('**/api/v1/projects/*/generation',route=>recovery?route.continue():route.fulfill({json:{data:null}}));
  await page.route('**/api/v1/projects/*/generations',async route=>{
   requests++;const req=route.request(),body=req.postDataJSON(),key=req.headers()['idempotency-key'];project=new URL(req.url()).pathname.split('/')[4];
   if(requests===1){firstKey=key;firstBody=body;sql(`begin;select id from public.usage_accounts where scope='global' for update;insert into public.usage_accounts(scope,owner_id,byte_limit,output_limit) values('user','${actor}',400000000,3);select set_config('w16.original_pause',(select generation_paused::text from public.app_settings where id='global'),true);update public.app_settings set generation_paused=false where id='global';select set_config('request.jwt.claims','{"sub":"${actor}","role":"authenticated"}',true);select public.enqueue_generation('${project}','${key}','${JSON.stringify(body)}');update public.jobs set available_at=now()+interval '1 year' where owner_id='${actor}';update public.app_settings set generation_paused=current_setting('w16.original_pause')::boolean where id='global';commit;`);await route.abort('failed');}
   else{expect(key).toBe(firstKey);expect(body).toEqual(firstBody);recovery=true;await route.continue();}
  });
  await page.goto('/projects/new?mode=education');const generate=page.getByRole('button',{name:'Generate video',exact:true});await expect(generate).toBeEnabled();await generate.click();expect(requests).toBe(0);await expect(page.getByText('Enter a topic you want to explain.',{exact:true})).toBeVisible();
  const topic=page.getByRole('textbox',{name:'What would you like to explain?',exact:false});await topic.fill('Original learning topic');await page.locator('#education-use').selectOption('personal-learning');await page.getByLabel('I have permission to use any reference material I provide.').check();await page.getByLabel('I understand my inputs are processed by external AI services.').check();await generate.click();await expect(generate).toBeEnabled();expect(requests).toBe(1);
  await topic.fill('Edited while the response was uncertain');await generate.click();await expect(page.getByText("Your original generation is submitted. Your newer edits are still here; save them before opening progress.",{exact:true})).toBeVisible();await expect(topic).toHaveValue('Edited while the response was uncertain');expect(requests).toBe(2);expect(sql(`select count(*) from public.jobs where owner_id='${actor}';`)).toBe('1');
  await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page).toHaveURL(new RegExp('/projects/'+project+'$'));await expect(page.getByRole('textbox',{name:'What would you like to explain?',exact:false})).toHaveValue('Edited while the response was uncertain');expect(sql(`select input_snapshot->'input'->>'topic' from public.revisions where owner_id='${actor}';`)).toBe('Original learning topic');
 });

 test('new edits use a fresh attempt after capacity or pause rejection; uncertain failures retain the request',async({page,context})=>{
  const result=await mutate(context.request,'auth/sign-up',{email:`w16-rejection-${randomUUID()}@example.invalid`,password:'Private-education-ui-2026!',displayName:'Rejection Fixture'});expect(result.status()).toBe(201);const actor=(await result.json()).data.user.id as string;owners.push(actor);
  await page.route('**/api/v1/capabilities',async route=>{const response=await route.fetch();const data=await response.json();data.data.educationCapabilities.generation=true;data.data.modes.find((m:{id:string})=>m.id==='education').generationAvailable=true;await route.fulfill({response,json:data});});
  await page.route('**/api/v1/projects/*/generation',route=>route.fulfill({json:{data:null}}));
  const attempts:{key:string;body:{draftVersion:number}}[]=[];
  await page.route('**/api/v1/projects/*/generations',async route=>{
   attempts.push({key:route.request().headers()['idempotency-key'],body:route.request().postDataJSON()});
   const n=attempts.length;
   if(n===2||n===5){await route.abort('failed');return;}
   const status=n===1?409:503,code=n===1?'STORAGE_CAPACITY':n===4?'GENERATION_PAUSED':'SERVICE_UNAVAILABLE';
   await route.fulfill({status,json:{error:{code,message:code,retryable:false,requestId:randomUUID(),retryAt:null,fieldErrors:[]}}});
  });
  await page.goto('/projects/new?mode=education');const topic=page.getByRole('textbox',{name:'What would you like to explain?',exact:false});
  await topic.fill('Original capacity-rejected topic');await page.locator('#education-use').selectOption('personal-learning');await page.getByLabel('I have permission to use any reference material I provide.').check();await page.getByLabel('I understand my inputs are processed by external AI services.').check();
  const save=page.getByRole('button',{name:'Save draft',exact:true}),generate=page.getByRole('button',{name:'Generate video',exact:true});
  await save.click();await expect(page).toHaveURL(/\/projects\/[a-f0-9-]{36}$/);await expect(topic).toHaveValue('Original capacity-rejected topic');
  // Saving/remounting can reset consent, so explicitly retain valid submission.
  await page.getByLabel('I have permission to use any reference material I provide.').check();await page.getByLabel('I understand my inputs are processed by external AI services.').check();
  await generate.click();await expect(page.getByText('STORAGE_CAPACITY',{exact:true})).toBeVisible();expect(attempts).toHaveLength(1);
  await topic.fill('Edited after definitive rejection');await save.click();await expect(page.getByText('Draft saved.',{exact:true})).toBeVisible();await generate.click();await expect(generate).toBeEnabled();expect(attempts).toHaveLength(2);
  expect(attempts[1].key).not.toBe(attempts[0].key);expect(attempts[1].body.draftVersion).toBeGreaterThan(attempts[0].body.draftVersion);
  await generate.click();await expect(page.getByText('SERVICE_UNAVAILABLE',{exact:true})).toBeVisible();expect(attempts).toHaveLength(3);expect(attempts[2]).toEqual(attempts[1]);
  await generate.click();await expect(page.getByText('GENERATION_PAUSED',{exact:true})).toBeVisible();expect(attempts).toHaveLength(4);expect(attempts[3]).toEqual(attempts[1]);
  await topic.fill('Edited after confirmed pause');await save.click();await expect(page.getByText('Draft saved.',{exact:true})).toBeVisible();await generate.click();await expect(generate).toBeEnabled();expect(attempts).toHaveLength(5);
  expect(attempts[4].key).not.toBe(attempts[3].key);expect(attempts[4].body.draftVersion).toBeGreaterThan(attempts[3].body.draftVersion);expect(sql(`select count(*) from public.jobs where owner_id='${actor}';`)).toBe('0');
 });
});
