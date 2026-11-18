import {readFileSync} from 'node:fs';
import {parseArgs,parseEnv} from 'node:util';
import {setTimeout as wait} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {z} from 'zod';
import {retentionPort} from '../src/maintenance/retention-port.ts';
import {AckSchema,runRetentionCycle,watchRetention} from '../src/maintenance/retention.ts';
const stopping=new AbortController();for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>stopping.abort());
async function main(){
 const o=parseArgs({strict:true,options:{apply:{type:'boolean'},watch:{type:'boolean'},owner:{type:'string'},batch:{type:'string'},interval:{type:'string'},'allow-hosted':{type:'boolean'},'retry-task':{type:'string'},help:{type:'boolean'}}}).values;
 if(o.help){console.log('media:cleanup [--apply] [--watch --interval 60] [--batch 25] [--owner UUID] [--retry-task UUID --apply] [--allow-hosted]. Default is a bounded read-only preview.');return;}
 const root=fileURLToPath(new URL('../',import.meta.url));let config:Record<string,string|undefined>={};for(const name of ['.env','apps/web/.env.local']){try{config={...config,...parseEnv(readFileSync(root+name,'utf8'))};}catch(cause){if((cause as NodeJS.ErrnoException).code!=='ENOENT')throw Error('Invalid local configuration');}}
 const url=process.env.SUPABASE_URL??config.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY??config.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw Error('Missing private retention configuration');const u=new URL(url);
 const local=u.origin==='http://127.0.0.1:55421';if(u.origin!==url||u.username||u.password||(!local&&(u.protocol!=='https:'||!o['allow-hosted'])))throw Error('Explicit supported Storage target required');
 if(o.owner)z.uuid().parse(o.owner);const batch=Number(o.batch??25),interval=Number(o.interval??60);if(!Number.isInteger(batch)||batch<1||batch>100||!Number.isInteger(interval)||interval<60||interval>3600||(o.watch&&!o.apply))throw Error('Invalid bounded cleanup options');
 const port=retentionPort(url,key,o.owner,stopping.signal);
 if(o['retry-task']){if(!o.apply||o.watch)throw Error('Explicit one-shot retry required');z.uuid().parse(o['retry-task']);AckSchema.parse(await port.retry(o['retry-task']));console.log('Retention task rechecked.');}
 const cycle=async()=>{try{console.log(JSON.stringify(await runRetentionCycle(port,{apply:o.apply,batch,owner:o.owner,signal:stopping.signal})));}catch{if(!stopping.signal.aborted){console.error('RETENTION_UNAVAILABLE: no unconfirmed storage capacity was released.');if(!o.watch)process.exitCode=1;}}};
 if(o.watch)await watchRetention(cycle,async()=>{await wait(interval*1000,undefined,{signal:stopping.signal});},stopping.signal);else await cycle();
}
main().catch(()=>{if(!stopping.signal.aborted){console.error('RETENTION_CONFIGURATION_OR_SERVICE_UNAVAILABLE: check private configuration and supported options locally.');process.exitCode=1;}});
