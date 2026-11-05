import {test,expect,type APIRequestContext} from "@playwright/test";
import {execFileSync} from "node:child_process";
import {randomUUID} from "node:crypto";
import {DashboardDtoSchema,IdSchema} from "../../../shared/contracts/index";
const origin=`http://127.0.0.1:${process.env.PLAYWRIGHT_PORT??"3100"}`;
const emails:string[]=[];
function sql(input:string){return execFileSync("docker",["exec","-i","supabase_db_ai-video-studio-local","psql","-X","-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1","-q"],{input,encoding:"utf8",stdio:["pipe","pipe","pipe"],windowsHide:true});}
async function signup(api:APIRequestContext) {
 const email=`w08-${randomUUID()}@example.invalid`;emails.push(email);
 const token=(await (await api.get("/api/v1/auth/csrf")).json()).data.csrfToken;
 const response=await api.post("/api/v1/auth/sign-up",{data:{email,password:"Dashboard-private-password!",displayName:"Dashboard Creator"},headers:{Origin:origin,"X-CSRF-Token":token}});
 expect(response.status(),await response.text()).toBe(201);return IdSchema.parse((await response.json()).data.user.id);
}
test.describe("W08 real dashboard",()=>{
 test.skip(process.env.W05_AUTH_TESTS!=="1","Uses only the local Supabase stack.");test.setTimeout(180_000);
 test.afterAll(()=>{
  if(!emails.length)return;for(const email of emails)if(!/^w08-[a-f0-9-]+@example\.invalid$/.test(email))throw Error("Unsafe fixture");
  const list=emails.map(email=>`'${email}'`).join(",");
  sql(`begin;delete from public.projects where owner_id in(select id from auth.users where email in(${list}));delete from public.usage_accounts where owner_id in(select id from auth.users where email in(${list}));delete from public.profiles where id in(select id from auth.users where email in(${list}));delete from auth.users where email in(${list});commit;`);
 });
 test("real empty/populated summaries, private boundaries, loading/retry and theme parity",async({page,context,browser})=>{
  expect((await context.request.get("/api/v1/dashboard")).status()).toBe(401);
  const owner=await signup(context.request);
  const emptyReply=await context.request.get("/api/v1/dashboard");expect(emptyReply.status()).toBe(200);expect(emptyReply.headers()["cache-control"]).toBe("private, no-store");
  const empty=DashboardDtoSchema.parse((await emptyReply.json()).data);expect(empty.projectCount).toBe(0);expect(empty.usage.reservedOutputs).toBeNull();
  // Delay a real read to observe loading; only the later failure is simulated transport.
  let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
  const delay=async(route:import("@playwright/test").Route)=>{await gate;await route.continue();};
  await page.route("**/api/v1/dashboard",delay);
  await page.goto("/dashboard");await expect(page.getByText("Loading your projects…",{exact:true})).toBeVisible();release();
  await expect(page.getByRole("heading",{name:"Your first project starts here"})).toBeVisible();await page.unroute("**/api/v1/dashboard",delay);
  await expect(page.getByText("Sample project data",{exact:true})).toHaveCount(0);
  await expect(page.locator("body")).toHaveCSS("background-color","rgb(247, 246, 242)");
  await expect(page.getByRole("heading",{name:"Bring your next idea to life."})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  const other=await browser.newContext({baseURL:origin});
  try {
   const foreign=await signup(other.request);const project=randomUUID(),foreignProject=randomUUID();
   sql(`begin;
insert into public.projects(id,owner_id,title,mode,draft_input) values('${project}','${owner}','My saved education project','education','{"referenceNotes":"PRIVATE_SOURCE_TEXT"}'),('${foreignProject}','${foreign}','Foreign private project','software','{}');
insert into public.usage_accounts(scope,owner_id,used_bytes,reserved_bytes,byte_limit,output_limit,reserved_outputs) values('user','${owner}',9007199254740993,1024,9007199254740995,3,1);commit;`);
   expect((await context.request.get(`/api/v1/dashboard?ownerId=${foreign}`)).status()).toBe(400);
   expect((await context.request.post("/api/v1/dashboard",{data:{}})).status()).toBe(405);
   const snapshot=(await (await context.request.get("/api/v1/dashboard")).json()).data;
   expect(DashboardDtoSchema.parse(snapshot).recentProjects.map(project=>project.title)).toEqual(["My saved education project"]);
   expect(JSON.stringify(snapshot)).not.toMatch(/PRIVATE_SOURCE_TEXT|Foreign private project|object_key|token_hash|draft_input/);
   const foreignSnapshot=DashboardDtoSchema.parse((await (await other.request.get("/api/v1/dashboard")).json()).data);
   expect(foreignSnapshot.recentProjects.map(project=>project.title)).toEqual(["Foreign private project"]);
   await page.getByRole("button",{name:"Refresh",exact:true}).click();
   await expect(page.getByRole("heading",{name:"My saved education project"})).toBeVisible();
   await expect(page.getByText("Foreign private project",{exact:true})).toHaveCount(0);
   await expect(page.getByText("9,007,199,254,740,993 bytes",{exact:true})).toBeVisible();
   await expect(page.getByText("Draft",{exact:true})).toBeVisible();
   const savedLabel=page.getByText("Reserved video slots",{exact:true}).locator("..");await expect(savedLabel).toContainText("1");
   // Mobile taps scroll Refresh into view. Capture from the top so off-screen
   // fixed accessibility controls aren't painted into a full-page screenshot.
   await page.evaluate(()=>window.scrollTo(0,0));
   const skip=await page.locator(".skip-link").boundingBox();
   expect(skip && skip.y+skip.height<=0).toBe(true);
   await page.screenshot({path:`../../.cache/w08-dashboard-${test.info().project.name}.png`,fullPage:true});
   await page.route("**/api/v1/dashboard",route=>route.fulfill({status:503,json:{error:{code:"SERVICE_UNAVAILABLE",message:"Unavailable",retryable:true,requestId:"test",retryAt:null,fieldErrors:[]}}}));
   await page.getByRole("button",{name:"Refresh",exact:true}).click();await expect(page.getByRole("region",{name:"Recent projects"}).getByRole("alert")).toContainText("We couldn’t load your dashboard");
   await page.unroute("**/api/v1/dashboard");await page.getByRole("button",{name:"Try again",exact:true}).click();await expect(page.getByRole("heading",{name:"My saved education project"})).toBeVisible();
   await context.clearCookies();await page.getByRole("button",{name:"Refresh",exact:true}).click();await expect(page).toHaveURL(/\/session-expired\?next=%2Fdashboard/);
  } finally {await other.close();}
 });
});
