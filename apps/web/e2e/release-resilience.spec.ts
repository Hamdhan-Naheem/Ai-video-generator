import {expect,test,type BrowserContext} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const origin=`http://127.0.0.1:${process.env.PLAYWRIGHT_PORT??'3100'}`,owners:string[]=[];
async function mutate(context:BrowserContext,path:string,method:'POST'|'PATCH',data:unknown){const token=(await(await context.request.get('/api/v1/auth/csrf')).json()).data.csrfToken;return context.request.fetch('/api/v1/'+path,{method,data,headers:{Origin:origin,'X-CSRF-Token':token}});}
async function fixture(context:BrowserContext){const signup=await mutate(context,'auth/sign-up','POST',{email:`w29-${randomUUID()}@example.invalid`,password:'W29-private-test-password!',displayName:'W29 test owner'});expect(signup.status()).toBe(201);const owner=(await signup.json()).data.user.id as string;if(!/^[a-f0-9-]{36}$/.test(owner))throw Error('Unsafe fixture');owners.push(owner);const created=await mutate(context,'projects','POST',{mode:'education',title:'Resilience draft',draftInput:{mode:'education',topic:'How turbines work',sources:[]},preferences:{}});expect(created.status()).toBe(201);return (await created.json()).data;}

test.describe('W29 release resilience with local Auth and drafts',()=>{
 test.skip(process.env.W05_AUTH_TESTS!=='1','Requires local Supabase; no AI calls.');
 test.setTimeout(120000);
 test.afterAll(()=>{if(!owners.length)return;const ids=owners.map(id=>`'${id}'`).join(',');execFileSync('docker',['exec','-i','supabase_db_ai-video-studio-local','psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-q'],{input:`begin;delete from public.idempotency_requests where owner_id in(${ids});delete from public.projects where owner_id in(${ids});delete from public.usage_accounts where owner_id in(${ids});delete from public.profiles where id in(${ids});delete from auth.users where id in(${ids});commit;`,windowsHide:true,stdio:['pipe','pipe','pipe']});});

 test('initial read retry, background 503 and failed save preserve unsaved fields and settings',async({page,context})=>{
  const draft=await fixture(context);let firstRead=true,failPatch=true,patches=0,backgroundFailure=false;
  await page.route(`**/api/v1/projects/${draft.id}`,async route=>{if(route.request().method()==='GET'&&firstRead){firstRead=false;await route.fulfill({status:503,contentType:'text/html',body:'Temporary failure'});}else if(route.request().method()==='PATCH'){patches++;if(failPatch)await route.abort('failed');else await route.continue();}else await route.continue();});
  await page.route('**/api/v1/auth/session',async route=>backgroundFailure?route.fulfill({status:503,contentType:'text/html',body:'Temporary failure'}):route.continue());
  await page.goto(`/projects/${draft.id}`);await expect(page.getByRole('main').getByRole('alert')).toContainText('couldn’t be completed');await page.getByRole('button',{name:'Try again',exact:true}).click();
  const topic=page.getByRole('textbox',{name:'What would you like to explain?'});await expect(topic).toHaveValue('How turbines work');await topic.fill('UNSAVED turbine explanation');
  await page.getByRole('radio',{name:/75 sec/}).check();await page.getByRole('radio',{name:/Portrait/}).check();
  await page.locator('summary').filter({hasText:'Optional details'}).click();const notes=page.getByRole('textbox',{name:'Reference notes',exact:true});await notes.fill('UNSAVED reference notes');
  backgroundFailure=true;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page.getByText('We could not check your session. Your unsaved changes are still here. Check your connection and try again.')).toBeVisible();
  await expect(topic).toHaveValue('UNSAVED turbine explanation');await expect(notes).toHaveValue('UNSAVED reference notes');
  backgroundFailure=false;await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(page.getByText(/We could not check your session/)).toHaveCount(0);
  await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByRole('main').getByRole('alert')).toContainText('couldn’t confirm');expect(patches).toBe(1);await expect(page.getByRole('group',{name:'Draft action error'})).toBeFocused();await expect(page.getByRole('group',{name:'Draft action error'})).toBeInViewport();
  await expect(topic).toHaveValue('UNSAVED turbine explanation');await expect(notes).toHaveValue('UNSAVED reference notes');await expect(page.getByRole('radio',{name:/75 sec/})).toBeChecked();await expect(page.getByRole('radio',{name:/Portrait/})).toBeChecked();
  failPatch=false;await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByText('Draft saved.',{exact:true})).toBeVisible();expect(patches).toBe(2);
  const saved=(await(await context.request.get(`/api/v1/projects/${draft.id}`)).json()).data;expect(saved.draftInput.topic).toBe('UNSAVED turbine explanation');
 });

 test('conflict confirmation preserves edits on cancel or failure and confines focus during a pending reload',async({page,context})=>{
  const draft=await fixture(context);await page.goto(`/projects/${draft.id}`);const title=page.getByRole('textbox',{name:'Project title',exact:true});await expect(title).toHaveValue(draft.title);
  const winner=await mutate(context,`projects/${draft.id}`,'PATCH',{expectedDraftVersion:1,title:'Newer saved draft'});expect(winner.status()).toBe(200);
  await title.fill('Keep these unsaved edits');await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByRole('main').getByRole('alert')).toContainText('changed in another tab');
  const trigger=page.getByRole('button',{name:'Reload saved draft (replaces your edits)'});await trigger.click();const dialog=page.getByRole('dialog',{name:'Replace your unsaved edits?'});await expect(dialog.getByRole('button',{name:'Keep editing'})).toBeFocused();await page.keyboard.press('Escape');await expect(trigger).toBeFocused();await expect(title).toHaveValue('Keep these unsaved edits');
  let failRead=true,release:(()=>void)|undefined;
  await page.route(`**/api/v1/projects/${draft.id}`,async route=>{if(route.request().method()!=='GET')return route.continue();if(failRead)return route.fulfill({status:503,contentType:'text/html',body:'Temporary failure'});await new Promise<void>(resolve=>{release=resolve;});await route.continue();});
  await trigger.click();await dialog.getByRole('button',{name:'Replace with saved draft'}).click();await expect(dialog.getByRole('alert')).toBeVisible();await expect(title).toHaveValue('Keep these unsaved edits');await expect(dialog).toBeVisible();
  await page.setViewportSize({width:320,height:360});const box=await dialog.boundingBox();expect(box!.height).toBeLessThanOrEqual(328);expect(box!.width).toBeLessThanOrEqual(288);await dialog.screenshot({path:`../../.cache/w29-conflict-${test.info().project.name}.png`});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  failRead=false;await dialog.getByRole('button',{name:'Replace with saved draft'}).click();await expect(dialog.getByRole('button',{name:'Loading saved draft…'})).toBeDisabled();await page.keyboard.press('Escape');await expect(dialog).toBeVisible();
  for(let i=0;i<3;i++){await page.keyboard.press('Tab');expect(await dialog.evaluate(el=>el.contains(document.activeElement)||el===document.activeElement)).toBe(true);}
  await expect.poll(()=>!!release).toBe(true);release!();await expect(dialog).not.toBeVisible();await expect(title).toHaveValue('Newer saved draft');await expect(page.locator('.draft-status')).toBeFocused();
  await page.setViewportSize({width:320,height:480});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });

 test('non-JSON confirmed session loss leaves the workspace and does not replay unsaved changes',async({page,context})=>{
  const draft=await fixture(context);await page.goto(`/projects/${draft.id}`);const topic=page.getByRole('textbox',{name:'What would you like to explain?'});await expect(topic).toHaveValue('How turbines work');await topic.fill('Never silently replay this');let mutations=0;
  page.on('request',r=>{if(r.method()==='PATCH')mutations++;});await page.route('**/api/v1/auth/session',route=>route.fulfill({status:401,contentType:'text/html',body:'Signed out'}));await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await expect(page).toHaveURL(new RegExp(`/session-expired\\?next=%2Fprojects%2F${draft.id}$`));await expect(topic).toHaveCount(0);expect(mutations).toBe(0);
 });
});
