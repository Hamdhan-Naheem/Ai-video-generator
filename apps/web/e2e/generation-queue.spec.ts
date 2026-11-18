import {test,expect as baseExpect,type APIRequestContext,type BrowserContext} from "@playwright/test";
import {execFileSync} from "node:child_process";
import {randomUUID} from "node:crypto";
import {ErrorEnvelopeSchema,QueuedResultSchema,JobDtoSchema,ProjectDtoSchema} from "../../../shared/contracts/index";
const expect=baseExpect.configure({timeout:65000});
const origin=`http://127.0.0.1:${process.env.PLAYWRIGHT_PORT??"3100"}`;
const users:string[]=[];
const request={draftVersion:1,preferences:{targetSeconds:60,orientation:"landscape",voiceProfileId:"Kore"},acknowledgments:{sourceRights:true,externalAiProcessing:true,policyVersion:"v1"}};
function sql(input:string){return execFileSync("docker",["exec","-i","supabase_db_ai-video-studio-local","psql","-X","-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1","-Atq"],{input,encoding:"utf8",windowsHide:true,stdio:["pipe","pipe","pipe"]});}
async function mutate(api:APIRequestContext,path:string,body:unknown,key?:string,method="POST"){
 const token=(await(await api.get("/api/v1/auth/csrf")).json()).data.csrfToken;
 return api.fetch(`/api/v1/${path}`,{method,data:body,headers:{Origin:origin,"X-CSRF-Token":token,...(key?{"Idempotency-Key":key}:{})}});
}
async function signup(context:BrowserContext){const email=`w14-api-${randomUUID()}@example.invalid`;const r=await mutate(context.request,"auth/sign-up",{email,password:"Queue-fixture-private-2026!",displayName:"Queue Creator"});expect(r.status(),await r.text()).toBe(201);const id=(await r.json()).data.user.id as string;if(!/^[a-f0-9-]{36}$/.test(id))throw Error("Unsafe fixture");users.push(id);return id;}
async function error(response:Awaited<ReturnType<APIRequestContext["get"]>>,status:number,code:string){expect(response.status(),await response.text()).toBe(status);const value=ErrorEnvelopeSchema.parse(await response.json());expect(value.error.code).toBe(code);return value.error;}

