import {test,expect,type APIRequestContext,type BrowserContext} from "@playwright/test";
import {execFileSync} from "node:child_process";
import {randomUUID} from "node:crypto";
import {ProjectDtoSchema} from "../../../shared/contracts/index";
const origin=`http://127.0.0.1:${process.env.PLAYWRIGHT_PORT??"3100"}`;
const emails:string[]=[];const password="Draft-workflow-private-2026!";
function sql(input:string){return execFileSync("docker",["exec","-i","supabase_db_ai-video-studio-local","psql","-X","-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1","-Atq"],{input,encoding:"utf8",windowsHide:true,stdio:["pipe","pipe","pipe"]});}
async function mutate(api:APIRequestContext,path:string,body:unknown,method="POST",key?:string){
 const token=(await(await api.get("/api/v1/auth/csrf")).json()).data.csrfToken;
 return api.fetch(`/api/v1/${path}`,{method,data:body,headers:{Origin:origin,"X-CSRF-Token":token,...(key?{"Idempotency-Key":key}:{})}});
}
async function signup(context:BrowserContext){
 const email=`w09-${randomUUID()}@example.invalid`;emails.push(email);
 const response=await mutate(context.request,"auth/sign-up",{email,password,displayName:"Draft Creator"});expect(response.status(),await response.text()).toBe(201);
 return {email,id:(await response.json()).data.user.id as string};
}
test.describe("W09 real owned project drafts",()=>{
 test.skip(process.env.W05_AUTH_TESTS!=="1","Requires the local Supabase stack.");test.setTimeout(240_000);
 test.afterAll(()=>{
  if(!emails.length)return;for(const email of emails)if(!/^w09-[a-f0-9-]+@example\.invalid$/.test(email))throw Error("Unsafe fixture");
  const list=emails.map(email=>`'${email}'`).join(",");
  sql(`begin;delete from public.idempotency_requests where owner_id in(select id from auth.users where email in(${list}));delete from public.projects where owner_id in(select id from auth.users where email in(${list}));delete from public.usage_accounts where owner_id in(select id from auth.users where email in(${list}));delete from public.profiles where id in(select id from auth.users where email in(${list}));delete from auth.users where email in(${list});commit;`);
 });
 test("education incomplete save, reopen, preferences, conflicts and safe return after expiry",async({page,context})=>{
  const user=await signup(context);let creates=0;
  page.on("request",request=>{if(request.method()==="POST" && request.url().endsWith("/api/v1/projects"))creates++;});
  await page.goto("/dashboard");await page.getByRole("link",{name:"Create video",exact:true}).first().click();
  await expect(page).toHaveURL(/\/projects\/new$/);await page.getByRole("link",{name:"Create education video"}).click();
  await expect(page.getByRole("heading",{name:"Create an education video"})).toBeVisible();expect(creates).toBe(0);
  await expect(page.getByRole("button",{name:"Generate video"})).toBeDisabled();
  const created=page.waitForResponse(response=>response.request().method()==="POST" && response.url().endsWith("/api/v1/projects"));
  await page.getByRole("button",{name:"Save draft",exact:true}).click();const result=await created;expect(result.status(),await result.text()).toBe(201);
  const project=ProjectDtoSchema.parse((await result.json()).data);expect(project.title).toBe("Untitled education video");expect(project.draftVersion).toBe(1);
  expect(result.request().headers()["idempotency-key"]).toBeTruthy();await expect(page).toHaveURL(new RegExp(`/projects/${project.id}$`));
  await expect(page.getByRole("textbox",{name:"Project title"})).toHaveValue(project.title);
  await page.getByRole("textbox",{name:"Project title"}).fill("My education draft");await page.getByRole("textbox",{name:"What would you like to explain?"}).fill("How turbines generate electricity");
  await page.getByRole("radio",{name:/75 sec/}).check();await page.getByRole("radio",{name:/Portrait/}).check();
  await page.locator("summary").filter({hasText:"Optional details"}).click();await page.getByRole("textbox",{name:"Reference notes",exact:true}).fill("PRIVATE_DRAFT_REFERENCE");
  await expect(page.getByRole("checkbox").first()).not.toBeChecked();
  await page.getByRole("button",{name:"Save draft",exact:true}).click();await expect(page.getByText("Draft saved.",{exact:true})).toBeVisible();
  await page.reload();await expect(page.getByRole("textbox",{name:"Project title"})).toHaveValue("My education draft");await expect(page.getByRole("radio",{name:/75 sec/})).toBeChecked();await expect(page.getByRole("radio",{name:/Portrait/})).toBeChecked();
  const second=await context.newPage();
  try {
   await second.goto(`/projects/${project.id}`);await expect(second.getByRole("textbox",{name:"Project title"})).toHaveValue("My education draft");
   await second.getByRole("textbox",{name:"Project title"}).fill("First editor wins");await second.getByRole("button",{name:"Save draft",exact:true}).click();await expect(second.getByText("Draft saved.",{exact:true})).toBeVisible();
   await page.getByRole("textbox",{name:"Project title"}).fill("Keep this stale edit");await page.getByRole("button",{name:"Save draft",exact:true}).click();
   await expect(page.getByText(/This draft changed in another tab/)).toBeVisible();await expect(page.getByRole("textbox",{name:"Project title"})).toHaveValue("Keep this stale edit");await expect(page.getByRole("button",{name:"Save draft",exact:true})).toBeDisabled();
   await page.getByRole("button",{name:"Reload saved draft (replaces your edits)"}).click();await expect(page.getByRole("textbox",{name:"Project title"})).toHaveValue("First editor wins");
  } finally {await second.close();}
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`../../.cache/w09-education-${test.info().project.name}.png`,fullPage:true});
  await page.getByRole("link",{name:"Back to dashboard",exact:true}).click();await expect(page.getByRole("heading",{name:"First editor wins"})).toBeVisible();await page.getByRole("link",{name:"Continue draft",exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${project.id}$`));
  await page.getByRole("textbox",{name:"Project title"}).fill("Never replay after expiry");await context.clearCookies();await page.getByRole("button",{name:"Save draft",exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`/session-expired\\?next=%2Fprojects%2F${project.id}$`));await page.getByRole("link",{name:"Sign in",exact:true}).click();
  await page.getByLabel("Email",{exact:true}).fill(user.email);await page.getByLabel("Password",{exact:true}).fill(password);await page.getByRole("button",{name:"Sign in",exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${project.id}$`),{timeout:65_000});await expect(page.getByRole("textbox",{name:"Project title"})).toHaveValue("First editor wins");
  expect(sql(`select concat((select count(*) from public.jobs where owner_id='${user.id}'),'|',(select count(*) from public.usage_reservations where owner_id='${user.id}'));`).trim()).toBe("0|0");
 });
 test("project API isolates owners, validates input, deduplicates concurrent create and rejects stale writes",async({context,browser})=>{
  const owner=await signup(context),key=randomUUID();for(const path of ["capabilities","voices"]){const response=await context.request.get("/api/v1/"+path);expect(response.status()).toBe(200);expect(response.headers()["cache-control"]).toBe("private, no-store");expect((await context.request.get("/api/v1/"+path+"?unexpected=1")).status()).toBe(400);}const catalog=(await(await context.request.get("/api/v1/capabilities")).json()).data;expect(catalog.durations).toEqual([60,75,90]);expect(catalog.modes.every((mode:{generationAvailable:boolean})=>!mode.generationAvailable)).toBe(true);const voices=(await(await context.request.get("/api/v1/voices")).json()).data;expect(voices.items[0].id).toBe("Kore");const body={mode:"education",title:"Concurrent draft",draftInput:{mode:"education",topic:"Private topic"}};
  const token=(await(await context.request.get("/api/v1/auth/csrf")).json()).data.csrfToken;
  const headers={Origin:origin,"X-CSRF-Token":token,"Idempotency-Key":key};
  const replies=await Promise.all([0,1].map(()=>context.request.post("/api/v1/projects",{data:body,headers})));for(const response of replies)expect(response.status(),await response.text()).toBe(201);
  const first=ProjectDtoSchema.parse((await replies[0].json()).data),again=ProjectDtoSchema.parse((await replies[1].json()).data);expect(first.id).toBe(again.id);
  expect((await mutate(context.request,"projects",{...body,title:"Different"},"POST",key)).status()).toBe(409);
  expect((await mutate(context.request,"projects",{mode:"education",ownerId:randomUUID()})).status()).toBe(422);
  expect((await mutate(context.request,"projects",{mode:"software",draftInput:{mode:"software",sources:[{assetId:randomUUID(),role:"image"}]}})).status()).toBe(422);
  expect((await mutate(context.request,`projects/${first.id}`,{expectedDraftVersion:1,draftInput:{mode:"software"}},"PATCH")).status()).toBe(422);
  const writes=await Promise.all(["Editor A","Editor B"].map(title=>context.request.patch(`/api/v1/projects/${first.id}`,{data:{expectedDraftVersion:1,title},headers})));expect(writes.map(response=>response.status()).sort()).toEqual([200,409]);
  const winner=await writes.find(response=>response.status()===200)!.json();expect(winner.data.draftVersion).toBe(2);
  const read=await context.request.get(`/api/v1/projects/${first.id}`);expect(read.headers()["cache-control"]).toBe("private, no-store");expect((await read.json()).data.title).toBe(winner.data.title);
  expect((await context.request.get(`/api/v1/projects/${first.id}?ownerId=${owner.id}`)).status()).toBe(400);
  const foreign=await browser.newContext({baseURL:origin});
  try {
   await signup(foreign);expect((await foreign.request.get(`/api/v1/projects/${first.id}`)).status()).toBe(404);expect((await foreign.request.get(`/api/v1/projects/${randomUUID()}`)).status()).toBe(404);
   expect((await mutate(foreign.request,`projects/${first.id}`,{expectedDraftVersion:2,title:"Attack"},"PATCH")).status()).toBe(404);
   const own=await mutate(foreign.request,"projects",body,"POST",key);expect(own.status()).toBe(201);expect((await own.json()).data.id).not.toBe(first.id);
  } finally {await foreign.close();}
  expect(sql(`select count(*) from public.projects where owner_id='${owner.id}';`).trim()).toBe("1");
  sql(`update public.projects set deleted_at=now() where id='${first.id}' and owner_id='${owner.id}';`);
  expect((await context.request.get(`/api/v1/projects/${first.id}`)).status()).toBe(404);expect((await mutate(context.request,"projects",body,"POST",key)).status()).toBe(404);
 });
 test("software text/settings and branding metadata drafts persist without enabling generation",async({page,context})=>{
  await signup(context);await page.goto("/projects/new?mode=software");
  await page.getByRole("textbox",{name:"Project title"}).fill("Software draft");await page.getByRole("textbox",{name:"Features to highlight"}).fill("A clear booking workflow");
  await page.getByRole("button",{name:"Save draft",exact:true}).click();await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/);await page.reload();
  await expect(page.getByRole("textbox",{name:"Features to highlight"})).toHaveValue("A clear booking workflow");await expect(page.getByRole("button",{name:"Generate video"})).toBeDisabled();
  await page.getByRole("textbox",{name:"What does your software do?"}).fill("x".repeat(2500));await page.getByRole("textbox",{name:"Features to highlight"}).fill("x".repeat(1501));await page.getByRole("button",{name:"Save draft",exact:true}).click();await expect(page.getByText(/Check the draft’s field lengths/)).toBeVisible();
  await page.getByRole("textbox",{name:"Features to highlight"}).fill("Booking tools");await page.getByRole("button",{name:"Save draft",exact:true}).click();await expect(page.getByText("Draft saved.",{exact:true})).toBeVisible();
  await page.getByRole("link",{name:"All video types"}).click();await page.getByRole("link",{name:"Create branding video"}).click();await expect(page.getByText(/full product-branding form is coming later/)).toBeVisible();
  await page.getByRole("textbox",{name:"Project title"}).fill("Branding draft");await page.getByRole("radio",{name:/Portrait/}).check();await page.getByRole("button",{name:"Save draft",exact:true}).click();await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/);await page.reload();await expect(page.getByRole("textbox",{name:"Project title"})).toHaveValue("Branding draft");await expect(page.getByRole("radio",{name:/Portrait/})).toBeChecked();await expect(page.getByRole("button",{name:"Generate video"})).toBeDisabled();
  await expect(page.locator("body")).toHaveCSS("background-color","rgb(247, 246, 242)");expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 });
});
