import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {mkdtemp,mkdir,writeFile,rm,access} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import {createClient} from '@supabase/supabase-js';
import {withJobWorkspace,cleanupWorkspaces} from '../src/maintenance/workspaces.ts';
import {workspaceStateReader} from '../src/maintenance/workspace-port.ts';
import {renderVideo} from '../src/render.ts';
import {root} from '../src/storage.ts';
import {ffmpeg,runTool} from '../src/media.ts';
import type {VideoProps} from '../src/contracts.ts';
const env=parseEnv(readFileSync('apps/web/.env.local','utf8'));
if(env.SUPABASE_URL!=='http://127.0.0.1:55421'||!env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Local stack required');
const admin=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),record={jobId:randomUUID(),projectId:randomUUID(),revisionId:randomUUID()},renderRecord={jobId:randomUUID(),projectId:randomUUID(),revisionId:randomUUID()};
const repo=await mkdtemp(path.join(os.tmpdir(),'w24-integration-'));let owner:string|undefined,renderRun:string|undefined;
function sql(input:string){return execFileSync('docker',['exec','-i','supabase_db_ai-video-studio-local','psql','-X','-U','postgres','-d','postgres','-Atq','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']});}
try{
 const created=await admin.auth.admin.createUser({email:`w24-workspace-${randomUUID()}@example.invalid`,password:'Workspace-test-private-2026!',email_confirm:true,user_metadata:{display_name:'Synthetic workspace fixture'}});if(created.error||!created.data.user)throw Error('Fixture creation failed');owner=created.data.user.id;
 sql(`begin;insert into public.projects(id,owner_id,title,mode) values('${record.projectId}','${owner}','Synthetic workspace fixture','education');insert into public.revisions(id,owner_id,project_id,revision_number,input_snapshot,input_hash,request_kind,status,target_seconds,orientation,voice_profile_id,schema_version,prompt_version,composition_version) values('${record.revisionId}','${owner}','${record.projectId}',1,'{"input":{"title":"Synthetic workspace fixture"}}',repeat('a',64),'initial','failed',60,'landscape','Kore',1,'v1','v1');insert into public.jobs(id,owner_id,project_id,revision_id,kind,status,finished_at) values('${record.jobId}','${owner}','${record.projectId}','${record.revisionId}','generation','failed',now()-interval '3 days');commit;`);
 await withJobWorkspace(repo,record,async run=>{await writeFile(path.join(run,'private-fixture.txt'),'SYNTHETIC WORKSPACE BYTES');});
 const read=workspaceStateReader(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY),state=await read({...record,version:1,createdAt:new Date().toISOString()});assert(state);assert.equal(state.status,'failed');assert(Math.abs(Date.parse(state.serverTime)-Date.now())<300000,'Server time is available');
 const protectedNow=await cleanupWorkspaces(repo,read,{apply:true});assert.equal(protectedNow.removed,0,'Recent local files protected');
 // Advance both test clocks only; no real 48-hour wait or production policy override.
 const future=Date.now()+3*86400000,timedRead=async(r:Parameters<typeof read>[0])=>{const s=await read(r);return s?{...s,serverTime:new Date(future).toISOString()}:null;};
 assert.equal((await cleanupWorkspaces(repo,timedRead,{now:()=>future})).eligible,1);assert.equal((await cleanupWorkspaces(repo,timedRead,{apply:true,now:()=>future})).removed,1);
 console.log('Real local server identity/status/time, recent-file protection and simulated elapsed-time cleanup passed.');
 // One synthetic still per orientation proves the actual renderer uses and removes its private bundle.
 await withJobWorkspace(root,renderRecord,async run=>{renderRun=run;await mkdir(path.join(run,'public'));await runTool(ffmpeg,['-y','-v','error','-f','lavfi','-i','anullsrc=r=16000:cl=mono','-t','60',path.join(run,'public','narration.wav')]);
  const base:VideoProps={title:'SYNTHETIC WORKSPACE CHECK',format:'landscape',durationFrames:1800,audioFile:'narration.wav',mouthCues:[],burnedCaptions:false,captions:[],scenes:[{startFrame:0,durationFrames:1800,plan:{id:'scene-1',title:'Synthetic layout',narration:'Synthetic fixture only.',layout:'process',keyPoints:['Water turns a turbine.'],diagramNodes:['Water','Turbine','Generator'],teacherGesture:'point'}}]};
  for(const format of ['landscape','portrait'] as const){await renderVideo(run,{...base,format},true,true);await access(path.join(run,`preview-${format}.png`));await assert.rejects(access(path.join(run,'.render-bundle')));}
 });
 console.log('Actual Remotion landscape/portrait stills passed; temporary copied-audio bundles removed. No AI calls.');
}finally{
 if(owner){sql(`begin;delete from public.jobs where owner_id='${owner}';delete from public.revisions where owner_id='${owner}';delete from public.projects where owner_id='${owner}';delete from public.profiles where id='${owner}';delete from auth.users where id='${owner}';commit;`);}
 if(path.dirname(repo)!==os.tmpdir()||!path.basename(repo).startsWith('w24-integration-'))throw Error('Unsafe fixture cleanup');await rm(repo,{recursive:true,force:true,maxRetries:3,retryDelay:100});
 if(renderRun){const expected=path.join(root,'local-runs','web-'+renderRecord.jobId);if(renderRun!==expected)throw Error('Unsafe render cleanup');await rm(expected,{recursive:true,force:true,maxRetries:3,retryDelay:100});await rm(path.join(root,'.cache','worker-workspaces','records',renderRecord.jobId+'.json'),{force:true});}
}