test.describe("W14 local durable admission API",()=>{
 test.skip(process.env.W05_AUTH_TESTS!=="1","Requires the existing local Supabase stack");test.setTimeout(240000);
 test.afterAll(()=>{if(!users.length)return;const list=users.map(id=>`'${id}'`).join(",");sql(`begin;set constraints all deferred;select id from public.usage_accounts where scope='global' for update;update public.usage_accounts set used_bytes=used_bytes-coalesce((select sum(used_bytes) from public.usage_accounts where owner_id in(${list})),0),reserved_bytes=reserved_bytes-coalesce((select sum(reserved_bytes) from public.usage_accounts where owner_id in(${list})),0),retained_outputs=retained_outputs-coalesce((select sum(retained_outputs) from public.usage_accounts where owner_id in(${list})),0),reserved_outputs=reserved_outputs-coalesce((select sum(reserved_outputs) from public.usage_accounts where owner_id in(${list})),0) where scope='global';delete from public.job_events where job_id in(select id from public.jobs where owner_id in(${list}));delete from public.usage_ledger where owner_id in(${list});delete from public.idempotency_requests where owner_id in(${list});delete from public.usage_reservations where owner_id in(${list});delete from public.revision_assets where owner_id in(${list});delete from public.jobs where owner_id in(${list});delete from public.revisions where owner_id in(${list});delete from public.projects where owner_id in(${list});delete from public.usage_accounts where owner_id in(${list});delete from public.profiles where id in(${list});delete from auth.users where id in(${list});commit;`);});
 test("paused admission, receipt recovery, safe status and ownership use actual Auth/SQL",async({page,context,browser})=>{
  expect(sql("select generation_paused from public.app_settings where id='global';").trim()).toBe("t");
  await error(await context.request.get(`/api/v1/jobs/${randomUUID()}`),401,"AUTH_REQUIRED");
  const owner=await signup(context),key=randomUUID();
  const created=await mutate(context.request,"projects",{mode:"education",title:"Queue fixture",draftInput:{mode:"education",topic:"PRIVATE_QUEUE_TOPIC",audience:"beginner",intendedUse:"personal-learning"}},randomUUID());expect(created.status()).toBe(201);const project=ProjectDtoSchema.parse((await created.json()).data);
  const path=`projects/${project.id}/generations`;
  await error(await mutate(context.request,path,request,key),503,"GENERATION_PAUSED");
  await error(await mutate(context.request,path,request),422,"VALIDATION_FAILED");
  for(const extra of [{ownerId:randomUUID()},{input:{topic:"forged"}},{sources:[]}])await error(await mutate(context.request,path,{...request,...extra},randomUUID()),422,"VALIDATION_FAILED");
  await error(await mutate(context.request,path,{...request,acknowledgments:{...request.acknowledgments,sourceRights:false}},randomUUID()),422,"VALIDATION_FAILED");
  await error(await mutate(context.request,path+"?source=private",request,key),400,"INVALID_QUERY");
  expect((await context.request.get(`/api/v1/${path}`)).status()).toBe(405);
  await error(await context.request.post(`/api/v1/${path}`,{data:request,headers:{Origin:origin}}),403,"CSRF_REJECTED");
  // Create a real receipt through the actual enqueue RPC inside one isolated
  // transaction. No other session ever observes generation_paused=false.
  const output=sql(`begin;select id from public.usage_accounts where scope='global' for update;select set_config('w14.original_pause',(select generation_paused::text from public.app_settings where id='global'),true);insert into public.usage_accounts(scope,owner_id,byte_limit,output_limit) values('user','${owner}',400000000,3);update public.app_settings set generation_paused=false where id='global';set local role authenticated;select set_config('request.jwt.claims','{"sub":"${owner}","role":"authenticated"}',true);select 'W14_RECEIPT:'||public.enqueue_generation('${project.id}','${key}','${JSON.stringify(request)}')::text;reset role;update public.app_settings set generation_paused=current_setting('w14.original_pause')::boolean where id='global';commit;`);
  const receipt=QueuedResultSchema.parse(JSON.parse(output.split("\n").find(line=>line.startsWith("W14_RECEIPT:"))!.slice(12)));expect(receipt.status).toBe("waiting_worker");
  for(const response of await Promise.all([mutate(context.request,path,request,key),mutate(context.request,path,request,key)])){expect(response.status(),await response.text()).toBe(202);const value=QueuedResultSchema.parse((await response.json()).data);expect(value.jobId).toBe(receipt.jobId);expect(value.reused).toBe(true);expect(response.headers().location).toBe(receipt.statusUrl);expect(response.headers()["cache-control"]).toBe("private, no-store");}
  const status=await context.request.get(receipt.statusUrl);expect(status.status()).toBe(200);const job=JobDtoSchema.parse((await status.json()).data);expect(job.status).toBe("waiting_worker");expect(job.progress.activeMs).toBe("0");expect(job.canCancel).toBe(false);expect(JSON.stringify(job)).not.toContain("PRIVATE_QUEUE_TOPIC");
  await error(await context.request.get(receipt.statusUrl+"?token=private"),400,"INVALID_QUERY");expect((await context.request.post(receipt.statusUrl,{data:{}})).status()).toBe(405);
  await error(await mutate(context.request,path,{...request,preferences:{...request.preferences,targetSeconds:75}},key),409,"IDEMPOTENCY_CONFLICT");const active=await error(await mutate(context.request,path,request,randomUUID()),409,"ACTIVE_JOB_EXISTS");expect(active.details).toEqual({jobId:receipt.jobId});
  const patch=await mutate(context.request,`projects/${project.id}`,{expectedDraftVersion:1,draftInput:{...project.draftInput,topic:"Edited after enqueue"}},undefined,"PATCH");expect(patch.status()).toBe(200);
  const stale=await error(await mutate(context.request,path,request,randomUUID()),409,"DRAFT_VERSION_CONFLICT");expect(stale.details).toEqual({currentDraftVersion:2});expect((await mutate(context.request,path,request,key)).status()).toBe(202);
  expect(sql(`select input_snapshot->'input'->>'topic' from public.revisions where id='${receipt.revisionId}';`).trim()).toBe("PRIVATE_QUEUE_TOPIC");expect(sql(`select concat((select count(*) from public.jobs where owner_id='${owner}'),'|',(select reserved_bytes from public.usage_accounts where owner_id='${owner}'));`).trim()).toBe("1|167772160");
  const other=await browser.newContext({baseURL:origin});try{await signup(other);await error(await other.request.get(receipt.statusUrl),404,"NOT_FOUND");await error(await mutate(other.request,path,request,randomUUID()),404,"NOT_FOUND");}finally{await other.close();}
  await page.goto(`/projects/${project.id}`);await expect(page.getByRole("button",{name:"Generate video",exact:true})).toBeDisabled();await expect(page.getByRole("textbox",{name:"What would you like to explain?",exact:true})).toHaveValue("Edited after enqueue");
  sql(`update public.profiles set status='disabled' where id='${owner}';`);await error(await context.request.get(receipt.statusUrl),403,"ACCOUNT_DISABLED");expect(sql("select generation_paused from public.app_settings where id='global';").trim()).toBe("t");
 });
});
