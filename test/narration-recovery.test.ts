import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile,rm,unlink} from 'node:fs/promises';
import path from 'node:path';
import {executeEducation,type EducationSession} from '../src/worker/education.ts';
import {hash,safeRun,root} from '../src/storage.ts';
import {InputSchema,StoryboardSchema} from '../src/contracts.ts';
import {WorkerAssignmentSchema} from '../shared/contracts/worker.ts';

test('fresh worker retries reuse the full fallback narration set without primary dispatch or AI allowance',async()=>{
 const jobId=randomUUID(),run=safeRun('web-'+jobId),stamp=new Date().toISOString();
 const source={mode:'education',title:'Energy',topic:'Energy',audience:'beginner',intendedUse:'personal-learning',sources:[]};
 const assignment=WorkerAssignmentSchema.parse({jobId,revisionId:randomUUID(),projectId:randomUUID(),kind:'generation',stage:'render',leaseToken:'1',serverTime:stamp,leaseExpiresAt:new Date(Date.now()+90000).toISOString(),heartbeatIntervalSeconds:20,input:{schemaVersion:1,inputHash:'b'.repeat(64),inputAssetIds:[],manifest:{input:source,preferences:{targetSeconds:60,orientation:'landscape',voiceProfileId:'Kore'},acknowledgments:{sourceRights:true,externalAiProcessing:true,policyVersion:'v1',acceptedAt:stamp},draftVersion:1}},budgets:{maxExternalAttempts:24,usedExternalAttempts:12,maxRepairs:2,usedRepairs:0,maxActiveMs:'1800000',usedActiveMs:'0'},checkpoints:[]});
 const plan=StoryboardSchema.parse({title:'Energy',learningObjective:'Understand energy.',factualCautions:[],scenes:[0,1,2,3].map(i=>({id:'scene-'+(i+1),title:'Energy',narration:Array(30).fill('energy').join(' '),layout:i===0?'intro':i===3?'recap':'explain',keyPoints:['Energy changes'],diagramNodes:['Input','Output'],teacherGesture:'explain'}))});
 const stored=assignment.input.manifest.input;if(stored.mode!=='education')throw Error('FIXTURE_MODE_INVALID');
 const input=InputSchema.parse({topic:stored.topic,audience:stored.audience,durationSeconds:60,format:'landscape',referenceNotes:stored.referenceNotes??'',brief:stored.brief,learningObjective:stored.learningObjective});
 const env={GEMINI_PLANNER_MODEL:'fixture-planner',GEMINI_TTS_MODEL:'fixture-primary',GEMINI_VOICE_NAME:'Kore',ELEVENLABS_VOICE_ID:'fixture-fallback',ELEVENLABS_TTS_MODEL:'fixture-fallback-model',ELEVENLABS_FALLBACK_ENABLED:'false',WORKER_PROVIDER_CALLS_ALLOWED:'false'};
 const previous=Object.fromEntries(Object.keys(env).map(key=>[key,process.env[key]])),oldFetch=globalThis.fetch;
 Object.assign(process.env,env);let calls=0,hooks=0,reads=0,renders=0;
 globalThis.fetch=async()=>{calls++;throw Error('NO_NETWORK_OR_PROVIDER_REQUEST_ALLOWED');};
 const records:{stage:string;key:string;dependencyHash:string;manifest:Record<string,unknown>;assets:string[]}[]=[{stage:'story',key:'story-0',dependencyHash:hash({input,inputHash:assignment.input.inputHash,calibration:0,wordTarget:129,model:env.GEMINI_PLANNER_MODEL,version:1}),manifest:{plan},assets:[]}];
 const audioProviders=new Map<string,string>();
 for(const provider of ['elevenlabs','gemini'])for(const scene of provider==='gemini'?plan.scenes.slice(0,1):plan.scenes){
  const voice=provider==='gemini'?'Kore':env.ELEVENLABS_VOICE_ID,model=provider==='gemini'?env.GEMINI_TTS_MODEL:env.ELEVENLABS_TTS_MODEL,audio=randomUUID();audioProviders.set(audio,provider);
  records.push({stage:'voice',key:scene.id+'-'+provider+'-0',dependencyHash:hash({scene,provider,voice,model,version:1}),manifest:{audio,provider,voice,duration:15,captions:[{text:scene.narration,startMs:0,endMs:14000,timestampMs:0,confidence:null}],cues:[{start:0,end:15,value:'A'}]},assets:[audio]});
 }
 // Synthetic silent PCM exercises real duration probing and concatenation only.
 const wav=Buffer.alloc(44+15*16000*2);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
 function session(lease:string){return{assignment:{...assignment,leaseToken:lease},run,guard:{controller:new AbortController(),assertActive(){},stop(){}},restore:async()=>{},saved:(key:string,dependency:string)=>records.find(c=>c.key===key&&c.dependencyHash===dependency),hooks:()=>{hooks++;throw Error('PROVIDER_DISPATCH_SHOULD_NOT_RUN');},save:async()=>{throw Error('COMPLETE_CHECKPOINT_MUST_NOT_BE_REPLACED');},download:async(id:string,destination:string)=>{assert.equal(audioProviders.get(id),'elevenlabs');reads++;await mkdir(path.dirname(destination),{recursive:true});await writeFile(destination,wav);},operation:async(op:{type:string;stage?:string})=>{if(op.type==='progress'&&op.stage==='render'){renders++;throw Error('FIXTURE_RENDER_BOUNDARY');}return{};}} as unknown as EducationSession;}
 try{
  for(const lease of ['1','2'])await assert.rejects(()=>executeEducation(session(lease)),/FIXTURE_RENDER_BOUNDARY/);
  assert.equal(reads,8);assert.equal(renders,2);assert.equal(hooks,0);assert.equal(calls,0);
 }finally{
  globalThis.fetch=oldFetch;for(const [key,value] of Object.entries(previous))if(value===undefined)delete process.env[key];else process.env[key]=value;
  const expected=path.resolve(root,'local-runs','web-'+jobId);assert.equal(path.resolve(run),expected);await rm(expected,{recursive:true,force:true});
  await unlink(path.resolve(root,'.cache/worker-workspaces/records',jobId+'.json')).catch(error=>{if(error.code!=='ENOENT')throw error;});
 }
});
