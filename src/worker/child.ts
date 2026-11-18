import {fork,execFile} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import type {WorkerAssignment} from '../../shared/contracts/worker.ts';
import {LeaseGuard} from './transport.js';
export function startEducationChild(assignment:WorkerAssignment,instanceId:string,guard:LeaseGuard,config?:string,options?:{providerCalls?:boolean}){
 const child=fork(fileURLToPath(new URL('./run-education.ts',import.meta.url)),[],{env:{...process.env,...(options?.providerCalls===false?{WORKER_PROVIDER_CALLS_ALLOWED:'false'}:{})},execArgv:['--import','tsx','--env-file-if-exists=.env'],stdio:['ignore','inherit','inherit','ipc'],windowsHide:true,detached:process.platform!=='win32'});
 const stop=()=>{if(!child.pid||child.exitCode!==null)return;if(process.platform==='win32')execFile('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true},()=>{});else try{process.kill(-child.pid,'SIGTERM');}catch{child.kill();}};
 guard.controller.signal.addEventListener('abort',stop,{once:true});if(guard.controller.signal.aborted)stop();
 let complete=false;child.on('message',(message:unknown)=>{const type=(message as {type?:string})?.type;if(type==='complete')complete=true;if(type==='failed')stop();});
 const done=new Promise<void>((resolve,reject)=>{child.once('error',()=>reject(Error('EDUCATION_EXECUTOR_UNAVAILABLE')));child.once('exit',code=>{guard.controller.signal.removeEventListener('abort',stop);if(code===0&&complete)resolve();else reject(Error('EDUCATION_EXECUTOR_FAILED'));});});
 child.send({type:'start',assignment,instanceId,config});
 return{done,renew:(serverTime:string,leaseExpiresAt:string)=>{if(child.connected)child.send({type:'renew',serverTime,leaseExpiresAt});}};
}
