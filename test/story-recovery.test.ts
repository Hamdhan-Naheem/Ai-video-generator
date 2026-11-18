import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,rm,unlink} from 'node:fs/promises';
import path from 'node:path';
import {executeEducation,type EducationSession} from '../src/worker/education.ts';
import {hash,safeRun} from '../src/storage.ts';
import {WorkerAssignmentSchema} from '../shared/contracts/worker.ts';

test('actual Education orchestration persists rejected planning and resumes it across worker sessions',async()=>{
 const jobId=randomUUID(),run=safeRun('web-'+jobId),stamp=new Date().toISOString();
 const assignment=WorkerAssignmentSchema.parse({jobId,revisionId:randomUUID(),projectId:randomUUID(),kind:'generation',stage:'story',leaseToken:'1',serverTime:stamp,leaseExpiresAt:new Date(Date.now()+90000).toISOString(),heartbeatIntervalSeconds:20,input:{schemaVersion:1,inputHash:'b'.repeat(64),inputAssetIds:[],manifest:{input:{mode:'education',title:'Energy',topic:'Energy',audience:'beginner',intendedUse:'personal-learning',sources:[]},preferences:{targetSeconds:60,orientation:'landscape',voiceProfileId:'Kore'},acknowledgments:{sourceRights:true,externalAiProcessing:true,policyVersion:'v1',acceptedAt:stamp},draftVersion:1}},budgets:{maxExternalAttempts:24,usedExternalAttempts:0,maxRepairs:2,usedRepairs:0,maxActiveMs:'1800000',usedActiveMs:'0'},checkpoints:[]});
 const old={fetch:globalThis.fetch,key:process.env.GEMINI_API_KEY,model:process.env.GEMINI_PLANNER_MODEL,voice:process.env.GEMINI_VOICE_NAME};process.env.GEMINI_API_KEY='synthetic';process.env.GEMINI_PLANNER_MODEL='fixture';process.env.GEMINI_VOICE_NAME='Kore';
 let calls=0;const receipts=new Set<string>(),repairs=new Set<string>();
 const valid={title:'Energy',learningObjective:'Understand energy.',factualCautions:[],scenes:[0,1,2,3].map(i=>({id:`scene-${i+1}`,title:'Energy',narration:Array(30).fill('energy').join(' '),layout:i===0?'intro':i===3?'recap':'explain',keyPoints:['Energy changes'],diagramNodes:['Input','Output'],teacherGesture:'explain'}))};
 globalThis.fetch=async()=>{calls++;return Response.json({output_text:JSON.stringify(calls<3?{}:valid)});};
 const session=()=>({assignment,run,guard:{assertActive(){}},restore:async()=>{},saved:()=>undefined,hooks:()=>({repair:async(key:string)=>{repairs.add(key);assert.ok(repairs.size<=2);},beforeDispatch:async(_provider:string,body:unknown)=>{const id=hash(body);assert.equal(receipts.has(id),false);receipts.add(id);return id;},afterDispatch:async()=>{}}),operation:async(op:{type:string})=>{if(op.type==='plan')throw Error('FIXTURE_PLAN_ACCEPTED');return{};}} as unknown as EducationSession);
 try{
  await assert.rejects(()=>executeEducation(session()),/STORY_VALIDATION_FAILED/);
  assert.equal(JSON.parse(await readFile(path.join(run,'story-0-validation.json'),'utf8')).recovery.completedPasses,2);
  // A fresh session must load its receipt rather than redispatching pass zero.
  await assert.rejects(()=>executeEducation(session()),/FIXTURE_PLAN_ACCEPTED/);assert.equal(calls,3);assert.equal(repairs.size,2);
  await assert.rejects(()=>executeEducation(session()),/FIXTURE_PLAN_ACCEPTED/);assert.equal(calls,3,'valid cached story is reused');
 }finally{
  globalThis.fetch=old.fetch;for(const [name,value] of [['GEMINI_API_KEY',old.key],['GEMINI_PLANNER_MODEL',old.model],['GEMINI_VOICE_NAME',old.voice]])if(value===undefined)delete process.env[name!];else process.env[name!]=value;
  const expected=path.resolve(process.cwd(),'local-runs','web-'+jobId);assert.equal(path.resolve(run),expected);await rm(expected,{recursive:true,force:true});await unlink(path.resolve('.cache/worker-workspaces/records',jobId+'.json')).catch(()=>{});
 }
});
