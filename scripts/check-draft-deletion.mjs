import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
function query(input,onHold){return new Promise((resolve,reject)=>{
 const child=spawn('docker',['exec','-i','supabase_db_ai-video-studio-local','psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-Atq'],{windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='',held=false;
 child.stdout.on('data',chunk=>{out+=chunk;if(!held&&out.includes('__HOLD__')){held=true;onHold?.();}});child.stderr.on('data',chunk=>err+=chunk);child.on('error',reject);child.on('close',code=>{if(onHold&&!held)reject(Error('Fixture never obtained its lock: '+err));else resolve({code,out,err});});child.stdin.end('\\set VERBOSITY sqlstate\n'+input);
});}
async function must(input){const r=await query(input);if(r.code!==0)throw Error('Draft deletion fixture SQL failed: '+r.err);return r.out.trim();}
const request=JSON.stringify({draftVersion:1,preferences:{targetSeconds:60,orientation:'landscape',voiceProfileId:'Kore'},acknowledgments:{sourceRights:true,externalAiProcessing:true,policyVersion:'v1'}});
let actor;
async function clean(){if(!actor)return;await must(`begin;select id from public.usage_accounts where scope='global' for update;update public.usage_accounts set reserved_bytes=reserved_bytes-coalesce((select reserved_bytes from public.usage_accounts where owner_id='${actor}'),0),reserved_outputs=reserved_outputs-coalesce((select reserved_outputs from public.usage_accounts where owner_id='${actor}'),0) where scope='global';delete from public.job_events where job_id in(select id from public.jobs where owner_id='${actor}');delete from public.usage_ledger where owner_id='${actor}';delete from public.idempotency_requests where owner_id='${actor}';delete from public.usage_reservations where owner_id='${actor}';delete from public.jobs where owner_id='${actor}';delete from public.revisions where owner_id='${actor}';delete from public.projects where owner_id='${actor}';delete from public.usage_accounts where owner_id='${actor}';delete from public.profiles where id='${actor}';delete from auth.users where id='${actor}';commit;`);actor=null;}
async function race(first){
 actor=randomUUID();const project=randomUUID();
 await must(`begin;insert into auth.users(id,email) values('${actor}','draft-race-${actor}@example.invalid');insert into public.usage_accounts(scope,owner_id,byte_limit,output_limit) values('user','${actor}',200000000,3);insert into public.projects(id,owner_id,title,mode,draft_input,preferences) values('${project}','${actor}','Draft deletion race','education','{"mode":"education","topic":"How turbines work","audience":"beginner","intendedUse":"personal-learning","sources":[]}','{"targetSeconds":60,"orientation":"landscape","voiceProfileId":"Kore"}');commit;`);
 const expressions={remove:`public.delete_saved_draft('${project}',1)`,enqueue:`public.enqueue_generation('${project}','race','${request}'::jsonb)`};
 function tx(which,hold){return `begin;set local lock_timeout='10s';set local statement_timeout='20s';set local role authenticated;select set_config('request.jwt.claims','{"sub":"${actor}","role":"authenticated"}',true);select ${expressions[which]};reset role;-- Keep synthetic jobs unclaimable before they become visible to the live worker.\nupdate public.jobs set available_at=now()+interval '1 year' where owner_id='${actor}';${hold?"select '__HOLD__';select pg_sleep(0.8);":''}commit;`;}
 let ready;const held=new Promise(resolve=>{ready=resolve;});
 const a=query(tx(first,true),ready);await Promise.race([held,a.then(()=>{throw Error('Lock barrier missing');})]);const b=query(tx(first==='remove'?'enqueue':'remove',false));const [winner,loser]=await Promise.all([a,b]);
 const expected=first==='remove'?'42501':'P1401';if(winner.code!==0||loser.code===0||!loser.err.includes(expected))throw Error('Unexpected concurrent draft-delete/admission outcome: '+winner.err+' / '+loser.err);
 const state=await must(`select concat(draft_state,'|',(select count(*) from public.jobs where project_id='${project}')) from public.projects where id='${project}';`);
 if(state!==(first==='remove'?'removed|0':'active|1'))throw Error('Inconsistent final race state');
 console.log('PASS: '+(first==='remove'?'deletion holds the lock; concurrent generation cannot revive the draft.':'generation holds the lock; concurrent deletion cannot remove its active draft.'));await clean();
}
try{await race('remove');await race('enqueue');}finally{await clean();}
