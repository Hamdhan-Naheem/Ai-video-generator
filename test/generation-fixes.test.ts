import {WorkerTransportError} from '../src/worker/transport.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {boundWhisperCaptions,validateCaptions} from '../src/timing.ts';
import {RecoverablePipelineError} from '../src/pipeline-errors.ts';
import {educationFailureCode,educationFailureDetail} from '../src/worker/failure.ts';
import {safeProjectReturn} from '../shared/contracts/projects.ts';
const caption=(startMs:number,endMs:number)=>({text:'Example',startMs,endMs,timestampMs:startMs,confidence:null});
test('small Whisper window tails are bounded to actual audio without changing speech or words',()=>{const input=[caption(100,500),caption(12000,13000)];const result=boundWhisperCaptions(input,12.64);assert.equal(result[1].endMs,12640);assert.equal(result[1].startMs,12000);assert.equal(result[1].text,input[1].text);assert.equal(input[1].endMs,13000);assert.doesNotThrow(()=>validateCaptions(result,12.64));});
test('large overrun, wholly outside words and overlapping captions remain rejected',()=>{for(const caps of [[caption(12000,13200)],[caption(12650,13000)],[caption(0,800),caption(500,900)]])assert.throws(()=>boundWhisperCaptions(caps,12.64),RecoverablePipelineError);assert.throws(()=>validateCaptions([caption(12000,13000)],12.64));});
test('known validation failures can use bounded backend recovery; unknown and authorization failures stay stopped',()=>{assert.equal(educationFailureCode(new RecoverablePipelineError('STORY_VALIDATION_FAILED'),'story'),'PROVIDER_UNAVAILABLE');assert.equal(educationFailureCode(new RecoverablePipelineError('CAPTION_TIMING_INVALID'),'voice'),'MEDIA_PROCESSING_FAILED');assert.equal(educationFailureCode(new Error('PRIVATE_RAW_ERROR'),'story'),'PIPELINE_FAILED');assert.equal(JSON.stringify(educationFailureDetail(new Error('PRIVATE_RAW_ERROR'))).includes('PRIVATE_RAW_ERROR'),false);});
test('only exact owned progress-route shapes survive sign-in returns',()=>{const id='c2000000-0000-4000-8000-000000000001';assert.equal(safeProjectReturn(`/projects/${id}/progress`),`/projects/${id}/progress`);for(const p of [`https://evil.invalid/projects/${id}/progress`,`/projects/${id}/progress?next=https://evil.invalid`,`/projects/${id}/progress/extra`,'/projects/not-a-uuid/progress'])assert.equal(safeProjectReturn(p),'/dashboard');});

test('invalid planner output stays bounded and diagnostics omit response text and unknown property names',async()=>{
 const {planEducation}=await import('../src/providers.ts');const oldFetch=globalThis.fetch,oldKey=process.env.GEMINI_API_KEY,oldModel=process.env.GEMINI_PLANNER_MODEL;let calls=0,repairs=0;process.env.GEMINI_API_KEY='synthetic-test-value';process.env.GEMINI_PLANNER_MODEL='fixture-model';globalThis.fetch=async()=>{calls++;return Response.json({output_text:JSON.stringify({PRIVATE_CANARY:'PRIVATE_RESPONSE_TEXT'})});};
 try{await assert.rejects(()=>planEducation({topic:'Turbines',audience:'beginner',durationSeconds:60,format:'landscape',referenceNotes:''},129,{repair:async()=>{repairs++;}}),e=>e instanceof RecoverablePipelineError&&e.code==='STORY_VALIDATION_FAILED'&&!JSON.stringify(educationFailureDetail(e)).includes('PRIVATE'));assert.equal(calls,2);assert.equal(repairs,1);}
 finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;if(oldModel===undefined)delete process.env.GEMINI_PLANNER_MODEL;else process.env.GEMINI_PLANNER_MODEL=oldModel;}
});

test('story rejection receipts resume the remaining repair without replaying successful provider requests',async()=>{
 const {planEducation,PlanningRecoverySchema}=await import('../src/providers.ts');
 const {hash}=await import('../src/storage.ts');
 const oldFetch=globalThis.fetch,oldKey=process.env.GEMINI_API_KEY,oldModel=process.env.GEMINI_PLANNER_MODEL;
 process.env.GEMINI_API_KEY='synthetic';process.env.GEMINI_PLANNER_MODEL='fixture';
 let recovery=PlanningRecoverySchema.parse({completedPasses:0,issues:[]});const requests=new Set<string>(),repairs:string[]=[];let calls=0;
 const valid={title:'Energy',learningObjective:'Understand energy.',factualCautions:[],scenes:[0,1,2,3].map(i=>({id:`scene-${i+1}`,title:'Energy',narration:Array(30).fill('energy').join(' '),layout:i===0?'intro':i===3?'recap':'explain',keyPoints:['Energy changes'],diagramNodes:['Input','Output'],teacherGesture:'explain'}))};
 globalThis.fetch=async()=>{calls++;return Response.json({output_text:JSON.stringify(calls<3?{PRIVATE_CANARY:'PRIVATE_TEXT'}:valid)});};
 const hooks=()=>({planningRecovery:recovery,onPlanningRejected:async(state:typeof recovery)=>{recovery=PlanningRecoverySchema.parse(state);},repair:async(key:string)=>{repairs.push(key);},beforeDispatch:async(_provider:string,body:unknown)=>{const key=hash(body);assert.equal(requests.has(key),false,'must not replay a successful provider request');requests.add(key);return key;},afterDispatch:async()=>{}});
 try{
  const input={topic:'Energy',audience:'beginner',durationSeconds:60 as const,format:'landscape' as const,referenceNotes:''};
  await assert.rejects(()=>planEducation(input,129,hooks()),RecoverablePipelineError);assert.equal(calls,2);assert.equal(recovery.completedPasses,2);
  const result=await planEducation(input,129,hooks());assert.equal(result.scenes.length,4);assert.equal(calls,3);assert.deepEqual(repairs,['plan-invalid','plan-invalid-2']);assert.equal(JSON.stringify(recovery).includes('PRIVATE'),false);
  recovery={completedPasses:3,issues:['response_json_invalid']};await assert.rejects(()=>planEducation(input,129,hooks()),RecoverablePipelineError);assert.equal(calls,3);
 }finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;if(oldModel===undefined)delete process.env.GEMINI_PLANNER_MODEL;else process.env.GEMINI_PLANNER_MODEL=oldModel;}
});

