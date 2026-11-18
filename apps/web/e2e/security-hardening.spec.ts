import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {ErrorEnvelopeSchema} from '../../../shared/contracts/index';
import {readyFixture,cleanupResults,post,sql} from './result-fixture';
const metadataOwners:string[]=[];
test.describe('pre-deployment security regression',()=>{
 test.skip(process.env.W05_AUTH_TESTS!=='1','Requires isolated local Supabase');
 test.setTimeout(120000);test.afterEach(async()=>{for(const owner of metadataOwners.splice(0)){sql("begin;delete from public.idempotency_requests where owner_id='"+owner+"';delete from public.projects where owner_id='"+owner+"';delete from public.profiles where id='"+owner+"';delete from auth.users where id='"+owner+"';commit;");}await cleanupResults();});
 test('fresh document nonces allow hydration and prohibit framing without broad script origins',async({page,request})=>{
  const blocked:string[]=[];page.on('console',m=>{if(m.type()==='error'&&/content security policy|refused to execute|refused to connect/i.test(m.text()))blocked.push(m.text());});
  const response=await page.goto('/sign-in');expect(response?.headers()['x-frame-options']).toBe('DENY');expect(response?.headers()['referrer-policy']).toBe('no-referrer');expect(response?.headers()['x-content-type-options']).toBe('nosniff');
  const policy=response!.headers()['content-security-policy'];expect(policy).toContain("frame-ancestors 'none'");expect(policy).not.toContain('unsafe-eval');expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
  const nonce=policy.match(/'nonce-([^']+)'/)?.[1];expect(nonce).toBeTruthy();expect(await page.locator('script[nonce]').evaluateAll(s=>s.some(n=>(n as HTMLScriptElement).nonce))).toBe(true);
  await expect(page.getByRole('textbox',{name:'Email',exact:true})).toBeVisible();
  expect((await request.get('/sign-in')).headers()['content-security-policy']).not.toBe(policy);expect(blocked).toEqual([]);
 });
 test('private video and caption fetches work under enforced browser policy',async({page,context})=>{
  const f=await readyFixture(context);const blocked:string[]=[];page.on('console',m=>{if(m.type()==='error'&&/content security policy|refused to execute|refused to connect/i.test(m.text()))blocked.push(m.text());});
  await page.goto(`/projects/${f.project}/results/${f.revision}`);
  const video=page.getByRole('region',{name:'Video result',exact:true}).locator('video');await expect(video).toBeVisible();await video.evaluate((v:HTMLVideoElement)=>v.play());await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(.05);await video.evaluate((v:HTMLVideoElement)=>v.pause());
  await page.getByRole('button',{name:'Captions off',exact:true}).click();await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.textTracks[0]?.cues?.length??0)).toBeGreaterThan(0);expect(blocked).toEqual([]);
 });
 test('real server shares an eight-attempt email window and returns bounded Retry-After',async({context})=>{
  const email=`rate-${randomUUID()}@example.invalid`;
  for(let i=0;i<8;i++)expect((await post(context,'auth/sign-in',{email,password:'Nonexistent-account-password!'})).status()).toBe(401);
  const denied=await post(context,'auth/sign-in',{email:email.toUpperCase(),password:'Nonexistent-account-password!'});expect(denied.status()).toBe(429);expect(Number(denied.headers()['retry-after'])).toBeGreaterThan(0);expect(Number(denied.headers()['retry-after'])).toBeLessThanOrEqual(60);
 });
 test('capacity failures retain a validated friendly error and create no extra draft',async({context})=>{
  const created=await post(context,'auth/sign-up',{email:'capacity-'+randomUUID()+'@example.invalid',password:'Capacity-test-password-2026!',displayName:'Capacity fixture'});expect(created.status()).toBe(201);
  const owner=(await created.json()).data.user.id as string;if(!/^[a-f0-9-]{36}$/.test(owner))throw Error('Invalid fixture');metadataOwners.push(owner);
  sql("insert into public.projects(owner_id,title,mode) select '"+owner+"','Capacity fixture','education' from generate_series(1,20);");
  const response=await post(context,'projects',{mode:'education',title:'Preserved draft',draftInput:{mode:'education',topic:'Machine learning',sources:[]},preferences:{}},randomUUID());expect(response.status()).toBe(409);
  const body=ErrorEnvelopeSchema.parse(await response.json());expect(body.error.code).toBe('STATE_CONFLICT');expect(body.error.message).toContain('capacity');expect(sql("select count(*) from public.projects where owner_id='"+owner+"'")).toBe('20');
 });
});
