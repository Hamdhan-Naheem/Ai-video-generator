import {withJobWorkspace} from '../maintenance/workspaces.ts';
import {root} from '../storage.js';
import {educationFailureCode,educationFailureDetail} from './failure.js';
import {execFile} from 'node:child_process';
import {ProviderError} from '../providers.js';
import {WorkerTransportError} from './transport.js';
import {writeJson} from '../storage.js';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {WorkerConnectionSchema,WorkerAssignmentSchema} from '../../shared/contracts/worker.ts';
import {WorkerTransport} from './transport.js';
import {EducationSession,executeEducation} from './education.js';
class ParentAuthority {readonly controller=new AbortController();assertActive(){if(!process.connected||this.controller.signal.aborted){this.stop();throw new WorkerTransportError('LEASE_LOST');}}stop(){this.controller.abort();}}
let guard:ParentAuthority|undefined,started=false,finished=false;
process.on('disconnect',()=>{guard?.stop();if(!finished){if(process.platform==='win32')execFile('taskkill',['/PID',String(process.pid),'/T','/F'],{windowsHide:true},()=>{process.exit(1);});else process.exit(1);}});
const notify=(type:string)=>{if(process.connected)process.send?.({type},()=>{});};
const disconnect=()=>{if(process.connected)process.disconnect?.();};
process.on('message',async(raw:unknown)=>{
 try{
  const value=raw as {type?:string;assignment?:unknown;instanceId?:string;config?:string;serverTime?:string;leaseExpiresAt?:string};
  if(value.type==='renew')return;
  if(value.type!=='start'||started)return;started=true;
  const assignment=WorkerAssignmentSchema.parse(value.assignment),config=WorkerConnectionSchema.parse(JSON.parse(await readFile(value.config??'.cache/worker/connection.json','utf8')));guard=new ParentAuthority();
  const session=new EducationSession(new WorkerTransport(config),assignment,String(value.instanceId),guard);
  try{await executeEducation(session);notify('complete');process.exitCode=0;}
  catch(cause){const detail=educationFailureDetail(cause);console.error('Education stopped: '+detail.code);try{await withJobWorkspace(root,assignment,()=>writeJson(path.join(session.run,'failure-summary.json'),{step:session.lastOperation,code:detail.code,issues:detail.issues,stage:session.lastStage,provider:cause instanceof ProviderError?cause.provider:null,httpStatus:cause instanceof ProviderError?cause.status:null}));}catch{console.error('EDUCATION_DIAGNOSTIC_WRITE_UNAVAILABLE');}try{if(!guard.controller.signal.aborted)await session.operation({type:'fail',code:educationFailureCode(cause,session.lastStage)});}catch{/* Expired authority cannot finalize any outcome. */}notify('failed');process.exitCode=1;}
  finally{finished=true;guard.stop();disconnect();}
 }catch{finished=true;notify('failed');process.exitCode=1;disconnect();}
});
