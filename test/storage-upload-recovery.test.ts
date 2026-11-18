import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,unlink,rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {EducationSession} from '../src/worker/education.ts';
import {WorkerTransport,WorkerTransportError,LeaseGuard,type WorkerAssignment} from '../src/worker/transport.ts';
import {educationFailureCode} from '../src/worker/failure.ts';

test('Storage uploads reconcile uncertain/rejected transfers without replaying PUT and preserve lease authority',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'storage-recovery-')),file=path.join(dir,'narration.wav');await writeFile(file,Buffer.from('synthetic cached narration'));const original=globalThis.fetch;
 try{
  for(const transfer of ['lost','timeout','rejected','accepted','body-error','available']){
   for(const confirmation of ['success','incomplete','network','timeout','unavailable','lease','auth','integrity']){
    const stamp=new Date().toISOString(),guard=new LeaseGuard(stamp,new Date(Date.now()+90000).toISOString(),performance.now());
    const assetId=randomUUID(),calls:string[]=[];let puts=0;
    const client={send:async(_action:string,body:unknown)=>{const op=(body as {operation:{type:string;assetId?:string}}).operation;calls.push(op.type);if(op.type==='allocate')return{serverTime:stamp,leaseExpiresAt:new Date(Date.now()+90000).toISOString(),value:{state:transfer==='available'?'available':'allocated',assetId,uploadUrl:'http://127.0.0.1:55421/storage/v1/upload/synthetic',mime:'audio/wav'}};assert.equal(op.type,'confirm');assert.equal(op.assetId,assetId);if(confirmation==='network')throw new TypeError('private connection detail');if(confirmation==='timeout')throw new DOMException('private timeout detail','TimeoutError');const code={incomplete:'ARTIFACT_UPLOAD_INCOMPLETE',unavailable:'WORKER_UNAVAILABLE',lease:'LEASE_LOST',auth:'WORKER_AUTH_REQUIRED',integrity:'WORKER_BUDGET_OR_RECONCILIATION'}[confirmation];if(code)throw new WorkerTransportError(code);return{serverTime:stamp,leaseExpiresAt:new Date(Date.now()+90000).toISOString(),value:{}};}} as unknown as WorkerTransport;
    globalThis.fetch=async(_url,init)=>{puts++;assert.equal(init?.method,'PUT');assert.equal((init?.headers as Record<string,string>)['x-upsert'],'false');if(transfer==='lost')throw new TypeError('private signed URL');if(transfer==='timeout')throw new DOMException('timeout','TimeoutError');if(transfer==='body-error')return{body:{cancel:async()=>{throw new TypeError('stream lost');}}} as unknown as Response;return new Response('',{status:transfer==='rejected'?409:200});};
    const session=new EducationSession(client,{jobId:randomUUID(),leaseToken:'1'} as WorkerAssignment,randomUUID(),guard);
    if(confirmation==='success')assert.equal(await session.upload(file,'scene-1-audio','audio'),assetId);
    else await assert.rejects(()=>session.upload(file,'scene-1-audio','audio'),error=>{assert.equal(educationFailureCode(error,'voice'),['incomplete','network','timeout','unavailable'].includes(confirmation)?'STORAGE_UNAVAILABLE':'PIPELINE_FAILED');if(confirmation==='auth')assert.equal((error as WorkerTransportError).code,'WORKER_AUTH_REQUIRED');if(confirmation==='lease')assert.equal((error as WorkerTransportError).code,'LEASE_LOST');return true;});
    assert.deepEqual(calls,['allocate','confirm']);assert.equal(puts,transfer==='available'?0:1);
   }
  }
  for(const cancelAt of ['transfer','confirm']){
   const stamp=new Date().toISOString(),guard=new LeaseGuard(stamp,new Date(Date.now()+90000).toISOString(),performance.now());let confirms=0;
   const client={send:async(_action:string,body:unknown)=>{const op=(body as {operation:{type:string}}).operation;if(op.type==='allocate')return{serverTime:stamp,leaseExpiresAt:new Date(Date.now()+90000).toISOString(),value:{state:'allocated',assetId:randomUUID(),uploadUrl:'http://127.0.0.1:55421/storage/v1/upload/synthetic',mime:'audio/wav'}};confirms++;guard.stop();throw new TypeError('connection closed');}} as unknown as WorkerTransport;
   globalThis.fetch=async()=>{if(cancelAt==='transfer')guard.stop();throw new DOMException('aborted','AbortError');};
   const session=new EducationSession(client,{jobId:randomUUID(),leaseToken:'1'} as WorkerAssignment,randomUUID(),guard);
   await assert.rejects(()=>session.upload(file,'scene-1-audio','audio'),e=>e instanceof WorkerTransportError&&e.code==='LEASE_LOST');assert.equal(confirms,cancelAt==='transfer'?0:1);
  }
 }finally{globalThis.fetch=original;await unlink(file);await rmdir(dir);}
});

