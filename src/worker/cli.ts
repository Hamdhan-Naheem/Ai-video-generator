import {startEducationChild} from './child.js';
import {readFile,statfs} from 'node:fs/promises';
import {freeWorkerMemory} from './resources.ts';
import {randomUUID} from 'node:crypto';
import {setTimeout as pause} from 'node:timers/promises';
import {parseArgs} from 'node:util';
import {WorkerConnectionSchema,WorkerAssignmentSchema,WorkerHeartbeatSchema} from '../../shared/contracts/worker.ts';
import {WorkerTransport,WorkerTransportError,LeaseGuard,LOCAL_CAPABILITIES} from './transport.js';
import {prepareAssignment} from './adapter.js';
const options=parseArgs({strict:true,options:{once:{type:'boolean'},execute:{type:'boolean'},config:{type:'string'}}}).values;
const stopping=new AbortController();for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>stopping.abort());
async function health(){const disk=await statfs(process.cwd(),{bigint:true});return{executionReady:options.execute===true,freeDiskBytes:(disk.bavail*disk.bsize).toString(),freeMemoryBytes:String(freeWorkerMemory()),toolVersions:{node:process.versions.node}};}
async function main(){
 const connection=WorkerConnectionSchema.parse(JSON.parse(await readFile(options.config??'.cache/worker/connection.json','utf8'))),client=new WorkerTransport(connection),instanceId=randomUUID();let delay=15000,idleDelay=15000,connected=false;
 do{
  try{
   const state=WorkerHeartbeatSchema.parse(await client.send('heartbeat',{instanceId,health:await health()},stopping.signal));
   if(!connected){console.log('Worker connected. Worker control connection is ready.');connected=true;}
   const before=performance.now(),raw=options.execute?await client.send('claim',{instanceId,capabilities:LOCAL_CAPABILITIES},stopping.signal):null;
   if(raw){const assignment=WorkerAssignmentSchema.parse(raw),guard=new LeaseGuard(assignment.serverTime,assignment.leaseExpiresAt,before);let pending:Promise<void>|undefined;let execution:ReturnType<typeof startEducationChild>|undefined;
    const stopLease=()=>guard.stop();stopping.signal.addEventListener('abort',stopLease,{once:true});if(stopping.signal.aborted)guard.stop();
    const timer=setInterval(()=>{if(pending)return;const start=performance.now();pending=(async()=>{try{guard.assertActive();const heartbeat=WorkerHeartbeatSchema.parse(await client.send('heartbeat',{instanceId,health:await health(),assignment:{jobId:assignment.jobId,leaseToken:assignment.leaseToken}},guard.controller.signal));if(heartbeat.cancelRequested||!heartbeat.leaseExpiresAt){guard.stop();return;}guard.renew(heartbeat.serverTime,heartbeat.leaseExpiresAt,start);execution?.renew(heartbeat.serverTime,heartbeat.leaseExpiresAt);}catch{guard.stop();}finally{pending=undefined;}})();},20000);
    try{await prepareAssignment(assignment,guard,instanceId);if(options.execute){execution=startEducationChild(assignment,instanceId,guard,options.config);await execution.done;console.log('Education job completed and verified.');}else console.log('Assignment prepared; run with --execute for the Education executor.');}
    finally{clearInterval(timer);stopping.signal.removeEventListener('abort',stopLease);guard.stop();if(pending)await pending;try{await client.send('release',{instanceId,jobId:assignment.jobId,leaseToken:assignment.leaseToken,reason:stopping.signal.aborted?'stopping':'adapter_pending'});}catch{/* An expired/revoked assignment must be recovered by the server, never published locally. */}}
   }else if(options.once)console.log(!options.execute?'Control-only heartbeat verified; use worker:run for Education processing.':state.claimsPaused?'Claims are paused; heartbeat verified.':'No eligible assignment.');
   delay=raw?15000:idleDelay;idleDelay=raw?15000:Math.min(idleDelay*2,60000);
  }catch(cause){if(stopping.signal.aborted)break;const code=cause instanceof WorkerTransportError?cause.code:'WORKER_UNAVAILABLE';console.error(code);if(options.once||code==='WORKER_AUTH_REQUIRED'||code==='INVALID_WORKER_REQUEST')throw new WorkerTransportError(code);delay=Math.min(delay*2,300000);}
  if(options.once||stopping.signal.aborted)break;
  try{await pause(delay+Math.floor(Math.random()*1000),undefined,{signal:stopping.signal});}catch{break;}
 }while(!stopping.signal.aborted);
}
main().catch(cause=>{console.error(cause instanceof WorkerTransportError?cause.code:'Worker setup or service is unavailable. Check the ignored local worker configuration.');process.exitCode=1;});
