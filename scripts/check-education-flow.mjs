import path from 'node:path';
import {EducationSession} from '../src/worker/education.ts';
import {probe,runTool,ffmpeg} from '../src/media.ts';
import {readJson,writeJson,safeRun,hash} from '../src/storage.ts';
import {validateVideoProps,StoryboardSchema} from '../src/contracts.ts';
import {matchWords} from '../src/timing.ts';
import {seedEducationFixture} from './education-fixture-cache.ts';
import {request} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {readFileSync,writeFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {WorkerTransport,LeaseGuard,LOCAL_CAPABILITIES} from '../src/worker/transport.ts';
import {WorkerExecutionReplySchema} from '../shared/contracts/execution.ts';
import {startEducationChild} from '../src/worker/child.ts';
const orientation=process.argv.find(arg=>arg.startsWith('--orientation='))?.slice(14)??'landscape';const publication=process.argv.find(arg=>arg.startsWith('--publish-existing='))?.slice(19);const reuse=process.argv.find(arg=>arg.startsWith('--reuse-run='))?.slice(12);const live=process.argv.includes('--live'),origin='http://127.0.0.1:3000';
if(process.argv.slice(2).some(arg=>arg!=='--live'&&!/^--reuse-run=web-[a-f0-9-]{36}$/.test(arg)&&!/^--publish-existing=web-[a-f0-9-]{36}$/.test(arg)&&!/^--orientation=(landscape|portrait)$/.test(arg)))throw Error('Unknown verification option');
const connection=JSON.parse(readFileSync('.cache/worker/connection.json','utf8')),client=new WorkerTransport(connection),credentialHash=createHash('sha256').update(connection.token).digest('hex');
let instanceId=randomUUID();
const api=await request.newContext({baseURL:origin}),foreign=await request.newContext({baseURL:origin});let actor,project,assignment,timer,child,guard;
const health={freeDiskBytes:'4000000000',freeMemoryBytes:'2000000000',toolVersions:{node:process.versions.node}};
function sql(input){try{return execFileSync('docker',['exec','-i','supabase_db_ai-video-studio-local','psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-Atq'],{input,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']}).trim();}catch(error){throw Error('Education fixture SQL failed: '+String(error.stderr??'').split('\n')[0].slice(0,120));}}
async function mutate(path,body,key){const csrf=(await(await api.get('/api/v1/auth/csrf')).json()).data.csrfToken;return api.post('/api/v1/'+path,{headers:{Origin:origin,'X-CSRF-Token':csrf,...(key?{'Idempotency-Key':key}:{})},data:body});}
async function execute(operation){return WorkerExecutionReplySchema.parse(await client.send('execute',{instanceId,jobId:assignment.jobId,leaseToken:assignment.leaseToken,health,operation})).value;}
try{
 assert.equal(sql("select generation_paused and claims_paused and not exists(select 1 from public.jobs where status in ('queued','waiting_worker','running','waiting_quota','cancel_requested')) from public.app_settings where id='global';"),'t','Requires paused idle local stack');
 const signup=await mutate('auth/sign-up',{email:`w16-${randomUUID()}@example.invalid`,password:'Private-education-fixture-2026!',displayName:'Education Verification'});assert.equal(signup.status(),201);actor=(await signup.json()).data.user.id;assert.match(actor,/^[a-f0-9-]{36}$/);
 const saved=await mutate('projects',{mode:'education',title:'Hydroelectric explanation',draftInput:{mode:'education',topic:'How a hydroelectric power station converts moving water into electricity',audience:'beginner',intendedUse:'personal-learning',referenceNotes:'Water flowing downhill turns a turbine. The turbine drives a generator. The generator converts mechanical energy into electrical energy; energy is not created from nothing.'}},randomUUID());assert.equal(saved.status(),201);project=(await saved.json()).data.id;
 const body={draftVersion:1,preferences:{targetSeconds:75,orientation,voiceProfileId:'Kore'},acknowledgments:{sourceRights:true,externalAiProcessing:true,policyVersion:'v1'}},key=randomUUID();
 const output=sql(`begin;select id from public.workers where id='${connection.workerId}' for update;select id from public.usage_accounts where scope='global' for update;insert into public.usage_accounts(scope,owner_id,byte_limit,output_limit) values('user','${actor}',400000000,3);update public.app_settings set generation_paused=false,claims_paused=false where id='global';select set_config('request.jwt.claims','{"sub":"${actor}","role":"authenticated"}',true);select public.enqueue_generation('${project}','${key}','${JSON.stringify(body)}');select 'ASSIGNMENT:'||public.worker_control('${credentialHash}',1,'claim','${JSON.stringify({instanceId,capabilities:LOCAL_CAPABILITIES})}')::text;update public.app_settings set generation_paused=true,claims_paused=true where id='global';commit;`);
 assignment=JSON.parse(output.split('\n').find(line=>line.startsWith('ASSIGNMENT:')).slice(11));assert.ok(assignment.jobId);
 assert.equal((await mutate(`projects/${project}/generations`,body,key)).status(),202,'Real HTTP recovery uses the actual owned enqueue receipt');
 assert.equal((await foreign.get(`/api/v1/projects/${project}/generation`)).status(),401);
 let response=await api.get(`/api/v1/projects/${project}/generation`);assert.equal(response.status(),200);assert.equal((await response.json()).data.jobId,assignment.jobId);
 if(publication){
  await seedEducationFixture(publication,assignment);
  const localGuard=new LeaseGuard(assignment.serverTime,assignment.leaseExpiresAt,performance.now());const session=new EducationSession(client,assignment,instanceId,localGuard),source=safeRun(publication);
  const props=validateVideoProps(await readJson(path.join(source,'timeline.json'))),plan=StoryboardSchema.parse((await readJson(path.join(source,'story-0.json'))).value);
  await session.operation({type:'plan',dependencyHash:hash(plan),modelId:'verified-existing-Gemini-fixture',plan});
  const videoFile=path.join(source,'landscape-clean.mp4');await runTool(ffmpeg,['-v','error','-xerror','-i',videoFile,'-f','null','-'],300000);const measured=await probe(videoFile),stream=measured.streams.find(s=>s.codec_type==='video');assert.equal(stream.r_frame_rate,'30/1');
  const report={version:1,orientation:'landscape',durationMs:Math.round(measured.duration*1000),width:stream.width,height:stream.height,fps:30,fullDecode:true,audio:measured.streams.some(s=>s.codec_type==='audio'),sceneCount:plan.scenes.length,captionCount:props.captions.length,mouthCueCount:props.mouthCues.length,coverage:matchWords(plan.scenes.map(s=>s.narration).join(' '),props.captions).coverage,provider:'gemini',voice:'Kore'};
  const reportFile=path.join(session.run,'publication-verification.json');await writeJson(reportFile,report);
  const ids={video:await session.upload(videoFile,'publication-video','video'),thumbnail:await session.upload(path.join(source,'preview-landscape.png'),'publication-thumbnail','thumbnail'),srt:await session.upload(path.join(source,'captions.srt'),'publication-srt','captions_srt'),vtt:await session.upload(path.join(source,'captions.vtt'),'publication-vtt','captions_vtt'),report:await session.upload(reportFile,'publication-report','report')};
  await session.save('render','publication',hash(props),{...ids},Object.values(ids));
  const completion={type:'complete',key:'publication-smoke',...ids};await session.operation(completion);await session.operation(completion);
  assert.equal((await(await api.get(`/api/v1/projects/${project}/generation`)).json()).data.status,'succeeded');
  assert.equal((await api.get(`/api/v1/projects/${project}/result/video`,{maxRedirects:0})).status(),307);assert.equal((await foreign.get(`/api/v1/projects/${project}/result/video`)).status(),401);
  assert.equal(sql(`select retained_outputs from public.usage_accounts where owner_id='${actor}';`),'1');
  console.log('PASS: actual verified video/report uploads, durable render checkpoint, atomic Ready publication, exact completion replay and private owner-only result access. Existing public fixture reused; zero provider calls.');
 }else if(!live){
  const bytes=Buffer.from('{"fixture":"private execution smoke"}'),checksum=createHash('sha256').update(bytes).digest('hex');
  const allocation=await execute({type:'allocate',key:'smoke',kind:'alignment',bytes:bytes.length,checksum});
  const put=await fetch(allocation.uploadUrl,{method:'PUT',headers:{'Content-Type':'application/json'},body:bytes});assert.ok(put.ok,'Actual signed Storage upload works');
  await execute({type:'confirm',assetId:allocation.assetId});
  await execute({type:'checkpoint',key:'smoke',stage:'understand',dependencyHash:checksum,manifest:{fixture:true},assetIds:[allocation.assetId]});
  const permit=await execute({type:'read',assetId:allocation.assetId});const downloaded=await fetch(permit.url);assert.equal(createHash('sha256').update(Buffer.from(await downloaded.arrayBuffer())).digest('hex'),checksum);
  const plan={title:'Fixture plan',learningObjective:'Check immutable scene persistence',factualCautions:[],scenes:[0,1,2,3].map((n)=>({id:`scene-${n+1}`,title:'Fixture scene',narration:'Energy changes form.',layout:n===0?'intro':n===3?'recap':'explain',keyPoints:['Fixture'],diagramNodes:['Input','Output'],teacherGesture:'explain'}))};
  await execute({type:'plan',dependencyHash:checksum,modelId:'explicit-fixture',plan});
  await execute({type:'checkpoint',key:'story',stage:'story',dependencyHash:checksum,manifest:{plan},assetIds:[]});
  const previous={instanceId,jobId:assignment.jobId,leaseToken:assignment.leaseToken};
  sql(`update public.jobs set last_heartbeat_at=clock_timestamp()-interval '2 seconds',lease_expires_at=clock_timestamp()-interval '1 second' where id='${assignment.jobId}';update public.worker_slots set lease_expires_at=clock_timestamp()-interval '1 second' where job_id='${assignment.jobId}';`);
  instanceId=randomUUID();const replay=sql(`begin;select id from public.workers where id='${connection.workerId}' for update;select id from public.usage_accounts where scope='global' for update;update public.app_settings set claims_paused=false where id='global';select 'RECOVER:'||public.worker_control('${credentialHash}',1,'claim','${JSON.stringify({instanceId,capabilities:LOCAL_CAPABILITIES})}')::text;update public.app_settings set claims_paused=true where id='global';commit;`);assignment=JSON.parse(replay.split('\n').find(line=>line.startsWith('RECOVER:')).slice(8));assert.ok(BigInt(assignment.leaseToken)>BigInt(previous.leaseToken));
  await assert.rejects(()=>client.send('heartbeat',{instanceId:previous.instanceId,health,assignment:{jobId:previous.jobId,leaseToken:previous.leaseToken}}),/LEASE_LOST/);
  const restored=await execute({type:'state'});assert.ok(restored.checkpoints.some(c=>c.key==='smoke'&&c.assets.includes(allocation.assetId)));
  const recoveredRead=await execute({type:'read',assetId:allocation.assetId});assert.equal(createHash('sha256').update(Buffer.from(await(await fetch(recoveredRead.url)).arrayBuffer())).digest('hex'),checksum);
  await execute({type:'fail',code:'PIPELINE_FAILED'});console.log('PASS: actual private upload/receipt/hash/read, validated-plan persistence, scoped checkpoint recovery and terminal failure. No provider calls.');
 }else{
  if(reuse)await seedEducationFixture(reuse,assignment);
  guard=new LeaseGuard(assignment.serverTime,assignment.leaseExpiresAt,performance.now());child=startEducationChild(assignment,instanceId,guard,undefined,{providerCalls:!reuse});let busy=false;
  timer=setInterval(async()=>{if(busy)return;busy=true;const before=performance.now();try{const hb=await client.send('heartbeat',{instanceId,health,assignment:{jobId:assignment.jobId,leaseToken:assignment.leaseToken}},guard.controller.signal);if(hb.cancelRequested||!hb.leaseExpiresAt)throw Error('Stopped');guard.renew(hb.serverTime,hb.leaseExpiresAt,before);child.renew(hb.serverTime,hb.leaseExpiresAt);}catch{guard.stop();}finally{busy=false;}},20000);
  await child.done;if(reuse)assert.equal(sql(`select provider_attempt_count from public.jobs where id='${assignment.jobId}';`),'0','Cache-only verification must not dispatch providers');clearInterval(timer);timer=undefined;
  response=await api.get(`/api/v1/projects/${project}/generation`);const run=(await response.json()).data;assert.equal(run.status,'succeeded');
  const video=await api.get(`/api/v1/projects/${project}/result/video`,{maxRedirects:0});assert.equal(video.status(),307);assert.equal((await foreign.get(`/api/v1/projects/${project}/result/video`)).status(),401);
  for(const kind of ['srt','vtt'])assert.equal((await api.get(`/api/v1/projects/${project}/result/${kind}`,{maxRedirects:0})).status(),307);
  const evidence={live:true,reusedFrom:reuse??null,jobId:assignment.jobId,projectId:project,run,localRun:`local-runs/web-${assignment.jobId}`,verifiedAt:new Date().toISOString()};writeFileSync(`.cache/w16-live-${orientation}.json`,JSON.stringify(evidence,null,2)+'\n');writeFileSync('.cache/w16-live.json',JSON.stringify(evidence,null,2)+'\n');console.log('PASS: real owned Education job completed through the worker API and verified private result/caption access. Evidence saved in ignored .cache/w16-live.json.');
 }
}finally{
 if(timer)clearInterval(timer);guard?.stop();
 if(actor){
  const rows=JSON.parse(sql(`select coalesce(json_agg(json_build_object('bucket',bucket,'path',object_key)),'[]') from public.assets where owner_id='${actor}';`));
  const env=parseEnv(readFileSync('apps/web/.env.local','utf8')),admin=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  for(const row of rows){assert.ok(row.path.startsWith(actor+'/'));const removed=await admin.storage.from(row.bucket).remove([row.path]);if(removed.error)throw Error('Fixture media deletion not confirmed; quota retained for inspection');}
  assert.equal(sql(`select count(*) from storage.objects where name like '${actor}/%';`),'0');
  sql(`begin;set constraints all deferred;select id from public.usage_accounts where scope='global' for update;update public.worker_slots set job_id=null,worker_id=null,worker_instance_id=null,lease_token=null,lease_expires_at=null where job_id in(select id from public.jobs where owner_id='${actor}');update public.jobs set status=case when status in ('queued','waiting_worker','running','waiting_quota','cancel_requested') then 'failed' else status end,worker_id=null,worker_instance_id=null,lease_expires_at=null,last_heartbeat_at=null where owner_id='${actor}';update public.profiles set status='deleting',deletion_requested_at=now() where id='${actor}';insert into public.account_deletions(owner_id,status) values('${actor}','purging');update public.projects set latest_ready_revision_id=null,deleted_at=now() where owner_id='${actor}';update public.revisions set deleted_at=now() where owner_id='${actor}';delete from public.scene_timings where owner_id='${actor}';delete from public.checkpoint_assets where owner_id='${actor}';delete from public.checkpoints where owner_id='${actor}';delete from public.exports where owner_id='${actor}';delete from public.revision_assets where owner_id='${actor}';select public.purge_revision_plans(id) from public.revisions where owner_id='${actor}';update public.usage_accounts set used_bytes=used_bytes-coalesce((select used_bytes from public.usage_accounts where owner_id='${actor}'),0),reserved_bytes=reserved_bytes-coalesce((select reserved_bytes from public.usage_accounts where owner_id='${actor}'),0),retained_outputs=retained_outputs-coalesce((select retained_outputs from public.usage_accounts where owner_id='${actor}'),0),reserved_outputs=reserved_outputs-coalesce((select reserved_outputs from public.usage_accounts where owner_id='${actor}'),0) where scope='global';delete from public.usage_ledger where owner_id='${actor}';delete from public.assets where owner_id='${actor}';delete from public.job_terminal_operations where job_id in(select id from public.jobs where owner_id='${actor}');delete from public.job_repairs where job_id in(select id from public.jobs where owner_id='${actor}');delete from public.provider_attempts where job_id in(select id from public.jobs where owner_id='${actor}');delete from public.job_events where job_id in(select id from public.jobs where owner_id='${actor}');delete from public.job_runs where job_id in(select id from public.jobs where owner_id='${actor}');delete from public.usage_reservations where owner_id='${actor}';delete from public.idempotency_requests where owner_id='${actor}';delete from public.jobs where owner_id='${actor}';delete from public.revisions where owner_id='${actor}';delete from public.projects where owner_id='${actor}';delete from public.usage_accounts where owner_id='${actor}';delete from public.account_deletions where owner_id='${actor}';delete from public.profiles where id='${actor}';delete from auth.users where id='${actor}';commit;`);
  console.log('Disposable Education records/media removed after verified physical deletion; original quotas and pauses preserved.');
 }
 await api.dispose();await foreign.dispose();
}
