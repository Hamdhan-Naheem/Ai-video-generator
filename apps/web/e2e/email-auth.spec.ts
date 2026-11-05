import { test, expect, type APIRequestContext } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const live = process.env.W05_AUTH_TESTS === "1";
const origin = `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? "3100"}`;
const emails: string[] = [];
const password = "  W05-a-unique-password!  ";
async function mutate(api:APIRequestContext,path:string,body:unknown,method="POST") {
  const response=await api.get("/api/v1/auth/csrf"); expect(response.status()).toBe(200);
  const token=(await response.json()).data.csrfToken;
  return api.fetch(`/api/v1/${path}`,{method,data:body,headers:{Origin:origin,"X-CSRF-Token":token}});
}
test.describe("W-05 local email authentication",()=>{
  test.setTimeout(180_000);
  test.skip(!live,"Run with W05_AUTH_TESTS=1 and the local Supabase stack.");
  test.afterAll(()=>{
    if (!emails.length) return;
    // Only generated .invalid test accounts, no projects/media or existing identities.
    for(const email of emails) if(!/^w05-[a-f0-9-]+@example\.invalid$/.test(email)) throw new Error("Unsafe fixture name");
    const list=emails.map(email=>`'${email}'`).join(",");
    execFileSync("docker",["exec","-i","supabase_db_ai-video-studio-local","psql","-X","-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1","-q"],{input:`begin; delete from public.profiles where id in(select id from auth.users where email in(${list})); delete from auth.users where email in(${list}); commit;`,stdio:["pipe","pipe","pipe"],windowsHide:true});
  });
  test("approved forms validate names, password confirmation and match the shared canvas",async({page})=>{
    await page.goto("/sign-up");
    await expect(page.getByRole("heading",{name:"Create an account"})).toBeVisible();
    await expect(page.getByRole("button",{name:"Continue with Google"})).toHaveCount(0);
    await expect(page.getByRole("button",{name:"Create account",exact:true})).toBeDisabled();
    await expect(page.locator("body")).toHaveCSS("background-color","rgb(247, 246, 242)");
    await page.getByLabel("Full name",{exact:true}).fill("   ");
    await page.getByLabel("Email",{exact:true}).fill("bad");
    await page.getByLabel("Password",{exact:true}).fill("short");
    await page.getByLabel("Confirm password",{exact:true}).fill("different");
    await page.getByLabel("Full name",{exact:true}).focus();
    await expect(page.getByText("Enter a full name of 1–80 characters.")).toBeVisible();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(page.getByText("Passwords don’t match.",{exact:true})).toBeVisible();
    await page.getByRole("button",{name:"Show password",exact:true}).click();
    await expect(page.getByLabel("Password",{exact:true})).toHaveAttribute("type","text");
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await page.getByRole("link",{name:"Sign in",exact:true}).click();
    await page.getByRole("link",{name:"Forgot password?"}).click();
    await expect(page).toHaveURL(/\/account-access$/,{timeout:15000});
    await expect(page.getByRole("heading",{name:"Forgot your password?"})).toBeVisible();
    await expect(page.getByText(/We can’t send a reset link/)).toBeVisible();
  });
  test("real signup, sign-in, persisted profile, two-session conflicts and isolation",async({page,browser})=>{
    const email=`w05-${randomUUID()}@example.invalid`;emails.push(email);
    await page.goto("/sign-up");
    await page.getByLabel("Full name",{exact:true}).fill("  Álex Morgan  ");
    await page.getByLabel("Email",{exact:true}).fill(email);
    await page.getByLabel("Password",{exact:true}).fill(password);
    await page.getByLabel("Confirm password",{exact:true}).fill(password);
    const signupResponse=page.waitForResponse(r=>r.url().endsWith("/api/v1/auth/sign-up"));
    await page.getByRole("button",{name:"Create account",exact:true}).click();
    const response=await signupResponse;
    expect(response.status(),await response.text()).toBe(201);
    const receipt=await response.json();
    expect(receipt.data.user.displayName).toBe("Álex Morgan");
    expect(receipt.data.user.role).toBe("tester");
    expect(receipt.data.user.emailOwnership).toBe("unknown");
    expect(JSON.stringify(receipt)).not.toMatch(/access_token|refresh_token|service_role|"password"\s*:/);
    expect(response.request().postDataJSON()).not.toHaveProperty("confirmPassword");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("Welcome, Álex Morgan",{exact:true})).toBeVisible();
    await page.getByRole("link",{name:"Settings",exact:true}).click();
    await page.getByLabel("Full name",{exact:true}).fill("Alex Updated");
    await page.getByRole("button",{name:"Save changes"}).click();
    await expect(page.getByText("Your full name has been saved.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Full name",{exact:true})).toHaveValue("Alex Updated");
    await expect(page.getByRole("textbox",{name:/Email/})).toHaveValue(email);
    await expect(page.getByRole("textbox",{name:/Email/})).toHaveAttribute("readonly","");

    const second=await browser.newContext({baseURL:origin});
    try {
      const other=await second.newPage();
      await other.goto("/sign-in");
      await other.getByLabel("Email",{exact:true}).fill(email);
      await other.getByLabel("Password",{exact:true}).fill("incorrect password");
      await other.getByRole("button",{name:"Sign in",exact:true}).click();
      await expect(other.getByText("Email or password is incorrect. Check your details and try again.")).toBeVisible();
      await other.getByLabel("Password",{exact:true}).fill(password);
      const signedIn=other.waitForResponse(response=>response.url().endsWith("/api/v1/auth/sign-in"),{timeout:65_000});
      await other.getByRole("button",{name:"Sign in",exact:true}).click();
      const signinReceipt=await signedIn;expect(signinReceipt.status(),await signinReceipt.text()).toBe(200);
      await expect(other).toHaveURL(/\/dashboard$/);
      await other.goto("/settings");
      await expect(other.getByLabel("Full name",{exact:true})).toHaveValue("Alex Updated");
      const csrf=(await (await page.request.get("/api/v1/auth/csrf")).json()).data.csrfToken;
      const results=await Promise.all(["First editor","Second editor"].map(displayName=>page.request.patch("/api/v1/me/settings",{data:{displayName,expectedVersion:2},headers:{Origin:origin,"X-CSRF-Token":csrf}})));
      expect(results.map(r=>r.status()).sort()).toEqual([200,409]);
      await other.getByLabel("Full name",{exact:true}).fill("Stale editor");
      await other.getByRole("button",{name:"Save changes"}).click();
      await expect(other.getByText(/Your profile changed in another tab/)).toBeVisible();
      await expect(other.getByLabel("Full name",{exact:true})).toHaveValue("Stale editor");
      await other.getByRole("button",{name:"Reload saved profile (replaces your edits)"}).click();
      await expect(other.getByLabel("Full name",{exact:true})).not.toHaveValue("Stale editor");
      expect((await mutate(second.request,"me/settings",{displayName:"Forged",expectedVersion:3,role:"operator"},"PATCH")).status()).toBe(422);
      expect((await mutate(second.request,"auth/sign-up",{email,password,displayName:"Duplicate"})).status()).toBe(400);
      // A second identity cannot choose the first identity as owner.
      const isolated=await browser.newContext({baseURL:origin});
      try {
        const foreignEmail=`w05-${randomUUID()}@example.invalid`;emails.push(foreignEmail);
        expect((await mutate(isolated.request,"auth/sign-up",{email:foreignEmail,password,displayName:"Other user"})).status()).toBe(201);
        expect((await (await isolated.request.get("/api/v1/me/settings")).json()).data.displayName).toBe("Other user");
        expect((await mutate(isolated.request,"me/settings",{displayName:"Forged",expectedVersion:1,ownerId:receipt.data.user.id},"PATCH")).status()).toBe(422);
        expect((await (await second.request.get("/api/v1/me/settings")).json()).data.displayName).not.toBe("Other user");
      } finally {await isolated.close();}
    } finally {await second.close();}
  });
  test("auth endpoints reject missing sessions, forged cookies, cross-origin mutations and invalid bodies",async({request,page})=>{
    expect((await request.get("/api/v1/me/settings")).status()).toBe(401);
    expect((await request.get("/api/v1/auth/session",{headers:{Cookie:"sb-127-auth-token=forged"}})).status()).toBe(401);
    expect((await request.post("/api/v1/auth/sign-in",{data:{email:"nobody@example.invalid",password},headers:{Origin:origin}})).status()).toBe(403);
    const csrf=(await (await request.get("/api/v1/auth/csrf")).json()).data.csrfToken;
    expect((await request.post("/api/v1/auth/sign-in",{data:{email:"nobody@example.invalid",password},headers:{Origin:"https://attacker.invalid","X-CSRF-Token":csrf}})).status()).toBe(403);
    expect((await request.get("/api/v1/auth/csrf",{headers:{Origin:"https://attacker.invalid"}})).status()).toBe(403);
    expect((await request.post("/api/v1/auth/sign-in",{data:Buffer.from("broken JSON"),headers:{Origin:origin,"X-CSRF-Token":csrf,"Content-Type":"application/json"}})).status()).toBe(400);
    expect((await request.post("/api/v1/auth/sign-in",{data:"x".repeat(66000),headers:{Origin:origin,"X-CSRF-Token":csrf,"Content-Type":"application/json"}})).status()).toBe(413);
    expect((await mutate(request,"auth/sign-up",{email:"nobody@example.invalid",password:"short",displayName:"Valid"})).status()).toBe(422);
    const session=await request.get("/api/v1/auth/session");
    expect(session.headers()["cache-control"]).toBe("private, no-store");
    await page.goto("/settings");await expect(page).toHaveURL(/\/sign-in\?next=%2Fsettings$/);
  });
});
