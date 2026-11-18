import {readFileSync} from 'node:fs';
import {parseArgs,parseEnv} from 'node:util';
import {fileURLToPath} from 'node:url';
import {setTimeout as wait} from 'node:timers/promises';
import {cleanupWorkspaces} from '../src/maintenance/workspaces.ts';
import {workspaceStateReader} from '../src/maintenance/workspace-port.ts';
const stop=new AbortController();for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>stop.abort());
async function main(){const o=parseArgs({strict:true,options:{apply:{type:'boolean'},watch:{type:'boolean'},batch:{type:'string'},'allow-hosted':{type:'boolean'},help:{type:'boolean'}}}).values;
 if(o.help){console.log('workspace:cleanup [--apply] [--watch] [--batch 25] [--allow-hosted]. Preview is read-only. Only registered local web-job workspaces are eligible.');return;}
 const repo=fileURLToPath(new URL('../',import.meta.url));let config:Record<string,string|undefined>={};for(const file of ['.env','apps/web/.env.local'])try{config={...config,...parseEnv(readFileSync(repo+file,'utf8'))};}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 const url=process.env.SUPABASE_URL??config.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY??config.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw Error('WORKSPACE_CONFIGURATION_UNAVAILABLE');const u=new URL(url);if(u.origin!==url||u.username||u.password||(url!=='http://127.0.0.1:55421'&&(!o['allow-hosted']||u.protocol!=='https:')))throw Error('WORKSPACE_CONFIGURATION_UNAVAILABLE');
 const batch=Number(o.batch??25);if(!Number.isInteger(batch)||batch<1||batch>100||o.watch&&!o.apply)throw Error('WORKSPACE_INVALID_OPTIONS');const read=workspaceStateReader(url,key);
 do{if(stop.signal.aborted)break;try{const result=await cleanupWorkspaces(repo,read,{apply:o.apply,batch});console.log(JSON.stringify(result));if(result.failed||result.unsafe)process.exitCode=1;}catch{console.error('WORKSPACE_CLEANUP_UNAVAILABLE: files were preserved where safety or server state could not be confirmed.');process.exitCode=1;}if(!o.watch)break;try{await wait(60000,undefined,{signal:stop.signal});}catch{break;}}while(!stop.signal.aborted);
}
main().catch(()=>{console.error('WORKSPACE_CONFIGURATION_OR_SERVICE_UNAVAILABLE: inspect private configuration locally.');process.exitCode=1;});
