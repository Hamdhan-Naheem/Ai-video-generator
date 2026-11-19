import {test,expect} from '@playwright/test';
import {ProjectCreateRequestSchema,ProjectDtoSchema,canonicalDraft,type ProjectDto} from '../../../shared/contracts/index';
const id='d2000000-0000-4000-8000-000000000001';
const caps={modes:['education','software','branding'].map(id=>({id,draftAvailable:true,generationAvailable:false})),durations:[60,75,90],orientations:['landscape','portrait'],uploadLimits:{enabled:true,images:8,imageBytes:5000000,recordingBytes:45000000,recordingSeconds:120,combinedBytes:60000000},educationCapabilities:{drafts:true,generation:false,voicePreview:true},limitsVersion:'v1'};
const voices={items:[{id:'Kore',label:'Kore',language:'en',description:'English narration',previewUrl:'/api/v1/voices/Kore/preview',available:true}],nextCursor:null};
test('unavailable generation explains why, saves drafts and plays the approved showcase voice without enqueueing',async({page})=>{
 test.setTimeout(120000);let project:ProjectDto|null=null,saves=0,generations=0,voiceRequests=0;
 await page.route('**/api/v1/auth/session',route=>route.fulfill({json:{data:{user:{id,displayName:'Showcase visitor',email:'showcase@example.invalid',authMethods:['email']}}}}));
 await page.route('**/api/v1/auth/csrf',route=>route.fulfill({json:{data:{csrfToken:'synthetic'}}}));
 await page.route('**/api/v1/capabilities',route=>route.fulfill({json:{data:caps}}));
 await page.route('**/api/v1/voices',route=>route.fulfill({json:{data:voices}}));
 await page.route('**/api/v1/voices/Kore/preview',async route=>{voiceRequests++;await route.fulfill({contentType:'audio/wav',path:'assets/voice/kore-showcase.wav'});});
 await page.route('**/api/v1/projects',async route=>{saves++;const input=ProjectCreateRequestSchema.parse(route.request().postDataJSON());project=ProjectDtoSchema.parse({...canonicalDraft(input.mode,input.title,input.draftInput,input.preferences),id,draftVersion:1,draftState:'active',modeLocked:true,updatedAt:new Date().toISOString()});await route.fulfill({status:201,json:{data:project}});});
 await page.route(`**/api/v1/projects/${id}`,route=>route.fulfill({json:{data:project}}));
 await page.route(`**/api/v1/projects/${id}/generation`,route=>route.fulfill({json:{data:null}}));
 await page.route('**/api/v1/projects/*/generations',route=>{generations++;return route.abort();});
 await page.goto('/projects/new?mode=education');
 await page.getByRole('textbox',{name:'What would you like to explain?',exact:true}).fill('How do solar panels work?');await page.getByRole('combobox',{name:'Intended use',exact:true}).selectOption('personal-learning');
 await page.getByLabel('I have permission to use any reference material I provide.').check();await page.getByLabel('I understand my inputs are processed by external AI services.').check();
 await expect(page.getByText('Live video generation is currently unavailable on this deployment. You can still edit and save your draft.')).toBeVisible();
 await expect(page.getByRole('button',{name:'Generate video',exact:true})).toBeDisabled();
 await expect(page.getByRole('link',{name:'Watch an example video (opens a new tab)'})).toHaveAttribute('target','_blank');
 const preview=page.getByRole('button',{name:'Preview voice',exact:true});await expect(preview).toBeEnabled();expect(voiceRequests).toBe(0);await preview.click();await expect(page.getByRole('button',{name:'Stop sample',exact:true})).toBeVisible();await page.getByRole('button',{name:'Stop sample',exact:true}).click();expect(voiceRequests).toBe(1);
 await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page).toHaveURL(new RegExp('/projects/'+id+'$'));await expect(page.getByRole('textbox',{name:'What would you like to explain?',exact:true})).toHaveValue('How do solar panels work?');expect(saves).toBe(1);expect(generations).toBe(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('catalog loading and failures explain disabled generation; recovery restores the server-reported state',async({page})=>{
 test.setTimeout(120000);let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});let fail=true,available=false;
 await page.route('**/api/v1/auth/session',route=>route.fulfill({json:{data:{user:{id,displayName:'Showcase visitor',email:'showcase@example.invalid',authMethods:['email']}}}}));
 await page.route('**/api/v1/capabilities',async route=>{await gate;await route.fulfill(fail?{status:503,json:{error:{}}}:{json:{data:{...caps,educationCapabilities:{...caps.educationCapabilities,generation:available}}}});});
 await page.route('**/api/v1/voices',route=>route.fulfill({json:{data:voices}}));
 await page.goto('/projects/new?mode=education');await expect(page.getByText('Checking generation availability… You can still save your draft.')).toBeVisible();release();
 await expect(page.getByText('Generation availability could not be checked. Retry video settings above. Your draft can still be saved.')).toBeVisible();await expect(page.getByRole('button',{name:'Generate video',exact:true})).toBeDisabled();
 fail=false;available=true;await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(page.getByRole('button',{name:'Generate video',exact:true})).toBeEnabled();
});

