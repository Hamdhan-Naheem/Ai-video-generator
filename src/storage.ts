import {createHash, randomUUID} from 'node:crypto';
import {mkdir, readFile, writeFile, rename, appendFile, stat} from 'node:fs/promises';
import path from 'node:path';
export const root = process.cwd();
export const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
export const fileHash = async (p:string) => createHash('sha256').update(await readFile(p)).digest('hex');
export const readJson = async <T>(p: string): Promise<T> => JSON.parse(await readFile(p,'utf8'));
export const exists = async (p:string) => {try{await stat(p);return true;}catch{return false;}};
export async function writeJson(p: string, data: unknown) {
  await mkdir(path.dirname(p),{recursive:true});
  const tmp = `${p}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(data,null,2)+'\n');
  await rename(tmp,p);
}
export function safeRun(id: string) {
  if(!/^[a-zA-Z0-9_-]{1,90}$/.test(id)) throw new Error('Run ID must contain only letters, numbers, hyphens or underscores');
  return path.join(root,'local-runs',id);
}
export async function event(run:string, stage:string, status:string) {
  await mkdir(run,{recursive:true});
  await appendFile(path.join(run,'events.ndjson'),JSON.stringify({at:new Date().toISOString(),stage,status})+'\n');
  console.log(`${stage}: ${status}`);
}
export async function checkpoint<T>(run:string,name:string,key:unknown,validate:(v:unknown)=>T,produce:()=>Promise<T>):Promise<T>{
  const p=path.join(run,`${name}.json`); const fingerprint=hash(key);
  if(await exists(p)){
    try {const saved=await readJson<{key:string;value:unknown}>(p);if(saved.key===fingerprint){const value=validate(saved.value);await event(run,name,'reused');return value;}}catch{}
  }
  await event(run,name,'running'); const value=validate(await produce());
  await writeJson(p,{key:fingerprint,value}); await event(run,name,'complete');return value;
}
