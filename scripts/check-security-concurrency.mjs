import {spawn} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
const owner=randomUUID(),project=randomUUID(),revision=randomUUID(),job=randomUUID(),worker=randomUUID(),run=randomUUID();
const subject=createHash('sha256').update(randomUUID()).digest('hex'),network=createHash('sha256').update(randomUUID()).digest('hex');
function sql(input){return new Promise((resolve,reject)=>{const c=spawn('docker',['exec','-i','supabase_db_ai-video-studio-local','psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-Atq'],{windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='';c.stdout.on('data',v=>out+=v);c.stderr.on('data',v=>err+=v);c.on('error',reject);c.on('close',code=>resolve({code,out,err}));c.stdin.end(input);});}
async function required(input){const r=await sql(input);if(r.code!==0)throw Error('Synthetic security fixture SQL failed: '+(r.err.match(/ERROR:[^\r\n]*/)?.[0]??'unavailable'));return r.out.trim();}
try{
 await required(`begin;
 insert into auth.users(id,email) values('${owner}','security-race-${owner}@example.invalid');
 insert into public.projects(id,owner_id,title,mode) values('${project}','${owner}','Race fixture','education');
 insert into public.projects(owner_id,title,mode) select '${owner}','Race fixture','education' from generate_series(1,18);
 insert into public.revisions(id,project_id,owner_id,revision_number,input_hash,request_kind,target_seconds,orientation,voice_profile_id,schema_version,prompt_version,composition_version) values('${revision}','${project}','${owner}',1,repeat('a',64),'initial',60,'landscape','Kore',1,'v1','v1');
 insert into public.jobs(id,project_id,owner_id,revision_id,kind,status) values('${job}','${project}','${owner}','${revision}','generation','failed');
 insert into public.workers(id,label,protocol_version) values('${worker}','Security race fixture',1);
 insert into public.job_runs(id,job_id,attempt_number,worker_id,lease_token) values('${run}','${job}',1,'${worker}',1);
 insert into private.provider_daily_usage values((clock_timestamp() at time zone 'UTC')::date,'${owner}',11);
 insert into private.auth_attempt_windows(kind,identity_hash,attempts,expires_at) values('subject','${subject}',7,clock_timestamp()+interval '60 seconds');commit;`);
 const saves=await Promise.all([1,2].map(()=>sql(`begin;set local role authenticated;select set_config('request.jwt.claims','{"sub":"${owner}","role":"authenticated"}',true);select * from public.save_project_draft(gen_random_uuid(),0,'Concurrent fixture','education','{}','{}');select pg_sleep(.2);commit;`)));
 if(saves.filter(r=>r.code===0).length!==1||saves.filter(r=>r.err.includes('P2101')||r.err.includes('Project metadata capacity')).length!==1)throw Error('Concurrent draft limit failed');
 console.log('PASS: concurrent draft creates admit exactly one final slot.');
 const auth=await Promise.all([1,2].map(()=>sql(`begin;select public.consume_auth_attempt('${subject}','${network}');select pg_sleep(.2);commit;`)));
 const results=auth.map(r=>JSON.parse(r.out.split('\n').find(line=>line.startsWith('{'))));
 if(results.filter(v=>v.allowed).length!==1)throw Error('Concurrent authentication limit failed');
 console.log('PASS: independent auth connections share the last attempt.');
 const dispatches=await Promise.all([1,2].map(()=>sql(`begin;insert into public.provider_attempts(job_id,run_id,operation_key,operation_attempt,dispatch_nonce,provider,model_id,request_hash,status) values('${job}','${run}',gen_random_uuid()::text,1,gen_random_uuid(),'Gemini','synthetic',repeat('a',64),'outcome_unknown');select pg_sleep(.2);commit;`)));
 if(dispatches.filter(r=>r.code===0).length!==1||dispatches.filter(r=>r.err.includes('P1604')||r.err.includes('Daily provider allowance')).length!==1)throw Error('Concurrent daily dispatch cap failed');
 console.log('PASS: concurrent provider reservations grant one final daily request; no provider called.');
}finally{
 await required(`begin;
 select id from public.usage_accounts where scope='global' for update;
 update private.provider_daily_usage g set attempts=g.attempts-x.n from (select (a.started_at at time zone 'UTC')::date usage_day,count(*)::integer n from public.provider_attempts a where a.job_id='${job}' group by 1)x where g.scope_key='global' and g.day=x.usage_day;
 delete from private.provider_daily_usage where scope_key='${owner}';
 delete from private.auth_attempt_windows where (kind='subject' and identity_hash='${subject}') or (kind='network' and identity_hash='${network}');
 delete from public.provider_attempts where job_id='${job}';delete from public.job_runs where job_id='${job}';delete from public.jobs where id='${job}';delete from public.revisions where id='${revision}';delete from public.projects where owner_id='${owner}';delete from public.profiles where id='${owner}';delete from auth.users where id='${owner}';delete from public.workers where id='${worker}';commit;`);
 console.log('Synthetic concurrency fixtures removed; real allowances and daily usage preserved.');
}
