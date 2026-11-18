import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sceneTimeline} from '../src/worker/education.ts';
import {StoryboardSchema} from '../src/contracts.ts';
import {WorkerOperationSchema,EducationVerificationSchema} from '../shared/contracts/execution.ts';
import {providerRequest} from '../src/providers.ts';
const plan=StoryboardSchema.parse({title:'Energy',learningObjective:'Energy changes form.',factualCautions:[],scenes:[0,1,2,3].map(i=>({id:`scene-${i+1}`,title:'Energy',narration:'Energy changes form.',layout:i===0?'intro':i===3?'recap':'explain',keyPoints:['Energy'],diagramNodes:['Input','Output'],teacherGesture:'explain'}))});
const part=(duration:number)=>({duration,captions:[{text:'Energy',startMs:0,endMs:200,timestampMs:0,confidence:null},{text:'changes',startMs:200,endMs:400,timestampMs:200,confidence:null},{text:'form.',startMs:400,endMs:700,timestampMs:400,confidence:null}],cues:[{start:0,end:.7,value:'A'}]});
test('Education scenes use measured durations and offset real captions/cues in both orientations',()=>{
 for(const format of ['landscape','portrait'] as const){const props=sceneTimeline(plan,[part(14.9),part(15.1),part(15),part(15)],60,format);assert.equal(props.durationFrames,1800);assert.equal(props.scenes[1].startFrame,447);assert.equal(props.mouthCues[1].start,14.9);assert.equal(props.captions[1].startMs,14900);assert.equal(props.audioFile,'narration.wav');assert.equal(props.burnedCaptions,false);}
 assert.throws(()=>sceneTimeline(plan,[part(10)],60,'portrait'),/SCENE_SET_INCOMPLETE/);assert.throws(()=>sceneTimeline(plan,[part(30),part(30),part(30),part(30)],60,'landscape'),/DURATION_REPAIR_REQUIRED/);
});
test('Execution schemas reject arbitrary paths, forged verification and unconstrained uploads',()=>{
 assert.equal(WorkerOperationSchema.safeParse({type:'allocate',key:'../escape',kind:'video',bytes:10,checksum:'a'.repeat(64)}).success,false);assert.equal(WorkerOperationSchema.safeParse({type:'read',assetId:'https://example.invalid/private'}).success,false);assert.equal(WorkerOperationSchema.safeParse({type:'allocate',key:'video',kind:'video',bytes:52428801,checksum:'a'.repeat(64)}).success,false);
 assert.equal(EducationVerificationSchema.safeParse({version:1,orientation:'portrait',durationMs:60000,width:1280,height:720,fps:30,fullDecode:true,audio:true,sceneCount:4,captionCount:4,mouthCueCount:4,coverage:1,provider:'gemini',voice:'Kore'}).success,false);
});
test('Every actual provider retry requires a separate dispatch grant and records a known outcome',async()=>{
 const old=globalThis.fetch;let calls=0,grants=0;const outcomes:string[]=[];
 globalThis.fetch=async()=>++calls===1?new Response('{}',{status:503}):Response.json({ok:true});
 try{const result=await providerRequest('Gemini','https://example.invalid',{},{} ,{beforeDispatch:async()=>String(++grants),afterDispatch:async(id,status)=>{outcomes.push(id+':'+status);}});assert.equal(result.ok,true);assert.equal(grants,2);assert.deepEqual(outcomes,['1:failed','2:succeeded']);}finally{globalThis.fetch=old;}
});
test('A rejected dispatch grant prevents network access entirely',async()=>{
 const old=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({});};try{await assert.rejects(()=>providerRequest('Gemini','https://example.invalid',{},{} ,{beforeDispatch:async()=>{throw Error('BUDGET_EXHAUSTED');}}),/BUDGET_EXHAUSTED/);assert.equal(calls,0);}finally{globalThis.fetch=old;}
});

test('fallback recovery matches scene, calibration, voice and model before selecting one provider',async()=>{
 const {restoredNarrationProvider}=await import('../src/worker/education.ts');const {hash}=await import('../src/storage.ts');
 const previous={voice:process.env.ELEVENLABS_VOICE_ID,model:process.env.ELEVENLABS_TTS_MODEL,primary:process.env.GEMINI_TTS_MODEL};
 process.env.ELEVENLABS_VOICE_ID='fixture-fallback';process.env.ELEVENLABS_TTS_MODEL='fixture-model';
 const scene=plan.scenes[1],dependencyHash=hash({scene,provider:'elevenlabs',voice:'fixture-fallback',model:'fixture-model',version:1});
 const cached={stage:'voice',key:scene.id+'-elevenlabs-0',dependencyHash,manifest:{provider:'elevenlabs',voice:'fixture-fallback'},assets:[]};
 const session={saved:(key:string,dependency:string)=>key===cached.key&&dependency===dependencyHash?cached:undefined};
 try{
  assert.equal(restoredNarrationProvider(session,plan.scenes,0),'elevenlabs','Partial fallback checkpoints avoid replaying the primary provider');
  process.env.GEMINI_TTS_MODEL='fixture-primary';
  const primary=plan.scenes.map(scene=>({stage:'voice',key:scene.id+'-gemini-0',dependencyHash:hash({scene,provider:'gemini',voice:'Kore',model:'fixture-primary',version:1}),manifest:{provider:'gemini',voice:'Kore'},assets:[]}));
  const both={saved:(key:string,dependency:string)=>session.saved(key,dependency)??primary.find(c=>c.key===key&&c.dependencyHash===dependency)};
  assert.equal(restoredNarrationProvider(both,plan.scenes,0),'gemini','A full primary set avoids dispatch when fallback is only partial');
  const fallback=plan.scenes.map(scene=>({...cached,key:scene.id+'-elevenlabs-0',dependencyHash:hash({scene,provider:'elevenlabs',voice:'fixture-fallback',model:'fixture-model',version:1})}));
  assert.equal(restoredNarrationProvider({saved:(key,dependency)=>[...fallback,...primary].find(c=>c.key===key&&c.dependencyHash===dependency)},plan.scenes,0),'elevenlabs','A complete selected fallback set is preserved');
  assert.equal(restoredNarrationProvider(session,plan.scenes,1),'gemini');
  assert.equal(restoredNarrationProvider(session,plan.scenes.map(s=>({...s,narration:'A changed explanation.'})),0),'gemini');
  process.env.ELEVENLABS_VOICE_ID='changed-voice';assert.equal(restoredNarrationProvider(session,plan.scenes,0),'gemini');
  process.env.ELEVENLABS_VOICE_ID='fixture-fallback';process.env.ELEVENLABS_TTS_MODEL='changed-model';assert.equal(restoredNarrationProvider(session,plan.scenes,0),'gemini');
  process.env.ELEVENLABS_TTS_MODEL='fixture-model';cached.manifest.provider='gemini';assert.throws(()=>restoredNarrationProvider(session,plan.scenes,0),/VOICE_CACHE_INVALID/);
 }finally{for(const [key,value] of [['ELEVENLABS_VOICE_ID',previous.voice],['ELEVENLABS_TTS_MODEL',previous.model],['GEMINI_TTS_MODEL',previous.primary]])if(value===undefined)delete process.env[key!];else process.env[key!]=value;}
});
