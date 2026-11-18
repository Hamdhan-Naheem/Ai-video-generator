import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

// Real sessions, no timing-based race assumption: validation waits for an explicit COMMIT.
function session(onOutput=()=>{}) {
  const child=spawn('docker',['exec','-i','supabase_db_ai-video-studio-local','psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],
    {windowsHide:true,stdio:['pipe','pipe','pipe']});
  let out='',err='';
  child.stdout.on('data',chunk=>{out+=chunk;onOutput(out);});
  child.stderr.on('data',chunk=>err+=chunk);
  child.stdin.on('error',()=>{});
  const done=new Promise((resolve,reject)=>{
    child.on('error',reject);child.on('close',code=>resolve({code,out,err}));
  });
  child.stdin.write('\\set VERBOSITY sqlstate\n');
  return {child,done};
}
function sql(query) {const current=session();current.child.stdin.end(query);return current.done;}
const user='d0000000-0000-4000-8000-000000000001';
const project='d1000000-0000-4000-8000-000000000001';
const revision='d2000000-0000-4000-8000-000000000001';
const job='d3000000-0000-4000-8000-000000000001';
const source='d4000000-0000-4000-8000-000000000001';
const destination='d4000000-0000-4000-8000-000000000002';
const deletion='d5000000-0000-4000-8000-000000000001';
const fixture=await sql(`begin;
insert into auth.users(id,email,raw_user_meta_data) values('${user}','scene-race@example.invalid','{"display_name":"Scene race fixture"}');
insert into public.projects(id,owner_id,title,mode) values('${project}','${user}','Scene race','education');
insert into public.revisions(id,project_id,owner_id,revision_number,input_snapshot,input_hash,request_kind,target_seconds,orientation,voice_profile_id,schema_version,prompt_version,composition_version)
values('${revision}','${project}','${user}',1,'{}',repeat('a',64),'initial',60,'landscape','Kore',1,'v1','v1');
insert into public.jobs(id,project_id,owner_id,revision_id,kind,status) values('${job}','${project}','${user}','${revision}','generation','cancelled');
insert into public.plan_versions(id,project_id,owner_id,revision_id,version,dependency_hash,status,model_id,prompt_version,created_by_job_id)
select ('d4000000-0000-4000-8000-00000000000'||n)::uuid,'${project}','${user}','${revision}',n,repeat('a',64),'candidate','synthetic-no-provider','v1','${job}' from generate_series(1,2) n;
insert into public.scenes(project_id,owner_id,revision_id,plan_id,ordinal,narration,script_hash)
select '${project}','${user}','${revision}','${source}',n,'Race fixture',repeat('a',64) from generate_series(0,3) n;
commit;`);
assert.equal(fixture.code,0,`Scene race fixture must initialize: ${fixture.err}`);
try {
  let reportLocked;
  const locked=new Promise(resolve=>reportLocked=resolve);
  const validator=session(output=>{if(output.includes('SOURCE_VALIDATION_LOCK_HELD')) reportLocked();});
  let move;
  try {
    validator.child.stdin.write(`begin; set local statement_timeout='5s'; set local idle_in_transaction_session_timeout='30s'; set local role service_role;
update public.plan_versions set status='validated' where id='${source}';
select 'SOURCE_VALIDATION_LOCK_HELD';\n`);
    const reached=await Promise.race([locked.then(()=>true),validator.done.then(()=>false)]);
    assert.equal(reached,true,'Validation must hold its plan lock before attempting the move.');
    move=await sql(`begin; set local statement_timeout='5s'; set local lock_timeout='2s'; set local role service_role;
update public.scenes set plan_id='${destination}' where plan_id='${source}' and ordinal=3; commit;`);
  } finally {
    validator.child.stdin.end('commit;\n');
  }
  const validation=await validator.done;
  assert.equal(validation.code,0,`Concurrent validation must commit: ${validation.err}`);
  assert.notEqual(move.code,0,'Scene reparenting must fail while source validation is uncommitted.');
  assert.match(move.err,/23514/,'The move must fail with the membership constraint, not a lock timeout.');
  const state=await sql(`select status||'|'||(select count(*) from public.scenes where plan_id='${source}')||'|'||(select count(*) from public.scenes where plan_id='${destination}') from public.plan_versions where id='${source}';`);
  assert.equal(state.code,0);
  assert.equal(state.out.trim(),'validated|4|0','Validation must retain all four scenes and leave destination empty.');
  console.log('PASS: a scene cannot move during uncommitted source validation; validated plan retains all four scenes.');
} finally {
  const cleanup=await sql(`begin;
update public.profiles set status='deleting',deletion_requested_at=now() where id='${user}';
insert into public.account_deletions(id,owner_id,status) values('${deletion}','${user}','purging');
update public.projects set deleted_at=now() where id='${project}';
update public.revisions set deleted_at=now() where id='${revision}';
select public.purge_revision_plans('${revision}');
delete from public.jobs where id='${job}';
delete from public.revisions where id='${revision}';
delete from public.projects where id='${project}';
delete from public.profiles where id='${user}';
delete from public.account_deletions where id='${deletion}';
delete from auth.users where id='${user}'; commit;`);
  assert.equal(cleanup.code,0,`Scene race fixture must be removed: ${cleanup.err}`);
}
