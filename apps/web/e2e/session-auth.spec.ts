import { test,expect,type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
const origin=`http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? "3100"}`;
const emails:string[]=[];
const password="Session-test-password-2026!";
async function mutate(api:APIRequestContext,path:string,body:unknown) {
  const token=(await (await api.get("/api/v1/auth/csrf")).json()).data.csrfToken;
  return api.post(`/api/v1/${path}`,{data:body,headers:{Origin:origin,"X-CSRF-Token":token}});
}
test.describe("Email-only session lifecycle",()=>{
  test.skip(process.env.W05_AUTH_TESTS!=="1","Requires the local Supabase stack.");
  test.setTimeout(180_000);
  test.afterAll(()=>{
    if(!emails.length)return;
    for(const email of emails)if(!/^w07-[a-f0-9-]+@example\.invalid$/.test(email))throw new Error("Unsafe fixture");
    const list=emails.map(value=>`'${value}'`).join(",");
    execFileSync("docker",["exec","-i","supabase_db_ai-video-studio-local","psql","-X","-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1","-q"],{input:`begin;delete from public.profiles where id in(select id from auth.users where email in(${list}));delete from auth.users where email in(${list});commit;`,windowsHide:true,stdio:["pipe","pipe","pipe"]});
  });
  test("pre-auth CSRF survives other tabs and anonymous checks without weakening rejection",async({request})=>{
    const first=await request.get("/api/v1/auth/csrf");expect(first.status()).toBe(200);
    const original=(await first.json()).data;
    const repeat=(await (await request.get("/api/v1/auth/csrf")).json()).data;
    expect(repeat.csrfToken).toBe(original.csrfToken);expect(repeat.expiresAt).toBe(original.expiresAt);
    expect((await request.get("/api/v1/auth/session")).status()).toBe(401);
    expect((await request.get("/api/v1/me/settings")).status()).toBe(401);
    const headers={Origin:origin,"X-CSRF-Token":original.csrfToken};
    // Empty signup is invalid, so 422 proves it passed CSRF without creating a user.
    expect((await request.post("/api/v1/auth/sign-up",{data:{},headers})).status()).toBe(422);
    expect((await request.post("/api/v1/auth/sign-up",{data:{},headers:{...headers,Origin:"https://attacker.invalid"}})).status()).toBe(403);
    expect((await request.post("/api/v1/auth/sign-up",{data:{},headers:{Origin:origin}})).status()).toBe(403);
    expect((await request.post("/api/v1/auth/sign-up",{data:{},headers:{...headers,"X-CSRF-Token":"forged"}})).status()).toBe(403);
    // Explicit signout still invalidates the previously valid token.
    expect((await request.post("/api/v1/auth/sign-out",{data:{scope:"local"},headers})).status()).toBe(204);
    const missing=await request.post("/api/v1/auth/sign-up",{data:{},headers});
    expect(missing.status()).toBe(403);expect((await missing.json()).error.message).toContain("security cookie");
  });
  test("safe return, expired edit is not replayed, refresh and local signout",async({page,context,browser})=>{
    await page.goto("/settings");await expect(page).toHaveURL(/\/sign-in\?next=%2Fsettings/);
    await expect(page.getByRole("button",{name:/Google/})).toHaveCount(0);
    await page.goto("/sign-up");await expect(page.getByRole("button",{name:/Google/})).toHaveCount(0);
    const email=`w07-${randomUUID()}@example.invalid`;emails.push(email);
    expect((await mutate(context.request,"auth/sign-up",{email,password,displayName:"Session Creator"})).status()).toBe(201);
    expect((await mutate(context.request,"auth/refresh",{})).status()).toBe(200);
    expect((await mutate(context.request,"auth/refresh",{ownerId:randomUUID()})).status()).toBe(422);
    expect((await mutate(context.request,"auth/sign-out",{scope:"global"})).status()).toBe(422);
    const other=await browser.newContext({baseURL:origin});
    try {
      expect((await mutate(other.request,"auth/sign-in",{email,password})).status()).toBe(200);
      await page.goto("/settings");await expect(page.getByLabel("Full name",{exact:true})).toHaveValue("Session Creator");
      await page.getByLabel("Full name",{exact:true}).fill("Must not replay");
      await context.clearCookies();
      await page.getByRole("button",{name:"Save changes"}).click();
      await expect(page).toHaveURL(/\/session-expired\?next=%2Fsettings/);
      await expect(page.getByRole("heading",{name:"Please sign in again"})).toBeVisible();
      await page.getByRole("link",{name:"Sign in",exact:true}).click();
      await page.getByLabel("Email",{exact:true}).fill(email);await page.getByLabel("Password",{exact:true}).fill(password);
      await page.getByRole("button",{name:"Sign in",exact:true}).click();
      await expect(page).toHaveURL(/\/settings$/);
      await expect(page.getByLabel("Full name",{exact:true})).toHaveValue("Session Creator");
      const tab=await context.newPage();await tab.goto("/dashboard");await expect(tab.getByText("Welcome, Session Creator",{exact:true})).toBeVisible();
      await page.getByRole("button",{name:"Sign out",exact:true}).click();
      await expect(page).toHaveURL(/\/sign-in$/);
      await expect(tab).toHaveURL(/\/session-expired/);
      expect((await context.request.get("/api/v1/me/settings")).status()).toBe(401);
      expect((await other.request.get("/api/v1/auth/session")).status()).toBe(200);
      expect((await mutate(context.request,"auth/refresh",{})).status()).toBe(401);
      expect((await mutate(context.request,"auth/sign-out",{scope:"local"})).status()).toBe(204);
      await page.goto("/sign-in?next=https%3A%2F%2Fevil.example");
      await page.getByLabel("Email",{exact:true}).fill(email);await page.getByLabel("Password",{exact:true}).fill(password);await page.getByRole("button",{name:"Sign in",exact:true}).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await tab.close();
    } finally {await other.close();}
  });
});
