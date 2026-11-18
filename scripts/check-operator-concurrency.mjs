import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const actor=randomUUID(),request=randomUUID();
function sql(input,onLocked){return new Promise((resolve,reject)=>{const p=spawn('docker',['exec','-i','supabase_db_ai-video-studio-local','psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-Atq'],{windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='',notified=false;p.stdout.on('data',b=>{out+=b;if(!notified&&out.includes('LOCKED')){notified=true;onLocked?.();}});p.stderr.on('data',b=>err+=b);p.on('error',reject);p.on('close',code=>code===0?resolve(out.trim()):reject(Error('Operator race SQL unavailable: '+(err.match(/ERROR:[^\r\n]*/)?.[0]??'failed'))));p.stdin.end(input);});}
const identity=`select set_config('request.jwt.claims','{"sub":"${actor}","role":"authenticated"}',true);`;
let original;
try{
 original=await sql("select jsonb_build_object('version',version,'generationPaused',generation_paused,'claimsPaused',claims_paused,'updatedAt',updated_at,'updatedBy',updated_by) from public.app_settings where id='global';");
 const controls=JSON.parse(original);
 await sql(`begin;insert into auth.users(id,email) values('${actor}','operator-race-${actor}@example.invalid');update public.profiles set role='operator' where id='${actor}';commit;`);
 const transaction=key=>`begin;set local lock_timeout='8s';${identity}select public.operator_console('controls','${JSON.stringify({requestId:key,reason:'release_check',expectedVersion:controls.version,claimsPaused:controls.claimsPaused})}');select pg_sleep(.15);commit;`;
 const results=await Promise.all([sql(transaction(request)),sql(transaction(request))]);assert(results.every(s=>!s.includes('operatorError')&&!s.includes('rateLimited')));
 assert.equal(await sql(`select count(*) from public.operator_audit where actor_id='${actor}';`),'1');
 assert.equal(await sql(`select count(*) from private.operator_receipts where actor='${actor}';`),'1');
 console.log('PASS: concurrent duplicate commands produce one receipt and one audit entry.');
 await sql(`update private.operator_windows set reads=9,mutations=9,window_start=clock_timestamp() where actor='${actor}';`);
 const limited=await Promise.all([sql(transaction(randomUUID())),sql(transaction(randomUUID()))]);assert.equal(limited.filter(s=>s.includes('rateLimited')).length,1);
 assert.equal(await sql(`select mutations from private.operator_windows where actor='${actor}';`),'10');
 console.log('PASS: concurrent mutation attempts admit exactly the last allowed operation.');
 const after=await sql("select jsonb_build_object('version',version,'generationPaused',generation_paused,'claimsPaused',claims_paused,'updatedAt',updated_at,'updatedBy',updated_by) from public.app_settings where id='global';");
 assert.equal(after,original);console.log('PASS: production control flags, version and metadata are unchanged.');
 await sql(`update public.profiles set role='tester' where id='${actor}';`);
 let holding;const locked=new Promise(resolve=>{holding=sql("begin;select id from public.usage_accounts where scope='global' for update;select 'LOCKED';select pg_sleep(5);rollback;",resolve);});
 await locked;
 await assert.rejects(sql(`begin;set local statement_timeout='1000ms';${identity}select public.operator_console('health');rollback;`),/Operator required/);
 await holding;console.log('PASS: ordinary users are rejected while the generation lock is held elsewhere.');
}finally{
 await sql(`begin;delete from public.operator_audit where actor_id='${actor}';delete from public.profiles where id='${actor}';delete from auth.users where id='${actor}';commit;`);
}
