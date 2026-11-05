import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';

// Real commits and real clock expiry; no disabled triggers or altered retention.
// Metadata-only synthetic artifacts: no Storage uploads or provider requests.
function sql(query) {
  return new Promise((resolve,reject)=>{
    const child=spawn('docker',['exec','-i','supabase_db_ai-video-studio-local','psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{windowsHide:true,stdio:['pipe','pipe','pipe']});
    let out='',err='';
    child.stdout.on('data',chunk=>out+=chunk);
    child.stderr.on('data',chunk=>err+=chunk);
    child.on('error',reject);
    child.on('close',code=>resolve({code,out,err}));
    child.stdin.end('\\set VERBOSITY sqlstate\n'+query);
  });
}
const user=randomUUID(), project=randomUUID(), revision=randomUUID(), job=randomUUID();
const assets=Array.from({length:5},()=>randomUUID());
const kinds=['video','report','thumbnail','captions_vtt','captions_srt'];
const claims=`set local role authenticated; select set_config('request.jwt.claims','{"sub":"${user}","role":"authenticated"}',true);`;
const save=(version,title)=>`select draft_version from public.save_project_draft('${project}',${version},'${title}','education','{"topic":"Edited after expiry"}','{"targetSeconds":75}');`;
try {
  const fixture=await sql(`begin;
insert into auth.users(id,email) values('${user}','expiry-${user}@example.invalid');
insert into public.projects(id,owner_id,title,mode) values('${project}','${user}','Expiry fixture','education');
insert into public.revisions(id,project_id,owner_id,revision_number,input_hash,request_kind,target_seconds,orientation,voice_profile_id,schema_version,prompt_version,composition_version,status,completed_at,expires_at)
values('${revision}','${project}','${user}',1,repeat('a',64),'initial',60,'landscape','Kore',1,'v1','v1','ready',now()-interval '7 days'+interval '2 seconds',now()+interval '2 seconds');
insert into public.jobs(id,project_id,owner_id,revision_id,kind,status) values('${job}','${project}','${user}','${revision}','generation','succeeded');
${assets.map((id,i)=>`insert into public.assets(id,project_id,owner_id,kind,bucket,object_key,state,byte_size,checksum,received_at,validated_at,detected_mime)
values('${id}','${project}','${user}','${kinds[i]}','artifacts','${user}/${project}/${id}/fixture.bin','available',1,repeat('a',64),now(),now(),'application/octet-stream');`).join('\n')}
insert into public.exports(project_id,owner_id,revision_id,variant,state,job_id,video_asset_id,verification_asset_id,thumbnail_asset_id,vtt_asset_id,srt_asset_id,ready_at,expires_at)
values('${project}','${user}','${revision}','clean','ready','${job}',${assets.map(id=>`'${id}'`).join(',')},now(),now()+interval '2 seconds');
update public.projects set latest_ready_revision_id='${revision}' where id='${project}';
commit;`);
  assert.equal(fixture.code,0,`Live result assignment must commit: ${fixture.err}`);
  const wait=await sql(`select pg_sleep(greatest(0,extract(epoch from expires_at-clock_timestamp()))+0.05) from public.revisions where id='${revision}';`);
  assert.equal(wait.code,0,wait.err);
  const saved=await sql(`begin; ${claims} ${save(1,'Saved after expiry')} commit;`);
  assert.equal(saved.code,0,`Draft save after expiry must commit before cleanup: ${saved.err}`);
  const state=await sql(`select title='Saved after expiry' and draft_input->>'topic'='Edited after expiry' and preferences->>'targetSeconds'='75' and draft_version=2 and latest_ready_revision_id='${revision}' from public.projects where id='${project}';
select status='ready' and expires_at<=now() from public.revisions where id='${revision}';`);
  assert.equal(state.out.trim(),'t\nt','Persist edits without cleanup or extending result retention');
  const visibility=await sql(`begin; ${claims} select count(*) from public.revisions where id='${revision}'; rollback;`);
  assert.match(visibility.out,/\n0\nROLLBACK/,'Expired output remains hidden by RLS');
  const dashboard=await sql(`begin; ${claims} select concat(public.get_dashboard()->'usage'->>'retainedOutputs','|',public.get_dashboard()->'recentProjects'->0->>'state'); rollback;`);
  assert.equal(dashboard.code,0,dashboard.err);
  assert.match(dashboard.out,/\n0\|expired\nROLLBACK/,'Dashboard expires old ready pointer without cleanup');
  const stale=await sql(`begin; ${claims} ${save(1,'Stale overwrite')} commit;`);
  assert.notEqual(stale.code,0);
  assert.match(stale.err,/40001/,'Optimistic concurrency remains enforced');
  const reassigned=await sql(`begin;
update public.projects set latest_ready_revision_id=null where id='${project}';
update public.projects set latest_ready_revision_id='${revision}' where id='${project}';
${claims} ${save(2,'Deferred bypass attempt')}
commit;`);
  assert.notEqual(reassigned.code,0);
  assert.match(reassigned.err,/23514/,'Reassigning expired output fails even with later unrelated update');
  const deleted=await sql(`begin;
update public.revisions set deleted_at=now() where id='${revision}';
set constraints all immediate;
${claims} ${save(2,'Deleted result')}
commit;`);
  assert.notEqual(deleted.code,0);
  assert.match(deleted.err,/23514/,'Unchanged pointers still reject tombstoned revisions');
  const cleared=await sql(`begin;
update public.projects set latest_ready_revision_id=null where id='${project}';
${claims} ${save(2,'Saved after pointer cleanup')} commit;`);
  assert.equal(cleared.code,0,`Cleared pointer permits draft save: ${cleared.err}`);
  console.log('Draft expiry regression passed: live publication, expired save/retention, RLS, version conflict, deferred reassignment rejection, tombstone rejection, pointer cleanup.');
} finally {
  const cleanup=await sql(`begin;
update public.projects set latest_ready_revision_id=null where id='${project}';
delete from public.exports where project_id='${project}';
delete from public.assets where project_id='${project}';
delete from public.jobs where project_id='${project}';
delete from public.revisions where project_id='${project}';
delete from public.projects where id='${project}';
delete from public.profiles where id='${user}';
delete from auth.users where id='${user}';
commit;`);
  assert.equal(cleanup.code,0,`Synthetic expiry fixture cleanup: ${cleanup.err}`);
}
