import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {WorkerClaimRequestSchema,WorkerHeartbeatRequestSchema,LeaseTokenSchema,WorkerAssignmentSchema} from '../shared/contracts/worker.ts';
import {WorkerTransport,LeaseGuard,LOCAL_CAPABILITIES} from '../src/worker/transport.ts';
import {prepareAssignment} from '../src/worker/adapter.ts';
import {safeRun} from '../src/storage.ts';
test('worker bodies reject identity spoofing, credential paths and invalid lease decimals',()=>{
 const instanceId=randomUUID();assert.equal(WorkerClaimRequestSchema.safeParse({instanceId,capabilities:LOCAL_CAPABILITIES}).success,true);assert.equal(WorkerClaimRequestSchema.safeParse({instanceId,capabilities:LOCAL_CAPABILITIES,workerId:randomUUID()}).success,false);
 for(const value of ['0','01','-1','1.0','token','9223372036854775808'])assert.equal(LeaseTokenSchema.safeParse(value).success,false);
 assert.equal(WorkerHeartbeatRequestSchema.safeParse({instanceId,health:{freeDiskBytes:'10',freeMemoryBytes:'10',toolVersions:{node:'C:/private/path'}}}).success,false);
});
test('lease safety uses monotonic server TTL and cannot revive after expiry or stop',()=>{
 assert.throws(()=>new LeaseGuard('invalid','invalid',0),/LEASE_LOST/);let now=1000;const guard=new LeaseGuard('2026-11-06T00:00:00Z','2026-11-06T00:01:30Z',1000,()=>now);guard.assertActive();now=20000;guard.renew('2026-11-06T00:00:20Z','2026-11-06T00:01:50Z',19000);now=104001;assert.throws(()=>guard.assertActive(),/LEASE_LOST/);assert.throws(()=>guard.renew('2026-11-06T00:02:00Z','2026-11-06T00:03:30Z',now),/LEASE_LOST/);assert.equal(guard.controller.signal.aborted,true);
});
test('worker transport pins origin, rejects redirects and never treats authentication failure as idle',async()=>{
 const config={origin:'http://127.0.0.1:3000',workerId:randomUUID(),credentialId:randomUUID(),token:'wkr_'+'a'.repeat(43),expiresAt:'2026-12-01T00:00:00Z'};
 for(const origin of ['http://example.invalid','http://127.0.0.1:3000/private','https://user:secret@example.invalid'])assert.throws(()=>new WorkerTransport({...config,origin}));
 const client=new WorkerTransport(config,async(input,init)=>{assert.equal(String(input),'http://127.0.0.1:3000/api/worker/v1/claim');assert.equal(init?.redirect,'error');return new Response(null,{status:204});});assert.equal(await client.send('claim',{instanceId:randomUUID(),capabilities:LOCAL_CAPABILITIES}),null);
 const denied=new WorkerTransport(config,async()=>new Response('{}',{status:401}));await assert.rejects(()=>denied.send('claim',{}),/WORKER_AUTH_REQUIRED/);const oversized=new WorkerTransport(config,async()=>new Response('x'.repeat(262145)));await assert.rejects(()=>oversized.send('claim',{}),/WORKER_RESPONSE_INVALID/);
});
test('local adapter reuses validated immutable manifest across fences and isolates attempts from CLI demos',async()=>{
 const jobId=randomUUID(),revisionId=randomUUID(),instanceId=randomUUID(),run=safeRun(`web-${jobId}`),stamp='2026-11-06T00:00:00Z';
 const claim=WorkerAssignmentSchema.parse({jobId,revisionId,projectId:randomUUID(),kind:'generation',stage:'understand',leaseToken:'1',serverTime:stamp,leaseExpiresAt:'2026-11-06T00:01:30Z',heartbeatIntervalSeconds:20,input:{schemaVersion:1,inputHash:'a'.repeat(64),inputAssetIds:[],manifest:{input:{mode:'education',title:'Fixture',topic:'Turbines',audience:'beginner',intendedUse:'personal-learning',sources:[]},preferences:{targetSeconds:60,orientation:'landscape',voiceProfileId:'Kore'},acknowledgments:{sourceRights:true,externalAiProcessing:true,policyVersion:'v1',acceptedAt:stamp},draftVersion:1}},budgets:{maxExternalAttempts:24,usedExternalAttempts:0,maxRepairs:2,usedRepairs:0,maxActiveMs:'1800000',usedActiveMs:'0'},checkpoints:[]});
 try{const first=await prepareAssignment(claim,new LeaseGuard(stamp,claim.leaseExpiresAt,0,()=>1),instanceId);const cached=await readFile(path.join(run,'worker-assignment.json'),'utf8');const second=await prepareAssignment({...claim,leaseToken:'3'},new LeaseGuard(stamp,claim.leaseExpiresAt,0,()=>1),instanceId);assert.equal(await readFile(path.join(run,'worker-assignment.json'),'utf8'),cached);assert.notEqual(first.attempt,second.attempt);const damaged=JSON.parse(cached);damaged.value.input.topic='Wrong cached topic';await writeFile(path.join(run,'worker-assignment.json'),JSON.stringify(damaged));const restored=await prepareAssignment({...claim,leaseToken:'5'},new LeaseGuard(stamp,claim.leaseExpiresAt,0,()=>1),randomUUID());assert.equal(restored.manifest.input.mode,'education');assert.equal(JSON.stringify(restored.manifest),JSON.stringify(claim.input.manifest));assert.notEqual(run,safeRun('education-demo'));assert.equal(JSON.parse(await readFile(path.join(second.attempt,'assignment.json'),'utf8')).leaseToken,'3');
  const stopped=new LeaseGuard(stamp,claim.leaseExpiresAt,0,()=>1);stopped.stop();await assert.rejects(()=>prepareAssignment(claim,stopped,instanceId),/LEASE_LOST/);
  await assert.rejects(()=>prepareAssignment({...claim,input:{...claim.input,inputAssetIds:[randomUUID()]}},new LeaseGuard(stamp,claim.leaseExpiresAt,0,()=>1),instanceId),/WORKER_SOURCE_SCOPE_INVALID/);
 }finally{if(run!==safeRun(`web-${jobId}`)||!/^web-[a-f0-9-]{36}$/.test(path.basename(run)))throw Error('Unsafe fixture cleanup');await rm(run,{recursive:true,force:true});await rm(path.join(path.dirname(path.dirname(run)),'.cache','worker-workspaces','records',jobId+'.json'),{force:true});}
});