test('uncertain planner dispatches do not create rejected-response receipts or unlock another call',async()=>{
 const {planEducation,ProviderError}=await import('../src/providers.ts');const oldFetch=globalThis.fetch,oldKey=process.env.GEMINI_API_KEY,oldModel=process.env.GEMINI_PLANNER_MODEL;let rejected=0,called=0;process.env.GEMINI_API_KEY='synthetic';process.env.GEMINI_PLANNER_MODEL='fixture';globalThis.fetch=async()=>{called++;throw Error('network failed');};
 try{await assert.rejects(()=>planEducation({topic:'Energy',audience:'beginner',durationSeconds:60,format:'landscape',referenceNotes:''},129,{onPlanningRejected:async()=>{rejected++;}}),e=>e instanceof ProviderError&&e.kind==='connection');assert.equal(called,1);assert.equal(rejected,0);}
 finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;if(oldModel===undefined)delete process.env.GEMINI_PLANNER_MODEL;else process.env.GEMINI_PLANNER_MODEL=oldModel;}
});

test('worker transport preserves allowlisted conflict reasons and hides arbitrary upstream content',async()=>{
 const {WorkerTransport}=await import('../src/worker/transport.ts');const config={origin:'http://127.0.0.1:3000',workerId:'c2000000-0000-4000-8000-000000000001',credentialId:'c2000000-0000-4000-8000-000000000002',token:'wkr_'+'a'.repeat(43),expiresAt:'2026-12-01T00:00:00Z'};
 for(const [reply,expected] of [['LEASE_LOST','LEASE_LOST'],['WORKER_BUDGET_OR_RECONCILIATION','WORKER_BUDGET_OR_RECONCILIATION'],['PRIVATE_RAW_MESSAGE','WORKER_EXECUTION_UNAVAILABLE']]){const client=new WorkerTransport(config,async()=>Response.json({error:{code:reply,message:'PRIVATE_CONTENT'}},{status:409}));await assert.rejects(()=>client.send('execute',{}),e=>e instanceof Error&&e.message===expected);}
 const huge=new WorkerTransport(config,async()=>new Response('x'.repeat(20000),{status:409}));await assert.rejects(()=>huge.send('execute',{}),/WORKER_EXECUTION_UNAVAILABLE/);
});

test('zero-duration Whisper boundary words share measured neighbouring intervals without losing words',()=>{
 const raw=[{...caption(260,260),text:'The'},{...caption(260,260),text:' next'},{...caption(260,690),text:' word'},{...caption(690,1000),text:' stays'},{...caption(1000,1000),text:' here.'}];
 const saved=JSON.stringify(raw),fixed=boundWhisperCaptions(raw,1);
 assert.equal(JSON.stringify(raw),saved);assert.deepEqual(fixed.map(c=>[c.startMs,c.endMs]),[[260,690],[690,1000]]);assert.equal(fixed.map(c=>c.text.trim()).join(' '),'The next word stays here.');assert.doesNotThrow(()=>validateCaptions(fixed,1));assert.throws(()=>validateCaptions(raw,1));
});

test('unanchored zero-duration words and invalid spans remain rejected',()=>{
 for(const raw of [[caption(0,0)],[caption(100,100),caption(200,500)],[caption(100,90),caption(100,500)],[caption(-1,-1),caption(-1,500)],[caption(0,400),caption(300,300),caption(300,600)]])assert.throws(()=>boundWhisperCaptions(raw,1),RecoverablePipelineError);
});

// Daily application quota is a known provider pause, not an uncertain dispatch.
test('daily provider guard preserves bounded recovery without treating rejection as a lease loss',()=>{
 assert.equal(educationFailureCode(new WorkerTransportError('PROVIDER_DAILY_LIMIT'),'story'),'PROVIDER_UNAVAILABLE');
});

test('incomplete uploads keep their Storage recovery classification across worker transport',async()=>{
 const {WorkerTransport}=await import('../src/worker/transport.ts');
 const config={origin:'http://127.0.0.1:3000',workerId:'c2000000-0000-4000-8000-000000000001',credentialId:'c2000000-0000-4000-8000-000000000002',token:'wkr_'+'a'.repeat(43),expiresAt:'2026-12-01T00:00:00Z'};
 for(const [code,failure] of [['ARTIFACT_UPLOAD_INCOMPLETE','STORAGE_UNAVAILABLE'],['PROVIDER_DAILY_LIMIT','PROVIDER_UNAVAILABLE'],['PRIVATE_RAW_MESSAGE','PIPELINE_FAILED']]){
  const transport=new WorkerTransport(config,async()=>Response.json({error:{code,message:'PRIVATE_RAW_MESSAGE'}},{status:409}));
  await assert.rejects(()=>transport.send('execute',{}),cause=>cause instanceof WorkerTransportError&&educationFailureCode(cause,'render')===failure&&!JSON.stringify(educationFailureDetail(cause)).includes('PRIVATE_RAW_MESSAGE'));
 }
});
