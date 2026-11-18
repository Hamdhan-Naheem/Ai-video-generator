import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {lstat,mkdir,realpath,readFile,writeFile,rename,unlink,rmdir,readdir,rm,opendir} from 'node:fs/promises';
import {z} from 'zod';

const id=z.string().regex(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
export const WorkspaceRecord=z.strictObject({version:z.literal(1),jobId:id,projectId:id,revisionId:id,createdAt:z.iso.datetime()});
export type RecordInfo=z.infer<typeof WorkspaceRecord>;
export type JobState={jobId:string;projectId:string;revisionId:string;kind:string;status:string;finishedAt:string|null;leaseExpiresAt:string|null;revisionExpiresAt:string|null;serverTime:string};
export type StateReader=(record:RecordInfo)=>Promise<JobState|null>;
const hour=3600000;
async function info(p:string){try{return await lstat(p);}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}}
async function directory(parent:string,name:string,create=false){const p=path.join(parent,name);if(create)try{await mkdir(p);}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;}const s=await info(p);if(!s)return null;if(!s.isDirectory()||s.isSymbolicLink()||path.relative(p,await realpath(p))!=='')throw Error('WORKSPACE_UNSAFE_PATH');return p;}
async function roots(repo:string,create=false){const base=await realpath(repo);if(path.relative(path.resolve(repo),base)!=='')throw Error('WORKSPACE_UNSAFE_ROOT');const runs=await directory(base,'local-runs',create),cache=await directory(base,'.cache',create);if(!runs||!cache)return null;const meta=await directory(cache,'worker-workspaces',create);if(!meta)return null;const records=await directory(meta,'records',create),locks=await directory(meta,'locks',create);return records&&locks?{runs,meta,records,locks}:null;}
async function json(p:string){const s=await info(p);if(!s||!s.isFile()||s.isSymbolicLink()||s.size>8192)throw Error('WORKSPACE_INVALID_RECORD');return JSON.parse(await readFile(p,'utf8')) as unknown;}
async function atomic(p:string,value:unknown){const s=await info(p);if(s&&(!s.isFile()||s.isSymbolicLink()))throw Error('WORKSPACE_UNSAFE_PATH');const temporary=p+'.'+randomUUID()+'.tmp';try{await writeFile(temporary,JSON.stringify(value)+'\n',{flag:'wx',mode:0o600});await rename(temporary,p);}finally{await unlink(temporary).catch(()=>{});}}
async function lock(locks:string,job:string){try{return await acquireLock(locks,job);}catch(e){if((e instanceof Error&&e.message==='WORKSPACE_UNSAFE_PATH')||['ENOENT','EEXIST','EBUSY','EPERM','ENOTEMPTY'].includes((e as NodeJS.ErrnoException).code??''))throw Error('WORKSPACE_BUSY');throw e;}}
async function acquireLock(locks:string,job:string){id.parse(job);const p=path.join(locks,job),token=randomUUID(),name='owner-'+process.pid+'-'+token+'.json';
 async function empty(){try{await rmdir(p);}catch(e){if(!['ENOENT','ENOTEMPTY','EEXIST','EBUSY','EPERM'].includes((e as NodeJS.ErrnoException).code??''))throw e;}}
 try{await mkdir(p);}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;
  if(!(await directory(locks,job)))throw Error('WORKSPACE_BUSY');
  for(const file of await readdir(p)){const match=/^owner-([1-9][0-9]*)-([a-f0-9-]{36})[.]json$/.exec(file);if(!match)throw Error('WORKSPACE_BUSY');let owner:{pid?:unknown;token?:unknown};try{owner=await json(path.join(p,file)) as typeof owner;}catch{throw Error('WORKSPACE_BUSY');}const pid=Number(match[1]);if(!owner||typeof owner!=='object'||owner.pid!==pid||owner.token!==match[2]||!id.safeParse(match[2]).success||!Number.isSafeInteger(pid))throw Error('WORKSPACE_BUSY');
   let dead=false;try{process.kill(pid,0);}catch(cause){dead=(cause as NodeJS.ErrnoException).code==='ESRCH';}if(!dead)throw Error('WORKSPACE_BUSY');
   // Exact nonce-specific file: never remove a replacement owner's record.
   await unlink(path.join(p,file)).catch(cause=>{if((cause as NodeJS.ErrnoException).code!=='ENOENT')throw cause;});
  }
  await empty();try{await mkdir(p);}catch{throw Error('WORKSPACE_BUSY');}
 }
 try{await writeFile(path.join(p,name),JSON.stringify({pid:process.pid,token,createdAt:new Date().toISOString()}),{flag:'wx',mode:0o600});
  if(!(await directory(locks,job)))throw Error('WORKSPACE_BUSY');const entries=await readdir(p);if(entries.length!==1||entries[0]!==name)throw Error('WORKSPACE_BUSY');
 }catch(e){await unlink(path.join(p,name)).catch(()=>{});await empty();if(['ENOENT','EEXIST'].includes((e as NodeJS.ErrnoException).code??''))throw Error('WORKSPACE_BUSY');throw e;}
 return async()=>{if(!(await directory(locks,job)))throw Error('WORKSPACE_LOCK_LOST');const owner=await json(path.join(p,name)) as {token?:unknown};if(owner.token!==token)throw Error('WORKSPACE_LOCK_LOST');await unlink(path.join(p,name));await empty();};
}

