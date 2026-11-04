import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

// Local-only helper: no service-role or AI key enters the web environment.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const config=readFileSync(resolve(root,'supabase/config.toml'),'utf8');
if(!config.includes('project_id = "ai-video-studio-local"')) throw new Error('Unexpected local project.');
const result=spawnSync(process.execPath,[resolve(root,'node_modules/supabase/dist/supabase.js'),'status','-o','json'],{cwd:root,encoding:'utf8',windowsHide:true});
if(result.status!==0) throw new Error('Start local Supabase with npm run db:start, then retry.');
const status=JSON.parse(result.stdout);
if(status.API_URL!=='http://127.0.0.1:55421' || !status.ANON_KEY) throw new Error('Unexpected local API configuration.');
const path=resolve(root,'apps/web/.env.local');
let text=existsSync(path)?readFileSync(path,'utf8'):'';
if(/^SUPABASE_URL=(?!http:\/\/127\.0\.0\.1:55421\s*$)/m.test(text)) throw new Error('Existing remote web configuration left unchanged. Configure manually.');
const values={SUPABASE_URL:status.API_URL,SUPABASE_ANON_KEY:status.ANON_KEY,APP_ORIGIN:'http://127.0.0.1:3000'};
for(const [key,value] of Object.entries(values)) {
  const pattern=new RegExp(`^${key}=.*$`,'m');
  text=pattern.test(text)?text.replace(pattern,`${key}=${value}`):`${text.trimEnd()}\n${key}=${value}\n`;
}
writeFileSync(path,text.trimStart());
console.log('Configured ignored apps/web/.env.local for local email authentication at http://127.0.0.1:3000. No credentials printed.');
