import {test,expect as baseExpect,type BrowserContext} from "@playwright/test";
import {execFileSync} from "node:child_process";
import {randomUUID} from "node:crypto";
import {EducationRunSchema} from "../../../shared/contracts/index";
const expect=baseExpect.configure({timeout:65000}),origin=`http://127.0.0.1:${process.env.PLAYWRIGHT_PORT??"3100"}`;
const owners:string[]=[],workers:string[]=[];
function sql(input:string){return execFileSync("docker",["exec","-i","supabase_db_ai-video-studio-local","psql","-X","-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1","-Atq"],{input,encoding:"utf8",windowsHide:true,stdio:["pipe","pipe","pipe"]}).trim();}
async function setup(context:BrowserContext){
 const csrf=(await(await context.request.get("/api/v1/auth/csrf")).json()).data.csrfToken;
 const response=await context.request.post("/api/v1/auth/sign-up",{data:{email:`w17-${randomUUID()}@example.invalid`,password:"Private-progress-test-2026!",displayName:"Progress Check"},headers:{Origin:origin,"X-CSRF-Token":csrf}});expect(response.status()).toBe(201);const owner=(await response.json()).data.user.id as string;if(!/^[a-f0-9-]{36}$/.test(owner))throw Error("Unsafe fixture");owners.push(owner);
 const project=randomUUID(),revision=randomUUID(),job=randomUUID(),worker=randomUUID();workers.push(worker);
 // Durable state fixtures only: no provider dispatch and no claimable jobs.
 sql(`begin;insert into public.projects(id,owner_id,title,mode,draft_input,preferences) values('${project}','${owner}','Hydroelectric explanation','education','{"mode":"education","topic":"How turbines work","audience":"beginner","intendedUse":"personal-learning","referenceNotes":"PRIVATE_PROGRESS_NOTES","sources":[]}','{"targetSeconds":60,"orientation":"landscape","voiceProfileId":"Kore"}');insert into public.revisions(id,project_id,owner_id,revision_number,input_hash,request_kind,target_seconds,orientation,voice_profile_id,schema_version,prompt_version,composition_version) values('${revision}','${project}','${owner}',1,repeat('a',64),'initial',60,'landscape','Kore',1,'v1','v1');insert into public.jobs(id,project_id,owner_id,revision_id,kind,status,available_at) values('${job}','${project}','${owner}','${revision}','generation','waiting_worker',now()+interval '1 year');insert into public.workers(id,label,enabled,protocol_version,capabilities,last_seen_at) values('${worker}','Progress state fixture',true,1,'{"modes":["education"],"orientations":["landscape"],"schemaVersions":[1],"compositionVersion":"v1"}',now());commit;`);
 return {owner,project,revision,job,worker};
}
type Fixture=Awaited<ReturnType<typeof setup>>;
function running(f:Fixture,stage="voice",completed=2){sql(`begin;update public.workers set last_seen_at=now() where id='${f.worker}';update public.jobs set status='running',stage='${stage}',worker_id='${f.worker}',worker_instance_id='${f.worker}',lease_token=1,lease_expires_at=now()+interval '10 minutes',last_heartbeat_at=now(),started_at=coalesce(started_at,now()),progress='{"completedScenes":${completed},"totalScenes":4}' where id='${f.job}' and owner_id='${f.owner}';commit;`);}
test.describe("W17 owned generation progress",()=>{
 test.skip(process.env.W05_AUTH_TESTS!=="1","Local Supabase required");test.setTimeout(240000);
 test.afterAll(()=>{
  if(owners.length){const ids=owners.map(id=>`'${id}'`).join(",");sql(`begin;delete from public.job_events where job_id in(select id from public.jobs where owner_id in(${ids}));delete from public.jobs where owner_id in(${ids});delete from public.revisions where owner_id in(${ids});delete from public.idempotency_requests where owner_id in(${ids});delete from public.projects where owner_id in(${ids});delete from public.usage_accounts where owner_id in(${ids});delete from public.profiles where id in(${ids});delete from auth.users where id in(${ids});commit;`);}
  if(workers.length)sql(`delete from public.workers where id in(${workers.map(id=>`'${id}'`).join(",")});`);
 });
 test("four actual stages restore after reload, update by polling and survive worker loss",async({page,context},info)=>{
  const f=await setup(context);await page.goto(`/projects/${f.project}/progress`);const panel=page.getByRole("region",{name:"Education generation",exact:true});
  await expect(panel.getByText("Waiting for a processing computer.",{exact:true})).toBeVisible();await expect(panel.getByRole("list",{name:"Generation stages"}).getByRole("listitem")).toHaveCount(4);await expect(panel.getByText("Not started",{exact:true})).toHaveCount(4);
  const response=await context.request.get(`/api/v1/projects/${f.project}/generation`);expect(response.headers()["cache-control"]).toBe("private, no-store");const run=EducationRunSchema.parse((await response.json()).data);expect(run.jobId).toBe(f.job);expect(JSON.stringify(run)).not.toMatch(/PRIVATE_PROGRESS_NOTES|workerId|leaseToken|objectKey/);
  running(f);await panel.getByRole("button",{name:"Check status",exact:true}).click();await expect(panel.getByText("Narration prepared: 2 of 4 scenes (50% of narration scenes).",{exact:true})).toBeVisible();await expect(panel.getByText("Complete",{exact:true})).toHaveCount(2);
  sql(`update public.jobs set progress='{"completedScenes":3,"totalScenes":4}' where id='${f.job}';`);await expect(panel.getByText("Narration prepared: 3 of 4 scenes (75% of narration scenes).",{exact:true})).toBeVisible();
  await page.reload();await expect(panel.getByText("Narration prepared: 3 of 4 scenes (75% of narration scenes).",{exact:true})).toBeVisible();
  sql(`update public.workers set last_seen_at=now()-interval '5 minutes' where id='${f.worker}';`);await panel.getByRole("button",{name:"Check status",exact:true}).click();await expect(panel.getByText("The processing computer is unavailable. Your request is saved.",{exact:true})).toBeVisible();await expect(panel.getByText("Waiting",{exact:true})).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`../../.cache/progress-offline-${info.project.name}.png`,fullPage:true});
  running(f,"story",0);await panel.getByRole("button",{name:"Check status",exact:true}).click();await expect(panel.getByText("In progress",{exact:true})).toHaveCount(1);await expect(panel.getByText("Complete",{exact:true})).toHaveCount(1);
 });
 test("provider waiting uses only known eligibility, preserves unsaved edits and recovers transient reads",async({page,context})=>{
  const f=await setup(context);let submissions=0;page.on("request",r=>{if(r.method()==="POST"&&r.url().endsWith("/generations"))submissions++;});
  sql(`update public.jobs set status='waiting_quota',stage='voice',started_at=now(),progress='{"completedScenes":1,"totalScenes":4}' where id='${f.job}';`);
  const editor=await context.newPage();await editor.goto(`/projects/${f.project}`);await page.goto(`/projects/${f.project}/progress`);const panel=page.getByRole("region",{name:"Education generation",exact:true}),topic=editor.getByRole("textbox",{name:"What would you like to explain?",exact:false});
  await expect(panel.getByText(/A provider retry time has not been confirmed/)).toBeVisible();await expect(panel.getByRole("button",{name:"Retry",exact:true})).toHaveCount(0);await topic.fill("Unsaved topic must survive progress failures");
  sql(`update public.jobs set retry_at=now()+interval '1 hour' where id='${f.job}';`);await panel.getByRole("button",{name:"Check status",exact:true}).click();await expect(panel.getByText(/Provider retry eligible after/)).toBeVisible();
  let fail=true;await page.route(`**/api/v1/projects/${f.project}/generation`,route=>fail?route.fulfill({status:503,json:{error:{code:"SERVICE_UNAVAILABLE"}}}):route.continue());
  await panel.getByRole("button",{name:"Check status",exact:true}).click();await expect(panel.getByRole("alert")).toContainText("Last known progress and your draft are preserved");await expect(topic).toHaveValue("Unsaved topic must survive progress failures");
  fail=false;await panel.getByRole("button",{name:"Try again",exact:true}).click();await expect(panel.getByRole("alert")).toHaveCount(0);await expect(topic).toHaveValue("Unsaved topic must survive progress failures");
  await context.setOffline(true);await panel.getByRole("button",{name:"Check status",exact:true}).click();await expect(panel.getByRole("alert")).toContainText("browser is offline");await expect(topic).toHaveValue("Unsaved topic must survive progress failures");
  await context.setOffline(false);await page.evaluate(()=>window.dispatchEvent(new Event("online")));await expect(panel.getByRole("alert")).toHaveCount(0);expect(submissions).toBe(0);
 });
 test("focus refresh resumes status checks and terminal jobs stop recurring polling",async({page,context})=>{
  const f=await setup(context);running(f,"story",0);await page.goto(`/projects/${f.project}/progress`);const panel=page.getByRole("region",{name:"Education generation",exact:true});await expect(panel.getByText("In progress",{exact:true})).toBeVisible();
  let hiddenReads=0;page.on("request",r=>{if(r.url().endsWith(`/projects/${f.project}/generation`))hiddenReads++;});
  // Visibility is simulated; requests and persisted job state remain real.
  await page.evaluate(()=>{Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"));});await page.waitForTimeout(6500);expect(hiddenReads).toBe(0);
  running(f,"render",4);await page.evaluate(()=>{Reflect.deleteProperty(document,"hidden");document.dispatchEvent(new Event("visibilitychange"));window.dispatchEvent(new Event("focus"));});await expect(panel.getByText("Complete",{exact:true})).toHaveCount(3);
  sql(`update public.jobs set status='failed',worker_id=null,worker_instance_id=null,lease_expires_at=null,last_heartbeat_at=null,finished_at=now() where id='${f.job}';`);await panel.getByRole("button",{name:"Check status",exact:true}).click();await expect(panel.getByText("Generation stopped. Your saved draft is preserved.",{exact:true})).toBeVisible();
  let reads=0;page.on("request",r=>{if(r.url().endsWith(`/projects/${f.project}/generation`))reads++;});await page.waitForTimeout(6500);expect(reads).toBe(0);expect(sql(`select count(*) from public.jobs where owner_id='${f.owner}';`)).toBe("1");
 });
});
