import {execFileSync,spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {createClient} from "@supabase/supabase-js";
const root=fileURLToPath(new URL("../",import.meta.url));
const status=spawnSync(process.execPath,[root+"node_modules/supabase/dist/supabase.js","status","-o","json"],{cwd:root,encoding:"utf8",windowsHide:true});if(status.status!==0)throw Error("Local Supabase is required.");const config=JSON.parse(status.stdout);if(config.API_URL!=="http://127.0.0.1:55421")throw Error("Local stack only.");
const client=createClient(config.API_URL,config.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const output=execFileSync("docker",["exec","-i","supabase_db_ai-video-studio-local","psql","-X","-U","postgres","-d","postgres","-Atq","-v","ON_ERROR_STOP=1"],{input:"select u.id||'|'||u.owner_id||'|'||u.state from public.upload_allocations u join public.assets a on a.id=u.asset_id where (u.state='allocated' and u.expires_at<=now()) or (u.state='abandoned' and (a.state='deleting' or u.expires_at+interval '24 hours'>now())) order by u.created_at limit 100;",encoding:"utf8",windowsHide:true,stdio:["pipe","pipe","pipe"]});
let cleaned=0,pending=0;
for(const line of output.trim().split("\n").filter(Boolean)){const [upload,owner,state]=line.split("|");if(!/^[a-f0-9-]{36}$/.test(upload)||!/^[a-f0-9-]{36}$/.test(owner))throw Error("Invalid cleanup identity");
 if(state==='allocated'){const expired=await client.rpc("expire_source_upload",{upload});if(expired.error){pending++;continue;}}
 const allocation=await client.rpc("cleanup_source_upload",{upload,owner,finish:false});if(allocation.error||!allocation.data){pending++;continue;}const data=allocation.data;
 const removed=await client.storage.from(data.bucket).remove([data.objectKey]);if(removed.error){pending++;continue;}const finalized=await client.rpc("cleanup_source_upload",{upload,owner,finish:true});if(finalized.error||finalized.data?.deferRelease)pending++;else cleaned++;
}
console.log(JSON.stringify({cleaned,pending,message:"Only local source uploads processed. Run periodically for abandoned transfers and cleanup retries."}));
