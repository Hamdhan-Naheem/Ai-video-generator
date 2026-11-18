import {WorkerExecutionReplySchema} from '../../shared/contracts/execution.ts';
import {WorkerConnectionSchema,WorkerCapabilitiesSchema,WorkerHeartbeatSchema,WorkerAssignmentSchema,WorkerReleaseSchema,type WorkerAssignment} from '../../shared/contracts/worker.ts';
import type {z} from 'zod';
export const LOCAL_CAPABILITIES=WorkerCapabilitiesSchema.parse({modes:['education'],orientations:['landscape','portrait'],compositionVersion:'v1',schemaVersions:[1]});
export class WorkerTransportError extends Error{constructor(public readonly code:string){super(code);}}
export class WorkerTransport{
 private connection:z.infer<typeof WorkerConnectionSchema>;
 constructor(config:unknown,private readonly fetcher:typeof fetch=fetch){this.connection=WorkerConnectionSchema.parse(config);const u=new URL(this.connection.origin);if(u.origin!==this.connection.origin || u.username||u.password || (u.protocol!=='https:'&&this.connection.origin!=='http://127.0.0.1:3000'))throw new WorkerTransportError('WORKER_ORIGIN_INVALID');}
 async send(action:'claim'|'heartbeat'|'release'|'execute',body:unknown,signal?:AbortSignal){
  const response=await this.fetcher(`${this.connection.origin}/api/worker/v1/${action}`,{method:'POST',headers:{Authorization:`Bearer ${this.connection.token}`,'X-Worker-Protocol':'1','Content-Type':'application/json'},body:JSON.stringify(body),redirect:'error',cache:'no-store',signal:AbortSignal.any([AbortSignal.timeout(8000),...(signal?[signal]:[])])});
  if(response.status===204&&action==='claim')return null;
  if(!response.ok){if(response.status===401)throw new WorkerTransportError('WORKER_AUTH_REQUIRED');if(response.status===409){
    // A budget/receipt conflict is not proof that a live assignment expired.
    let code='WORKER_EXECUTION_UNAVAILABLE';const reader=response.body?.getReader();
    if(reader){let size=0;const chunks:Uint8Array[]=[];for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>16384){await reader.cancel();break;}chunks.push(part.value);}if(size<=16384)try{const candidate=JSON.parse(Buffer.concat(chunks).toString('utf8'))?.error?.code;if(['ARTIFACT_UPLOAD_INCOMPLETE','PROVIDER_DAILY_LIMIT','LEASE_LOST','WORKER_BUDGET_OR_RECONCILIATION','WORKER_EXECUTION_UNAVAILABLE'].includes(candidate))code=candidate;}catch{/* Ignore untrusted response details. */}}
    throw new WorkerTransportError(code);
   }if(response.status===422)throw new WorkerTransportError('INVALID_WORKER_REQUEST');throw new WorkerTransportError('WORKER_UNAVAILABLE');}
  const reader=response.body?.getReader();if(!reader)throw new WorkerTransportError('WORKER_RESPONSE_INVALID');
  let size=0;const chunks:Uint8Array[]=[];
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>262144){await reader.cancel();throw new WorkerTransportError('WORKER_RESPONSE_INVALID');}chunks.push(value);}
  const value=JSON.parse(Buffer.concat(chunks).toString('utf8')) as {data:unknown};
  return (action==='execute'?WorkerExecutionReplySchema:action==='claim'?WorkerAssignmentSchema:action==='heartbeat'?WorkerHeartbeatSchema:WorkerReleaseSchema).parse(value.data);
 }
}
/** Server-relative TTL projected onto a monotonic clock. Late replies cannot revive a lease. */
export class LeaseGuard{
 private deadline:number;private stopped=false;readonly controller=new AbortController();
 constructor(serverTime:string,expiresAt:string,before:number,private readonly now:()=>number=()=>performance.now()){this.deadline=this.project(serverTime,expiresAt,before);}
 private project(serverTime:string,expiresAt:string,before:number){const ttl=Date.parse(expiresAt)-Date.parse(serverTime);if(!Number.isFinite(ttl)||!Number.isFinite(before)){this.stop();throw new WorkerTransportError('LEASE_LOST');}return before+Math.max(0,Math.min(90000,ttl)-5000);}
 assertActive(){if(this.stopped||this.controller.signal.aborted||this.now()>=this.deadline){this.stop();throw new WorkerTransportError('LEASE_LOST');}}
 renew(serverTime:string,expiresAt:string,before:number){this.assertActive();this.deadline=this.project(serverTime,expiresAt,before);this.assertActive();}
 stop(){this.stopped=true;this.controller.abort();}
}
export type {WorkerAssignment};
