import {spawn} from 'node:child_process';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import assert from 'node:assert/strict';

// Local metadata-only integration. Never contacts providers, raises limits,
// resets the database, or leaves claim/generation pauses disabled.
const actor=randomUUID(),project=randomUUID(),instances=[randomUUID(),randomUUID()];
const workers=[0,1].map(()=>{const token='wkr_'+randomBytes(32).toString('base64url');return{id:randomUUID(),token,hash:createHash('sha256').update(token).digest('hex')};});
const caps={modes:['education'],orientations:['landscape','portrait'],schemaVersions:[1],compositionVersion:'v1'};
const claim=i=>({instanceId:instances[i],capabilities:caps});
const health={freeDiskBytes:'4000000000',freeMemoryBytes:'2000000000',toolVersions:{node:process.versions.node}};
function query(sql,onLocked){return new Promise((resolve,reject)=>{const p=spawn('docker',['exec','-i','supabase_db_ai-video-studio-local','psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-Atq'],{windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='';p.stdout.on('data',chunk=>{out+=chunk;if(out.includes('LOCKED'))onLocked?.();});p.stderr.on('data',chunk=>err+=chunk);p.on('error',reject);p.on('close',code=>resolve({code,out,err}));p.stdin.end('\\set VERBOSITY sqlstate\n'+sql);});}
async function must(sql){const r=await query(sql);if(r.code!==0)throw Error('Worker fixture SQL failed ('+(r.err.match(/[A-Z0-9]{5}:/)?.[0]??'database error')+').');return r.out.trim();}
const rpc=(i,action,body)=>`public.worker_control('${workers[i].hash}',1,'${action}','${JSON.stringify(body)}'::jsonb)`;
function claimTransaction(i){return `begin;set local lock_timeout='8s';set local statement_timeout='15s';select id from public.usage_accounts where scope='global' for update;select set_config('w15.pause',(select claims_paused::text from public.app_settings where id='global'),true);update public.app_settings set claims_paused=false where id='global';select ${rpc(i,'claim',claim(i))};update public.app_settings set claims_paused=current_setting('w15.pause')::boolean where id='global';select pg_sleep(0.1);commit;`;}
let jobId;
try{
 const settings=JSON.parse(await must("select json_build_object('generation',generation_paused,'claims',claims_paused,'occupied',(select job_id is not null from public.worker_slots where slot_name='processing'),'active',exists(select 1 from public.jobs where status in ('queued','waiting_worker','running','waiting_quota','cancel_requested'))) from public.app_settings where id='global';"));
 assert.deepEqual(settings,{generation:true,claims:true,occupied:false,active:false},'Requires paused local stack with no active or queued jobs');
 await must(`begin;insert into auth.users(id,email) values('${actor}','worker-race-${actor}@example.invalid');insert into public.usage_accounts(scope,owner_id,byte_limit,output_limit) values('user','${actor}',400000000,3);insert into public.projects(id,owner_id,title,mode,draft_input) values('${project}','${actor}','Worker race','education','{"topic":"Turbines","audience":"beginner","intendedUse":"personal-learning","sources":[]}');${workers.map(w=>`insert into public.workers(id,label,enabled,protocol_version,capabilities) values('${w.id}','Disposable worker fixture',true,1,'${JSON.stringify(caps)}');insert into public.worker_credentials(worker_id,token_hash,expires_at) values('${w.id}','${w.hash}',now()+interval '1 hour');`).join('')}update public.app_settings set generation_paused=false where id='global';select set_config('request.jwt.claims','{"sub":"${actor}","role":"authenticated"}',true);select public.enqueue_generation('${project}','worker-race','{"draftVersion":1,"preferences":{"targetSeconds":60,"orientation":"landscape","voiceProfileId":"Kore"},"acknowledgments":{"sourceRights":true,"externalAiProcessing":true,"policyVersion":"v1"}}');update public.app_settings set generation_paused=true where id='global';commit;`);
 jobId=await must(`select id from public.jobs where owner_id='${actor}';`);
 const results=await Promise.all([0,1].map(i=>query(claimTransaction(i))));assert.ok(results.every(r=>r.code===0),'Both competing transactions finish');
 const assignments=results.map(r=>JSON.parse(r.out.split('\n').find(line=>line.startsWith('{'))));
 assert.equal(assignments.filter(a=>a.jobId===jobId).length,1);assert.equal(assignments.filter(a=>a.idle).length,1);
 const winner=assignments.findIndex(a=>a.jobId===jobId),loser=1-winner,first=assignments[winner];
 assert.equal(await must(`select count(*) from public.job_runs where job_id='${jobId}';`),'1');
 const recovery=await Promise.all([0,1].map(()=>must(`select ${rpc(winner,'claim',claim(winner))};`)));
 assert.ok(recovery.every(r=>JSON.parse(r).leaseToken===first.leaseToken));assert.equal(await must(`select count(*) from public.job_runs where job_id='${jobId}';`),'1');
 console.log('PASS: two real workers compete for one global slot; concurrent lost-response recovery creates one run.');
 if(process.argv.includes('--http')){
  const origin='http://127.0.0.1:3000';
  async function request(i,action,body,extra={},raw=false){return fetch(`${origin}/api/worker/v1/${action}`,{method:'POST',headers:{Authorization:`Bearer ${workers[i].token}`,'X-Worker-Protocol':'1','Content-Type':'application/json',...extra},body:raw?body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(15000)});}
  let r=await request(winner,'claim',claim(winner));assert.equal(r.status,200);let data=await r.json();assert.equal(data.data.jobId,jobId);assert.equal(data.data.leaseToken,first.leaseToken);assert.match(r.headers.get('cache-control'),/no-store/);
  r=await request(loser,'claim',claim(loser));assert.equal(r.status,204);assert.equal(r.headers.get('retry-after'),'15');
  r=await request(winner,'heartbeat',{instanceId:instances[winner],health,assignment:{jobId,leaseToken:first.leaseToken}});assert.equal(r.status,200);data=await r.json();assert.equal(data.data.cancelRequested,false);assert.ok(data.data.leaseExpiresAt);
  for(const [headers,status] of [[{Authorization:'Bearer user.jwt.invalid'},401],[{Origin:origin},401],[{'X-Worker-Protocol':'2'},503]]){r=await request(winner,'claim',claim(winner),headers);assert.equal(r.status,status);}
  r=await request(winner,'claim',{...claim(winner),workerId:workers[loser].id});assert.equal(r.status,422);
  r=await fetch(`${origin}/api/worker/v1/claim`,{headers:{Authorization:`Bearer ${workers[winner].token}`},signal:AbortSignal.timeout(15000)});assert.equal(r.status,405);
  r=await fetch(`${origin}/api/worker/v1/claim?unknown=1`,{method:'POST',headers:{Authorization:`Bearer ${workers[winner].token}`,'X-Worker-Protocol':'1','Content-Type':'application/json'},body:JSON.stringify(claim(winner)),signal:AbortSignal.timeout(15000)});assert.equal(r.status,422);
  await must(`update public.worker_credentials set revoked_at=clock_timestamp() where worker_id='${workers[winner].id}';`);r=await request(winner,'claim',claim(winner));assert.equal(r.status,401);await must(`update public.worker_credentials set revoked_at=null where worker_id='${workers[winner].id}';`);
  r=await request(winner,'claim','{"padding":"'+'x'.repeat(17000)+'"}',{},true);assert.equal(r.status,413);
  r=await request(winner,'claim','{',{},true);assert.equal(r.status,400);
  r=await request(winner,'heartbeat',{instanceId:instances[winner],health,assignment:{jobId,leaseToken:'999'}});assert.equal(r.status,409);
  r=await fetch(`${origin}/api/v1/jobs/${jobId}`,{headers:{Authorization:`Bearer ${workers[winner].token}`},signal:AbortSignal.timeout(15000)});assert.equal(r.status,401);
  console.log('PASS: real worker HTTP claim/heartbeat, auth separation, protocol, spoofing, body bounds, malformed JSON and stale fence.');
 }
 await must(`update public.jobs set last_heartbeat_at=clock_timestamp()-interval '2 seconds',lease_expires_at=clock_timestamp()-interval '1 second' where id='${jobId}';update public.worker_slots set lease_expires_at=clock_timestamp()-interval '1 second' where job_id='${jobId}';`);
 const reclaimed=await must(claimTransaction(loser));const next=JSON.parse(reclaimed.split('\n').find(line=>line.startsWith('{')));assert.equal(next.jobId,jobId);assert.ok(BigInt(next.leaseToken)>BigInt(first.leaseToken));
 const stale=await query(`select ${rpc(winner,'heartbeat',{instanceId:instances[winner],health,assignment:{jobId,leaseToken:first.leaseToken}})};`);assert.notEqual(stale.code,0);assert.match(stale.err,/P1503/);
 assert.equal(await must(`select count(*) from public.job_runs where job_id='${jobId}';`),'2');
 console.log('PASS: expired assignment is reclaimed with a higher fence; the original process cannot renew it.');
 // A token may expire while waiting for a usage lock; recheck against real time.
 await must(`update public.worker_credentials set expires_at=clock_timestamp()+interval '2 seconds' where worker_id='${workers[winner].id}';`);
 let locked;const ready=new Promise(resolve=>locked=resolve);
 const blocker=query("begin;select id from public.usage_accounts where scope='global' for update;select 'LOCKED';select pg_sleep(3);commit;",locked);
 await Promise.race([ready,blocker.then(()=>{throw Error('Metadata lock fixture ended before signaling readiness');})]);
 const expired=await query(`select ${rpc(winner,'heartbeat',{instanceId:instances[winner],health})};`);assert.equal((await blocker).code,0);assert.notEqual(expired.code,0);assert.match(expired.err,/P1501/);
 console.log('PASS: credentials expiring behind a held metadata lock cannot authorize a late heartbeat.');
}finally{
 // Only this run's UUID owner/worker records are removed; physical user media,
 // existing workers, settings, limits and other accounting stay untouched.
 await must(`begin;set constraints all deferred;select id from public.usage_accounts where scope='global' for update;update public.worker_slots set job_id=null,worker_id=null,worker_instance_id=null,lease_token=null,lease_expires_at=null where job_id in(select id from public.jobs where owner_id='${actor}');update public.usage_accounts set reserved_bytes=reserved_bytes-coalesce((select reserved_bytes from public.usage_accounts where owner_id='${actor}'),0),reserved_outputs=reserved_outputs-coalesce((select reserved_outputs from public.usage_accounts where owner_id='${actor}'),0) where scope='global';delete from public.checkpoints where owner_id='${actor}';delete from public.job_events where job_id in(select id from public.jobs where owner_id='${actor}');delete from public.job_runs where job_id in(select id from public.jobs where owner_id='${actor}');delete from public.usage_ledger where owner_id='${actor}';delete from public.idempotency_requests where owner_id='${actor}';delete from public.revision_assets where owner_id='${actor}';delete from public.usage_reservations where owner_id='${actor}';delete from public.jobs where owner_id='${actor}';delete from public.revisions where owner_id='${actor}';delete from public.projects where owner_id='${actor}';delete from public.usage_accounts where owner_id='${actor}';delete from public.profiles where id='${actor}';delete from auth.users where id='${actor}';delete from public.worker_credentials where worker_id in('${workers[0].id}','${workers[1].id}');delete from public.workers where id in('${workers[0].id}','${workers[1].id}');commit;`);
 console.log('Worker fixtures removed; existing pauses, quotas and application data preserved.');
}
