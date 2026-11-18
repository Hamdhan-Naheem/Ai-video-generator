import {test,expect as baseExpect,type BrowserContext} from "@playwright/test";
import {randomUUID} from "node:crypto";
import {execFileSync} from "node:child_process";
import {createClient} from "@supabase/supabase-js";
const expect=baseExpect.configure({timeout:65000}),origin=`http://127.0.0.1:${process.env.PLAYWRIGHT_PORT??"3100"}`;
const owners:string[]=[],storageKeys:string[]=[];
function sql(input:string){return execFileSync("docker",["exec","-i","supabase_db_ai-video-studio-local","psql","-X","-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1","-Atq"],{input,encoding:"utf8",windowsHide:true,stdio:["pipe","pipe","pipe"]});}
async function mutation(context:BrowserContext,path:string,method:"POST"|"DELETE",data:unknown){const csrf=(await(await context.request.get("/api/v1/auth/csrf")).json()).data.csrfToken;return context.request.fetch("/api/v1/"+path,{method,data,headers:{Origin:origin,"X-CSRF-Token":csrf}});}
async function signup(context:BrowserContext){const r=await mutation(context,"auth/sign-up","POST",{email:`draft-delete-${randomUUID()}@example.invalid`,password:"Private-draft-delete-2026!",displayName:"Draft Delete Owner"});expect(r.status()).toBe(201);const id=(await r.json()).data.user.id as string;if(!/^[a-f0-9-]{36}$/.test(id))throw Error("Unsafe fixture");owners.push(id);return id;}
async function draft(context:BrowserContext,mode="education",title="Delete test draft"){const r=await mutation(context,"projects","POST",{title,mode,draftInput:{mode,sources:[]},preferences:{}});expect(r.status()).toBe(201);return (await r.json()).data;}
function storage(){const raw=execFileSync(process.execPath,["../../node_modules/supabase/dist/supabase.js","status","-o","json"],{encoding:"utf8",windowsHide:true,stdio:["ignore","pipe","pipe"]}),c=JSON.parse(raw);if(c.API_URL!=="http://127.0.0.1:55421")throw Error("Local stack only");return createClient(c.API_URL,c.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});}
test.describe("saved draft deletion",()=>{
 test.skip(process.env.W05_AUTH_TESTS!=="1","Local Supabase required");test.setTimeout(240000);
 test.afterAll(async()=>{
  if(storageKeys.length){const result=await storage().storage.from("sources").remove(storageKeys);if(result.error)throw Error("Fixture storage cleanup failed");}
  if(!owners.length)return;const ids=owners.map(id=>`'${id}'`).join(",");
  sql(`begin;select id from public.usage_accounts where scope='global' for update;update public.usage_accounts set used_bytes=used_bytes-coalesce((select sum(used_bytes) from public.usage_accounts where owner_id in(${ids})),0),reserved_bytes=reserved_bytes-coalesce((select sum(reserved_bytes) from public.usage_accounts where owner_id in(${ids})),0) where scope='global';delete from public.cleanup_tasks where owner_id in(${ids});delete from public.revision_assets where owner_id in(${ids});delete from public.jobs where owner_id in(${ids});delete from public.revisions where owner_id in(${ids});delete from public.usage_ledger where owner_id in(${ids});delete from public.usage_reservations where owner_id in(${ids});delete from public.upload_allocations where owner_id in(${ids});delete from public.assets where owner_id in(${ids});delete from public.idempotency_requests where owner_id in(${ids});delete from public.projects where owner_id in(${ids});delete from public.usage_accounts where owner_id in(${ids});delete from public.profiles where id in(${ids});delete from auth.users where id in(${ids});commit;`);
 });
 test("confirmation, access checks, lost-response retry and persisted removal",async({page,context,browser},info)=>{
  const id=randomUUID();expect((await mutation(context,`projects/${id}/draft`,"DELETE",{expectedDraftVersion:1})).status()).toBe(401);
  await signup(context);const project=await draft(context);
  expect((await context.request.delete(`/api/v1/projects/${project.id}/draft`,{data:{expectedDraftVersion:1},headers:{Origin:origin}})).status()).toBe(403);
  expect((await mutation(context,`projects/${project.id}/draft`,"POST",{})).status()).toBe(405);
  expect((await mutation(context,`projects/${project.id}/draft`,"DELETE",{expectedDraftVersion:1,ownerId:id})).status()).toBe(422);
  const other=await browser.newContext({baseURL:origin});try{await signup(other);expect((await mutation(other,`projects/${project.id}/draft`,"DELETE",{expectedDraftVersion:1})).status()).toBe(404);}finally{await other.close();}
  await page.goto("/drafts");const card=page.getByRole("article").filter({has:page.getByRole("heading",{name:"Delete test draft",exact:true})});await card.getByRole("button",{name:/Delete draft/}).click();
  const dialog=page.getByRole("dialog",{name:"Delete saved draft?"});await expect(dialog.getByRole("button",{name:"Cancel",exact:true})).toBeFocused();await page.keyboard.press("Escape");await expect(dialog).not.toBeVisible();await expect(card).toBeVisible();
  await card.getByRole("button",{name:/Delete draft/}).click();await dialog.getByRole("button",{name:"Cancel",exact:true}).click();await expect(card).toBeVisible();
  let lose=true;await page.route(`**/api/v1/projects/${project.id}/draft`,async route=>{if(lose){lose=false;const response=await route.fetch();expect(response.status()).toBe(202);await route.fulfill({status:503,json:{error:{code:"SERVICE_UNAVAILABLE"}}});}else await route.continue();});
  await card.getByRole("button",{name:/Delete draft/}).click();await dialog.getByRole("button",{name:"Delete draft",exact:true}).click();await expect(dialog.getByRole("alert")).toBeVisible();await expect(card).toBeVisible();
  await dialog.getByRole("button",{name:"Delete draft",exact:true}).click();await expect(dialog).not.toBeVisible();await expect(card).toHaveCount(0);await expect(page.getByRole("heading",{name:"Saved drafts",exact:true})).toBeFocused();
  await expect(page.getByRole("heading",{name:"No saved drafts yet",exact:true})).toBeVisible();await page.reload();await expect(page.getByRole("heading",{name:"No saved drafts yet",exact:true})).toBeVisible();expect((await context.request.get(`/api/v1/projects/${project.id}`)).status()).toBe(404);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`../../.cache/draft-delete-${info.project.name}.png`});
 });
 test("stale versions and active generation block deletion while history survives",async({page,context})=>{
  const owner=await signup(context),project=await draft(context,"software","History draft"),revision=randomUUID(),job=randomUUID();await page.goto("/drafts");const card=page.getByRole("article").first();await expect(card).toBeVisible();
  sql(`update public.projects set title='Updated history draft' where id='${project.id}' and owner_id='${owner}';`);
  await card.getByRole("button",{name:/Delete draft/}).click();const dialog=page.getByRole("dialog");await dialog.getByRole("button",{name:"Delete draft",exact:true}).click();await expect(dialog.getByRole("alert")).toContainText("changed in another tab");await dialog.getByRole("button",{name:"Cancel",exact:true}).click();await page.getByRole("button",{name:"Refresh",exact:true}).click();await expect(card).toContainText("Updated history draft");
  sql(`begin;insert into public.revisions(id,project_id,owner_id,revision_number,input_hash,request_kind,target_seconds,orientation,voice_profile_id,schema_version,prompt_version,composition_version) values('${revision}','${project.id}','${owner}',1,repeat('a',64),'initial',60,'landscape','Kore',1,'v1','v1');insert into public.jobs(id,project_id,owner_id,revision_id,kind,status,available_at) values('${job}','${project.id}','${owner}','${revision}','generation','waiting_worker',now()+interval '1 year');commit;`);
  await card.getByRole("button",{name:/Delete draft/}).click();await dialog.getByRole("button",{name:"Delete draft",exact:true}).click();await expect(dialog.getByRole("alert")).toContainText("active generation");await expect(card).toBeVisible();
  sql(`update public.jobs set status='cancelled',finished_at=now() where id='${job}' and owner_id='${owner}';`);
  await dialog.getByRole("button",{name:"Delete draft",exact:true}).click();await expect(card).toHaveCount(0);expect(sql(`select count(*) from public.revisions where id='${revision}' and owner_id='${owner}';`).trim()).toBe("1");
 });
 test("received private source is physically cleaned after draft deletion",async({page,context})=>{
  const owner=await signup(context),project=await draft(context,"branding","Private upload draft"),bytes=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=","base64");
  // Test-only private upload uses scoped allocation metadata; no provider call.
  const csrf=(await(await context.request.get("/api/v1/auth/csrf")).json()).data.csrfToken;
  const allocation=await context.request.post(`/api/v1/projects/${project.id}/uploads`,{data:{expectedDraftVersion:1,filename:"private.png",mimeType:"image/png",byteSize:String(bytes.length),role:"image"},headers:{Origin:origin,"X-CSRF-Token":csrf,"Idempotency-Key":randomUUID()}});expect(allocation.status()).toBe(201);const value=(await allocation.json()).data;
  const client=storage(),item=value.snapshot.items.find((item:{assetId:string})=>item.assetId===value.assetId)??value.snapshot.items[0];storageKeys.push(item.objectKey);
  const upload=await client.storage.from("sources").upload(item.objectKey,bytes,{contentType:"image/png"});expect(upload.error).toBeNull();expect((await mutation(context,`uploads/${value.uploadId}/complete`,"POST",{})).status()).toBe(200);
  await page.goto("/drafts");await page.getByRole("article").getByRole("button",{name:/Delete draft/}).click();const dialog=page.getByRole("dialog");await dialog.getByRole("button",{name:"Delete draft",exact:true}).click();await expect(dialog).not.toBeVisible();await expect(page.getByRole("article")).toHaveCount(0);
  await expect.poll(()=>sql(`select a.state from public.assets a join public.upload_allocations u on u.asset_id=a.id where u.id='${value.uploadId}' and u.owner_id='${owner}';`).trim()).toBe("deleted");
  expect((await client.storage.from("sources").download(item.objectKey)).error).not.toBeNull();expect(sql(`select reserved_bytes+used_bytes from public.usage_accounts where owner_id='${owner}';`).trim()).toBe("0");
 });
});
