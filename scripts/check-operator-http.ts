import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {execFileSync,execFile} from 'node:child_process';
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {parseEnv,promisify} from 'node:util';
import {createClient} from '@supabase/supabase-js';
import {OperatorClient,OperatorClientError} from '../src/operator/client.ts';
import {OperatorHealthSchema,ErrorEnvelopeSchema} from '../shared/contracts/index.ts';
const root=process.cwd(),config=parseEnv(readFileSync(root+'/apps/web/.env.local','utf8'));
const origin='http://127.0.0.1:3000';
if(config.SUPABASE_URL!=='http://127.0.0.1:55421'||config.APP_ORIGIN!==origin)throw Error('LOCAL_OPERATOR_ACCEPTANCE_ONLY');
const serviceKey=config.SUPABASE_SERVICE_ROLE_KEY;if(!serviceKey)throw Error('LOCAL_OPERATOR_FIXTURE_AUTHORITY_REQUIRED');
const admin=createClient(config.SUPABASE_URL,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const owners:string[]=[],password='W30!'+randomBytes(18).toString('base64url'),privateFile=root+'/.cache/w30-http-'+randomUUID()+'.env';
function sql(input:string){try{return execFileSync('docker',['exec','-i','supabase_db_ai-video-studio-local','psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-Atq'],{input,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']}).trim();}catch{throw Error('OPERATOR_FIXTURE_SQL_UNAVAILABLE');}}
let cookie='';const operator=new OperatorClient(origin,async(input,init)=>{if(String(input).endsWith('/operator/health'))cookie=new Headers(init?.headers).get('cookie')??'';return fetch(input,init);}),tester=new OperatorClient(origin);
const snapshot=()=>sql("select jsonb_build_object('version',version,'generation',generation_paused,'claims',claims_paused,'limits',limits,'updated_at',updated_at,'updated_by',updated_by) from public.app_settings where id='global';");
async function main(){const before=snapshot();try{
 for(const kind of ['operator','tester']){const email='w30-http-'+kind+'-'+randomUUID()+'@example.invalid',r=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:'Disposable operator acceptance'}});if(r.error||!r.data.user)throw Error('OPERATOR_FIXTURE_AUTH_UNAVAILABLE');const id=r.data.user.id;if(!/^[a-f0-9-]{36}$/.test(id))throw Error('INVALID_FIXTURE_ID');owners.push(id);
  if(kind==='operator'){sql("update public.profiles set role='operator' where id='"+id+"';");await operator.signIn(email,password);writeFileSync(privateFile,'APP_ORIGIN='+origin+'\nOPERATOR_EMAIL='+email+'\nOPERATOR_PASSWORD='+password+'\n',{mode:0o600,flag:'wx'});}
  else await assert.rejects(tester.signIn(email,password),e=>e instanceof OperatorClientError&&e.code==='OPERATOR_ACCESS_DENIED');
 }
 const anonymous=await fetch(origin+'/api/v1/operator/health');assert.equal(anonymous.status,401);ErrorEnvelopeSchema.parse(await anonymous.json());
 await assert.rejects(tester.read('health'),e=>e instanceof OperatorClientError&&e.code==='OPERATOR_ACCESS_DENIED');console.log('PASS: anonymous and ordinary authenticated HTTP access denied.');
 const health=OperatorHealthSchema.parse(await operator.read('health'));await operator.read('jobs');await operator.read('workers');console.log('PASS: active operator receives strict safe health, job and worker projections.');
 const command={requestId:randomUUID(),reason:'release_check',expectedVersion:health.controls.version,claimsPaused:health.controls.claimsPaused};
 const cross=await fetch(origin+'/api/v1/operator/health',{headers:{Cookie:cookie,Origin:'https://foreign.example'}});assert.equal(cross.status,403);
 const noCsrf=await fetch(origin+'/api/v1/operator/controls',{method:'PATCH',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(command)});assert.equal(noCsrf.status,403);assert.equal(ErrorEnvelopeSchema.parse(await noCsrf.json()).error.code,'CSRF_REJECTED');console.log('PASS: cross-origin and missing-CSRF requests are rejected.');
 assert.deepEqual(await operator.controls(command),health.controls);assert.deepEqual(await operator.controls(command),health.controls);
 await assert.rejects(operator.controls({...command,requestId:randomUUID(),expectedVersion:health.controls.version+1}),e=>e instanceof OperatorClientError&&e.code==='OPERATOR_STATE_CONFLICT');
 await operator.read('audit');console.log('PASS: real HTTP no-op, idempotent replay, audit and stale-version handling.');
 const sessionsBeforeCli=sql("select count(*) from auth.sessions where user_id='"+owners[0]+"';");
 const {stdout:cli}=await promisify(execFile)(process.execPath,['--import','tsx','scripts/operator-console.ts','--config',privateFile,'--command','health'],{cwd:root,encoding:'utf8',windowsHide:true,timeout:120000});OperatorHealthSchema.parse(JSON.parse(cli));console.log('PASS: CLI exited successfully with a valid health response.');
 assert.equal(sql("select count(*) from auth.sessions where user_id='"+owners[0]+"';"),sessionsBeforeCli,'CLI revokes its local server session without ending the existing operator session');
 console.log('PASS: CLI server session count returned to its previous value.');await operator.read('health');console.log('PASS: actual CLI uses a private config and revokes only its own server session.');
 sql("update public.profiles set role='tester' where id='"+owners[0]+"';");await assert.rejects(operator.read('health'),e=>e instanceof OperatorClientError&&e.code==='OPERATOR_ACCESS_DENIED');console.log('PASS: existing cookies lose operator access immediately after role revocation.');
 assert.equal(snapshot(),before);console.log('PASS: real controls, quotas, version and modification metadata are unchanged.');
 }finally{
  await Promise.allSettled([operator.signOut(),tester.signOut()]);try{unlinkSync(privateFile);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  for(const owner of owners)sql("begin;delete from public.operator_audit where actor_id='"+owner+"';delete from public.profiles where id='"+owner+"';delete from auth.users where id='"+owner+"';commit;");
 }}
main().catch(cause=>{console.error(JSON.stringify({operatorCode:cause instanceof OperatorClientError?cause.code:null,stageFailure:cause instanceof assert.AssertionError?'assertion':typeof cause?.status==='number'?'cli_exit':'acceptance',exitStatus:typeof cause?.status==='number'?cause.status:null,signOutUnconfirmed:typeof cause?.stderr==='string'&&cause.stderr.includes('OPERATOR_SIGNOUT_UNCONFIRMED')}));console.error('OPERATOR_HTTP_ACCEPTANCE_FAILED: inspect local fixture setup; no private request/response printed.');process.exitCode=1;});