/** Writers and janitors cooperate through an exclusive per-job lock outside the deletable tree. */
export async function withJobWorkspace<T>(repo:string,assignment:{jobId:string;projectId:string;revisionId:string},work:(run:string)=>Promise<T>){
 const record=WorkspaceRecord.parse({jobId:assignment.jobId,projectId:assignment.projectId,revisionId:assignment.revisionId,version:1,createdAt:new Date().toISOString()}),r=await roots(repo,true);if(!r)throw Error('WORKSPACE_UNAVAILABLE');const release=await lock(r.locks,record.jobId);
 try{const marker=path.join(r.records,record.jobId+'.json');if(await info(marker)){const old=WorkspaceRecord.parse(await json(marker));if(old.jobId!==record.jobId||old.projectId!==record.projectId||old.revisionId!==record.revisionId)throw Error('WORKSPACE_IDENTITY_CONFLICT');}else await atomic(marker,record);
  const run=await directory(r.runs,'web-'+record.jobId,true);if(!run)throw Error('WORKSPACE_UNAVAILABLE');return await work(run);
 }finally{await release();}
}

/** No links, special files or mount crossings; bound tree work before any recursive removal. */
async function tree(p:string,maximum=10000){const root=await lstat(p);if(!root.isDirectory()||root.isSymbolicLink()||path.relative(p,await realpath(p))!=='')throw Error('WORKSPACE_UNSAFE_PATH');let count=0,latest=Math.max(root.mtimeMs,root.ctimeMs),bytes=0;
 async function visit(dir:string,depth:number){if(depth>16)throw Error('WORKSPACE_TREE_LIMIT');const stream=await opendir(dir);for await(const entry of stream){if(++count>maximum)throw Error('WORKSPACE_TREE_LIMIT');const file=path.join(dir,entry.name),s=await lstat(file);if(s.isSymbolicLink()||s.dev!==root.dev||(!s.isDirectory()&&!s.isFile()))throw Error('WORKSPACE_UNSAFE_PATH');latest=Math.max(latest,s.mtimeMs,s.ctimeMs);if(s.isDirectory())await visit(file,depth+1);else bytes+=s.size;}}
 await visit(p,0);return{latest,bytes};
}
export function eligible(state:JobState|null,record:RecordInfo,now:number){if(!state)return false;if(state.jobId!==record.jobId||state.projectId!==record.projectId||state.revisionId!==record.revisionId||state.kind!=='generation')throw Error('WORKSPACE_IDENTITY_CONFLICT');
 const server=Date.parse(state.serverTime),finished=Date.parse(state.finishedAt??'');if(!Number.isFinite(server)||Math.abs(server-now)>300000||!Number.isFinite(finished)||finished>server)return false;
 if(state.leaseExpiresAt&&(!Number.isFinite(Date.parse(state.leaseExpiresAt))||Date.parse(state.leaseExpiresAt)>server))return false;
 // Extra five-minute server margin avoids a boundary race with the 48-hour retry window.
 if(['failed','cancelled','needs_input'].includes(state.status))return server-finished>48*hour+300000;
 if(state.status==='succeeded'){const expires=Date.parse(state.revisionExpiresAt??'');return Number.isFinite(expires)&&server>Math.max(expires,finished+7*24*hour)+300000;}
 return false;
}
export async function cleanupWorkspaces(repo:string,read:StateReader,options:{apply?:boolean;batch?:number;now?:()=>number}={}){
 const batch=options.batch??25;if(!Number.isInteger(batch)||batch<1||batch>100)throw Error('WORKSPACE_INVALID_BATCH');const result={preview:!options.apply,scanned:0,eligible:0,removed:0,bytesRemoved:0,busy:0,retained:0,unknown:0,unsafe:0,failed:0,legacy:0};const r=await roots(repo);if(!r){const runs=await directory(await realpath(repo),'local-runs');if(runs)result.legacy=(await readdir(runs)).filter(n=>/^web-[a-f0-9-]{36}$/.test(n)).length;return result;}
 // Names only: never inspect or remove non-web demos, models, credentials or generic caches.
 const names=(await readdir(r.records)).filter(n=>id.safeParse(n.slice(0,-5)).success&&n.endsWith('.json')).sort();
 if(names.length>10000)throw Error('WORKSPACE_INVENTORY_LIMIT');let cursor='';try{const value=await json(path.join(r.meta,'cursor.json')) as {last?:unknown};if(typeof value.last==='string')cursor=value.last;}catch(e){if(await info(path.join(r.meta,'cursor.json')))throw e;}
 const selected=[...names.filter(n=>n>cursor),...names.filter(n=>n<=cursor)].slice(0,batch);
 const registered=new Set(names.map(n=>'web-'+n.slice(0,-5)));for(const n of await readdir(r.runs))if(/^web-[a-f0-9-]{36}$/.test(n)&&!registered.has(n))result.legacy++;
 for(const name of selected){result.scanned++;let release:(()=>Promise<void>)|undefined;
  try{const job=name.slice(0,-5);if(options.apply)release=await lock(r.locks,job);else if(await info(path.join(r.locks,job))){result.busy++;continue;}
   const record=WorkspaceRecord.parse(await json(path.join(r.records,name)));if(record.jobId!==job)throw Error('WORKSPACE_IDENTITY_CONFLICT');const run=path.join(r.runs,'web-'+job),now=(options.now??Date.now)();
   if(await info(run))await directory(r.runs,'web-'+job);
   if(await info(path.join(run,'.keep-workspace'))){result.retained++;continue;}
   const state=await read(record);if(!state){result.unknown++;continue;}if(!eligible(state,record,now)){result.retained++;continue;}
   const exists=await info(run);const scanned=exists?await tree(run):null;
   if(scanned&&now-scanned.latest<48*hour){result.retained++;continue;}
   result.eligible++;if(!options.apply)continue;
   // Check exact resolved targets, server authority and the tree again while still holding the job lock.
   if(!eligible(await read(record),record,(options.now??Date.now)())){result.retained++;continue;}
   if(exists){const checked=await directory(r.runs,'web-'+job);if(!checked||path.dirname(checked)!==r.runs)throw Error('WORKSPACE_UNSAFE_PATH');const again=await tree(checked);if((options.now??Date.now)()-again.latest<48*hour){result.retained++;continue;}await rm(checked,{recursive:true,force:false,maxRetries:2,retryDelay:100});result.bytesRemoved+=again.bytes;}
   if(exists)result.removed++; // Retain the ID-only record to catch late stale-writer remnants.
  }catch(e){const code=e instanceof Error?e.message:'';if(code==='WORKSPACE_BUSY')result.busy++;else if(/WORKSPACE_UNSAFE|WORKSPACE_INVALID|WORKSPACE_IDENTITY|WORKSPACE_TREE/.test(code)||e instanceof z.ZodError)result.unsafe++;else result.failed++;}
  finally{if(release)try{await release();}catch{result.failed++;}}
 }
 if(options.apply&&selected.length)await atomic(path.join(r.meta,'cursor.json'),{last:selected.at(-1)});
 return result;
}

/** Web rendering keeps copied private publicDir assets inside the registered job, not OS temp. */
export async function withPrivateBundle<T>(repo:string,run:string,work:(outDir:string)=>Promise<T>){
 const r=await roots(repo);const job=path.basename(run).slice(4);id.parse(job);if(!r||path.relative(path.join(r.runs,'web-'+job),path.resolve(run))!=='')throw Error('WORKSPACE_UNSAFE_PATH');
 const record=WorkspaceRecord.parse(await json(path.join(r.records,job+'.json')));if(record.jobId!==job||!(await info(path.join(r.locks,job))))throw Error('WORKSPACE_LOCK_REQUIRED');
 if(!(await directory(r.runs,'web-'+job)))throw Error('WORKSPACE_UNSAFE_PATH');const out=path.join(run,'.render-bundle');
 try{if(await info(out))await tree(out);return await work(out);}finally{if(await info(out)){await tree(out);if(path.dirname(out)!==run||path.basename(out)!=='.render-bundle')throw Error('WORKSPACE_UNSAFE_PATH');await rm(out,{recursive:true,force:false,maxRetries:2,retryDelay:100});}}
}
