import {test,expect} from "@playwright/test";
const capabilities={modes:["education","software","branding"].map(id=>({id,draftAvailable:true,generationAvailable:false})),durations:[60,90],orientations:["portrait"],uploadLimits:{enabled:false,images:8,imageBytes:5000000,recordingBytes:45000000,recordingSeconds:120,combinedBytes:60000000},educationCapabilities:{drafts:true,generation:false,voicePreview:false},limitsVersion:"v1"};
const voices={items:[{id:"Kore",label:"Kore",language:"en",description:"Primary English voice",previewUrl:null,available:true}],nextCursor:null};
test("Education uses backend choices, retries catalog failures and preserves draft inputs",async({page})=>{
 await page.route("**/api/v1/auth/session",route=>route.fulfill({json:{data:{user:{id:"11111111-1111-4111-8111-111111111111",displayName:"Catalog fixture",email:"fixture@example.invalid",authMethods:["email"]}}}}));
 let fail=true;await page.route("**/api/v1/capabilities",route=>route.fulfill({status:fail?503:200,json:fail?{error:{}}:{data:capabilities}}));await page.route("**/api/v1/voices",route=>route.fulfill({json:{data:voices}}));
 await page.goto("/projects/new?mode=education");await page.getByRole("textbox",{name:"What would you like to explain?"}).fill("Preserve this topic");await expect(page.getByText(/Video settings could not load/)).toBeVisible();fail=false;await page.getByRole("button",{name:"Try again",exact:true}).click();
 await expect(page.getByRole("combobox",{name:"Narration voice"})).toHaveValue("Kore");await expect(page.getByRole("radio",{name:/75 sec/})).toHaveCount(0);await expect(page.getByRole("radio",{name:/Landscape/})).toHaveCount(0);await page.getByRole("radio",{name:/Portrait/}).check();await expect(page.getByRole("textbox",{name:"What would you like to explain?"})).toHaveValue("Preserve this topic");await expect(page.getByRole("button",{name:"Preview voice",exact:true})).toBeDisabled();await expect(page.getByRole("button",{name:/Generate video/})).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test("Voice playback is user initiated, stoppable and retryable (mock audio only)",async({page})=>{
 await page.route("**/api/v1/auth/session",route=>route.fulfill({json:{data:{user:{id:"11111111-1111-4111-8111-111111111111",displayName:"Playback fixture",email:"fixture@example.invalid",authMethods:["email"]}}}}));
 await page.route("**/api/v1/capabilities",route=>route.fulfill({json:{data:{...capabilities,educationCapabilities:{drafts:true,generation:false,voicePreview:true}}}}));await page.route("**/api/v1/voices",route=>route.fulfill({json:{data:{...voices,items:[{...voices.items[0],previewUrl:"/api/v1/voices/Kore/preview"}]}}}));
 await page.addInitScript(()=>{class TestAudio {src="";onended:(()=>void)|null=null;onerror:(()=>void)|null=null;play(){return Promise.resolve();}pause(){} }Object.defineProperty(window,"Audio",{value:TestAudio});});
 let calls=0,fail=true;await page.route("**/api/v1/voices/Kore/preview",route=>{calls++;return route.fulfill({status:fail?503:200,contentType:fail?"application/json":"audio/wav",body:fail?"{}":"mock-audio"});});
 await page.goto("/projects/new?mode=education");await expect(page.getByRole("button",{name:"Preview voice",exact:true})).toBeEnabled();expect(calls).toBe(0);await page.getByRole("button",{name:"Preview voice",exact:true}).click();await expect(page.getByText(/sample could not play/)).toBeVisible();fail=false;await page.getByRole("button",{name:"Retry sample",exact:true}).click();await expect(page.getByRole("button",{name:"Stop sample",exact:true})).toBeVisible();await page.getByRole("button",{name:"Stop sample",exact:true}).click();await expect(page.getByRole("button",{name:"Preview voice",exact:true})).toBeEnabled();expect(calls).toBe(2);
});
test("Catalog and sample require authentication and reject unsupported methods",async({request})=>{
 for(const path of ["capabilities","voices","voices/Kore/preview"]){const response=await request.get("/api/v1/"+path);expect(response.status()).toBe(401);expect(response.headers()["cache-control"]).toBe("private, no-store");expect((await request.post("/api/v1/"+path,{data:{}})).status()).toBe(405);}
});

test("Background network and 503 session checks preserve edits; confirmed 401 clears workspace",async({page})=>{
 await page.clock.install();
 let failure="",checks=0;
 await page.route("**/api/v1/auth/session",route=>{checks++;if(failure==="network")return route.abort("failed");if(failure)return route.fulfill({status:Number(failure),json:{error:{code:failure==="401"?"AUTH_REQUIRED":"SERVICE_UNAVAILABLE",message:"Session check failed",retryable:true,requestId:"11111111-1111-4111-8111-111111111111",retryAt:null,fieldErrors:[]}}});return route.fulfill({json:{data:{user:{id:"11111111-1111-4111-8111-111111111111",displayName:"Draft fixture",email:"fixture@example.invalid",authMethods:["email"]}}}});});
 await page.route("**/api/v1/capabilities",route=>route.fulfill({json:{data:{...capabilities,durations:[60,75,90],orientations:["landscape","portrait"]}}}));
 await page.route("**/api/v1/voices",route=>route.fulfill({json:{data:voices}}));
 await page.goto("/projects/new?mode=education");
 const topic=page.getByRole("textbox",{name:"What would you like to explain?"});await topic.fill("Unsaved topic");await page.locator("details.education-optional summary").click();await page.getByLabel("Reference notes",{exact:true}).fill("Unsaved reference notes");await page.getByRole("radio",{name:/90 sec/}).check();await page.getByRole("radio",{name:/Portrait/}).check();
 const preserved=async()=>{await expect(topic).toHaveValue("Unsaved topic");await expect(page.getByLabel("Reference notes",{exact:true})).toHaveValue("Unsaved reference notes");await expect(page.getByRole("radio",{name:/90 sec/})).toBeChecked();await expect(page.getByRole("radio",{name:/Portrait/})).toBeChecked();};
 failure="network";await page.evaluate(()=>window.dispatchEvent(new Event("focus")));await expect(page.getByText(/Your unsaved changes are still here/)).toBeVisible();await preserved();
 failure="503";const before=checks;await page.clock.fastForward(60_000);await expect.poll(()=>checks).toBeGreaterThan(before);await preserved();
 failure="";await page.getByRole("button",{name:"Try again",exact:true}).click();await expect(page.getByText(/Your unsaved changes are still here/)).toHaveCount(0);await preserved();
 failure="401";await page.evaluate(()=>window.dispatchEvent(new Event("focus")));await expect(page).toHaveURL(/session-expired/);await expect(topic).toHaveCount(0);
});
