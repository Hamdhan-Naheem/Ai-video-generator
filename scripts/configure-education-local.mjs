import {parseArgs} from 'node:util';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const options=parseArgs({strict:true,options:{email:{type:'string'},bytes:{type:'string'},enable:{type:'boolean'},help:{type:'boolean'}}}).values;
if(options.help||!options.email){console.log('Usage: npm run education:configure -- --email <local-sign-in-email> --bytes 200000000 [--enable]\nDefault is a read-only proposal. --enable explicitly allocates the account allowance and enables Education only, within the existing global budget.');process.exit(0);}
const root=fileURLToPath(new URL('../',import.meta.url)),config=readFileSync(root+'supabase/config.toml','utf8');if(!config.includes('project_id = "ai-video-studio-local"')||!config.includes('port = 55422'))throw Error('Only the configured local stack is supported.');
const amount=options.bytes;if(!amount||!/^[1-9][0-9]{0,9}$/.test(amount)||BigInt(amount)<167772160n)throw Error('Specify a reviewed account allowance of at least 167772160 bytes. No limit is inferred.');
if(options.email.length>254||!options.email.includes('@'))throw Error('Specify the existing local sign-in email.');
const literal=value=>"'"+value.replaceAll("'","''")+"'";
function sql(input){try{return execFileSync('docker',['exec','-i','supabase_db_ai-video-studio-local','psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-Atq'],{input,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']}).trim();}catch{throw Error('Local configuration failed and was rolled back. Check account status, idle queue, worker credential and existing capacity.');}}
const rows=JSON.parse(sql(`select coalesce(json_agg(json_build_object('id',p.id,'status',p.status,'allowance',ua.byte_limit::text,'used',(coalesce(ua.used_bytes,0)+coalesce(ua.reserved_bytes,0))::text)),'[]') from auth.users u join public.profiles p on p.id=u.id left join public.usage_accounts ua on ua.owner_id=u.id where lower(u.email)=lower(${literal(options.email)});`));
if(rows.length!==1||rows[0].status!=='active')throw Error('Exactly one active local account must match.');
const globalAllowance=JSON.parse(sql("select json_build_object('limit',byte_limit::text,'free',(byte_limit-used_bytes-reserved_bytes)::text) from public.usage_accounts where scope='global';"));
if(BigInt(amount)>BigInt(globalAllowance.limit)||BigInt(rows[0].used)>BigInt(amount))throw Error('The proposed allowance must fit the existing global budget and existing account charges.');
console.log(`Proposal: account allowance ${amount} bytes; previous allowance ${rows[0].allowance??'not configured'}; global allowance stays ${globalAllowance.limit} bytes. Education only; no provider limit or billing change.`);
if(!options.enable){console.log('Read-only proposal. Add --enable only after reviewing this allocation.');process.exit(0);}
const evidence=JSON.parse(readFileSync(root+'.cache/w16-live.json','utf8'));if(evidence.live!==true||evidence.run?.status!=='succeeded'||!/^local-runs\/web-[a-f0-9-]{36}$/.test(evidence.localRun))throw Error('Verified local W16 output evidence is required before activation.');
const directory=path.resolve(root,evidence.localRun),report=JSON.parse(readFileSync(path.join(directory,'verification.json'),'utf8')),timeline=JSON.parse(readFileSync(path.join(directory,'timeline.json'),'utf8'));
if(timeline.visualStyle!=='education-light'||report.fullDecode!==true||report.audio!==true||report.fps!==30||report.sceneCount<4||report.captionCount<1||report.mouthCueCount<1||report.durationMs<60000||report.durationMs>90000)throw Error('Current Education verification evidence is incomplete.');
const connection=JSON.parse(readFileSync(root+'.cache/worker/connection.json','utf8'));if(!/^[a-f0-9-]{36}$/.test(connection.workerId)||!/^wkr_[a-zA-Z0-9_-]{43}$/.test(connection.token))throw Error('Local worker configuration is invalid.');
const actor=rows[0].id,worker=connection.workerId,hash=createHash('sha256').update(connection.token).digest('hex');if(!/^[a-f0-9-]{36}$/.test(actor))throw Error('Invalid local account.');
sql(`begin;set local lock_timeout='5s';select id from public.workers where id='${worker}' for update;select id from public.worker_credentials where worker_id='${worker}' and token_hash='${hash}' for share;select id from public.usage_accounts where scope='global' for update;select id from public.usage_accounts where owner_id='${actor}' for update;select id from public.app_settings where id='global' for update;select id from public.profiles where id='${actor}' for update;
do $$begin
 if not exists(select 1 from public.profiles where id='${actor}' and status='active') or not exists(select 1 from public.workers w join public.worker_credentials c on c.worker_id=w.id where w.id='${worker}' and w.enabled and w.protocol_version=1 and c.token_hash='${hash}' and c.revoked_at is null and c.expires_at>clock_timestamp()) then raise exception 'Local account or worker unavailable';end if;
 if exists(select 1 from public.workers where enabled and id<>'${worker}') or exists(select 1 from public.jobs where status in ('queued','waiting_worker','running','waiting_quota','cancel_requested')) or exists(select 1 from public.worker_slots where job_id is not null) then raise exception 'Requires one known worker and an idle queue';end if;
 if not exists(select 1 from public.usage_accounts where scope='global' and byte_limit>=${amount}) or coalesce((select used_bytes+reserved_bytes from public.usage_accounts where owner_id='${actor}'),0)>${amount} then raise exception 'Allowance unavailable';end if;
end$$;
insert into public.usage_accounts(scope,owner_id,byte_limit,output_limit) values('user','${actor}',${amount},3) on conflict(owner_id) do update set byte_limit=excluded.byte_limit,output_limit=least(coalesce(public.usage_accounts.output_limit,3),3),updated_at=now();
update public.workers set capabilities=capabilities||'{"executionReady":true}',updated_at=now() where id='${worker}';
update public.app_settings set generation_paused=false,claims_paused=false,limits=limits||'{"educationExecutionVerified":true,"enabledGenerationModes":["education"]}',version=version+1,updated_at=now() where id='global';
insert into public.operator_audit(action,resource_type,resource_id,safe_metadata) values('education.enable.local','profile','${actor}',jsonb_build_object('accountByteLimit','${amount}','globalByteLimitUnchanged',true,'enabledModes',jsonb_build_array('education')));commit;`);
console.log('Local Education generation enabled for the reviewed account allocation. Start npm run worker:run and refresh the Education form. Global/provider limits and credentials are unchanged.');
