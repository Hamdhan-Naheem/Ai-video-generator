import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),file=root+'.cache/worker/connection.json';
const config=readFileSync(root+'supabase/config.toml','utf8');if(!config.includes('project_id = "ai-video-studio-local"')||!config.includes('port = 55422'))throw Error('Only the configured local stack is supported.');
function sql(input){return execFileSync('docker',['exec','-i','supabase_db_ai-video-studio-local','psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-Atq'],{input,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']}).trim();}
if(process.argv.slice(2).some(v=>v!=='--revoke'))throw Error('Unsupported worker setup option.');
if(existsSync(file)){
 const old=JSON.parse(readFileSync(file,'utf8'));if(!/^[a-f0-9-]{36}$/.test(old.workerId)||!/^wkr_[a-zA-Z0-9_-]{43}$/.test(old.token))throw Error('Inspect the ignored worker configuration locally.');const hash=createHash('sha256').update(old.token).digest('hex');
 if(process.argv.includes('--revoke')){sql(`begin;update public.workers set enabled=false,updated_at=now() where id='${old.workerId}';update public.worker_credentials set revoked_at=coalesce(revoked_at,now()) where worker_id='${old.workerId}' and token_hash='${hash}';commit;`);console.log('Local worker revoked. The private connection file is preserved for inspection.');}
 else{const active=sql(`select exists(select 1 from public.workers w join public.worker_credentials c on c.worker_id=w.id where w.id='${old.workerId}' and w.enabled and c.token_hash='${hash}' and c.revoked_at is null and c.expires_at>now());`);if(active!=='t')throw Error('The existing credential is expired/revoked. No automatic credential replacement was performed.');console.log('Existing local worker credential is active; nothing was rotated.');}
}else{
 if(process.argv.includes('--revoke'))throw Error('No provisioned local worker exists.');
 const workerId=randomUUID(),credentialId=randomUUID(),token='wkr_'+randomBytes(32).toString('base64url'),hash=createHash('sha256').update(token).digest('hex');
 const expiresAt=sql(`begin;insert into public.workers(id,label,enabled,protocol_version,capabilities) values('${workerId}','Local processing computer',true,1,'{"modes":["education"],"orientations":["landscape","portrait"],"compositionVersion":"v1","schemaVersions":[1],"executionReady":false}');insert into public.worker_credentials(id,worker_id,token_hash,expires_at) values('${credentialId}','${workerId}','${hash}',now()+interval '30 days');insert into public.operator_audit(action,resource_type,resource_id,safe_metadata) values('worker.provision.local','worker','${workerId}','{"protocol":1,"executionReady":false}');select to_char(expires_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') from public.worker_credentials where id='${credentialId}';commit;`);
 mkdirSync(root+'.cache/worker',{recursive:true});writeFileSync(file,JSON.stringify({origin:'http://127.0.0.1:3000',workerId,credentialId,token,expiresAt},null,2)+'\n',{mode:0o600,flag:'wx'});
 console.log('Local worker provisioned with a 30-day opaque credential in ignored .cache/worker/connection.json. No token printed. Generation/claim pauses and quotas are unchanged.');
}
