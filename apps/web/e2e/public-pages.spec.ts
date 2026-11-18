import { expect, test } from "@playwright/test";

test("public landing keeps projects private, loads the approved sample on demand and matches the mobile palette", async ({ page, request }, testInfo) => {
  const privateCalls: string[] = [], mediaCalls: string[] = [];
  page.on("request", req => { if(req.url().includes("/api/")) privateCalls.push(new URL(req.url()).pathname); if(req.url().endsWith(".mp4")) mediaCalls.push(req.url()); });
  await page.goto("/");
  await expect(page.getByRole("heading", { name:"Turn your ideas into narrated videos" })).toBeVisible();
  await expect(page.locator(".public-badge")).toHaveText(["Coming soon", "Coming soon"]);
  await expect(page.locator(".public-site")).toHaveCSS("background-color", "rgb(247, 246, 242)");
  expect(privateCalls).toEqual([]); expect(mediaCalls).toEqual([]);
  await page.getByRole("button", { name:"Load Education video sample" }).click();
  const video = page.getByLabel("Hydroelectric Education sample");
  await expect(video).toBeVisible();
  expect(await video.evaluate(el => (el as HTMLVideoElement).autoplay)).toBe(false);
  await expect.poll(() => video.evaluate(el => (el as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(1);
  expect(await video.evaluate(el => (el as HTMLVideoElement).paused)).toBe(true);
  const duration = await video.evaluate(el => (el as HTMLVideoElement).duration);
  expect(duration).toBeGreaterThan(59); expect(duration).toBeLessThan(61);
  await video.evaluate(el => (el as HTMLVideoElement).play());
  await expect.poll(() => video.evaluate(el => (el as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
  await video.evaluate(el => (el as HTMLVideoElement).pause());
  const captions=await request.get("/samples/hydroelectric-education.vtt");
  expect(captions.ok()).toBe(true); expect(await captions.text()).toContain("WEBVTT");
  const range=await request.get("/samples/hydroelectric-education.mp4", {headers:{Range:"bytes=0-1023"}});
  expect(range.status()).toBe(206); expect(range.headers()["content-range"]).toMatch(/^bytes 0-1023\//);
  await expect(page.locator("a[href^='/preview']")).toHaveCount(0);
  await expect(page.locator(".public-formats img")).toHaveCount(3);
  expect(await page.locator(".public-formats img").evaluateAll(images=>images.every(el=>(el as HTMLImageElement).naturalWidth>0))).toBe(true);
  await page.screenshot({path:testInfo.outputPath("landing.png"),fullPage:true});
  for(const width of [320,390,1440]) { await page.setViewportSize({width,height:844}); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true); }
});

test("public information and unavailable routes have real links and safe account help", async ({page})=>{
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link",{name:"Skip to content"})).toBeFocused();
  await page.keyboard.press("Enter"); await expect(page.getByRole("main")).toBeFocused();
  for(const [name,title] of [["Help","How can we help?"],["Privacy","Privacy notice"],["Terms","Using the learning preview"],["Contact","Contact the creator"]]) {
    await page.getByRole("navigation",{name:"Information"}).getByRole("link",{name,exact:true}).click();
    await expect(page.getByRole("heading",{level:1,name:title})).toBeVisible();
    await expect(page.locator("a[href^='/preview'], a[href='#']")).toHaveCount(0);
  }
  await expect(page.getByRole("link",{name:"naheemhamdhan77@gmail.com"})).toHaveAttribute("href","mailto:naheemhamdhan77@gmail.com");
  await page.goto("/account-access");
  await expect(page.getByText("Password-reset emails aren’t available in this version.")).toBeVisible();
  await page.getByRole("navigation",{name:"Public information"}).getByRole("link",{name:"Help",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Account access",exact:true})).toBeVisible();
  const missing=await page.goto("/this-page-does-not-exist-w27"); expect(missing?.status()).toBe(404);
  await expect(page.getByRole("heading",{name:"This page isn’t available"})).toBeVisible();
  await expect(page.getByRole("link",{name:"Back to home"})).toHaveAttribute("href","/");
  await page.goto("/dashboard"); await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard/);
  await page.goto("/sign-in?next=%2Fprojects%2Fnew");
  await expect(page.getByRole("heading",{name:"Welcome back"})).toBeVisible();
  await expect(page.getByRole("button",{name:/Google/})).toHaveCount(0);
});
