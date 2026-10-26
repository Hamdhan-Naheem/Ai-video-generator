import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {InputSchema,StoryboardSchema,Storyboard,validateVideoProps} from '../src/contracts.js';
import {classify,fallbackEligible,ProviderError,speak,providerRequest} from '../src/providers.js';
import {safeRun,checkpoint} from '../src/storage.js';
import {captionGroups,exportCaptions,matchWords,providerCaptions,timeline,validateCaptions} from '../src/timing.js';

test('rejects unsupported durations, unknown input and path traversal',()=>{
  assert.equal(InputSchema.safeParse({topic:'Water power',audience:'beginners',durationSeconds:30,format:'landscape'}).success,false);
  assert.equal(InputSchema.safeParse({topic:'Water power',audience:'beginners',durationSeconds:60,format:'square'}).success,false);
  assert.throws(()=>safeRun('../private'));
});
test('fallback only on quota/service/connection, never authorization or request errors',()=>{
  assert.equal(classify(429),'quota');assert.ok(fallbackEligible(new ProviderError('test',429,'quota')));
  assert.equal(fallbackEligible(new ProviderError('test',403,'authentication')),false);
  assert.equal(fallbackEligible(new ProviderError('test',400,'request')),false);
  assert.equal(fallbackEligible(new Error('safety refusal')),false);
});
test('provider character timings become measured words, not guessed equal intervals',()=>{
  const c=providerCaptions({characters:['H','i',' ','t','o'],character_start_times_seconds:[0,.1,.2,.7,.8],character_end_times_seconds:[.1,.2,.3,.8,1]});
  assert.equal(c.length,2);assert.equal(c[1].startMs,700);assert.equal(c[1].endMs,1000);
  assert.throws(()=>providerCaptions({characters:['a'],character_start_times_seconds:[],character_end_times_seconds:[]}));
});
test('captions reject overlap and out-of-bounds values; exports preserve actual timing',()=>{
  const c=[{text:'Water flows.',startMs:1200,endMs:2500,timestampMs:null,confidence:null}];
  assert.match(exportCaptions(c),/00:00:01,200 --> 00:00:02,500/);
  assert.match(exportCaptions(c,true),/^WEBVTT/);
  assert.throws(()=>validateCaptions([...c,{...c[0],startMs:2000,endMs:2600}],4));
  assert.throws(()=>validateCaptions(c,1));
});
test('script alignment fails when actual speech omits material content',()=>{
  assert.throws(()=>matchWords('Water spins the turbine and the turbine drives the generator',[{text:'hello there',startMs:0,endMs:2000,timestampMs:null,confidence:null}]));
});
test('checkpoints reuse only matching keys and valid saved data',async()=>{
  const run=await mkdtemp(path.join(os.tmpdir(),'video-checkpoint-'));let calls=0;
  const validate=(v:unknown)=>{if(typeof v!=='number')throw new Error('Invalid');return v;};
  try{
    await checkpoint(run,'test',{voice:'A'},validate,async()=>++calls);
    await checkpoint(run,'test',{voice:'A'},validate,async()=>++calls);assert.equal(calls,1);
    await checkpoint(run,'test',{voice:'B'},validate,async()=>++calls);assert.equal(calls,2);
  }finally{await rm(run,{recursive:true,force:true});}
});
test('storyboard rejects duplicate scene IDs and invalid narrative structure',()=>{
  const scene={id:'scene-1',title:'Title',narration:'Water flows through a turbine.',layout:'intro',keyPoints:['Water moves'],diagramNodes:['Water','Turbine'],teacherGesture:'explain'};
  assert.equal(StoryboardSchema.safeParse({title:'Water',learningObjective:'Understand generation',factualCautions:[],scenes:[scene,scene,scene,{...scene,layout:'recap'}]}).success,false);
});
test('timeline uses measured scene boundaries and rejects excessive narration duration',()=>{
  const text=['Water flows','Turbine turns','Generator works','Energy changes'];
  const scenes=text.map((narration,i)=>({id:`scene-${i+1}`,title:narration,narration,layout:(i===0?'intro':i===3?'recap':'process') as 'intro'|'recap'|'process',keyPoints:['Follow the energy'],diagramNodes:['Input','Output'],teacherGesture:'explain' as const}));
  const plan:Storyboard={title:'Water energy',learningObjective:'Understand energy conversion',factualCautions:[],scenes};
  const captions=text.map((text,i)=>({text,startMs:i*15000,endMs:i*15000+13000,timestampMs:null,confidence:null}));
  const result=timeline(plan,captions,59,60);assert.equal(result.durationFrames,1800);assert.equal(result.scenes[1].startFrame,450);assert.equal(result.coverage,1);
  assert.throws(()=>timeline(plan,captions,70,60));assert.throws(()=>timeline(plan,captions,30,60));
});
test('render input rejects remote media paths and inconsistent frame coverage',()=>{
  const scene={id:'scene-1',title:'Test',narration:'Fixture text',layout:'intro',keyPoints:['Water moves'],diagramNodes:['Input','Output'],teacherGesture:'welcome'};
  const props={title:'Fixture',format:'landscape',durationFrames:1800,audioFile:'narration.wav',scenes:[{plan:scene,startFrame:0,durationFrames:1800}],captions:[],mouthCues:[],burnedCaptions:false};
  assert.equal(validateVideoProps(props).durationFrames,1800);
  assert.throws(()=>validateVideoProps({...props,audioFile:'https://example.invalid/media.wav'}));
  assert.throws(()=>validateVideoProps({...props,scenes:[{plan:scene,startFrame:20,durationFrames:1780}]}));
});
test('automatic speech fallback is bounded and returns one consistent provider track (mock HTTP)',async()=>{
  const originalFetch=globalThis.fetch;
  const settings={GEMINI_API_KEY:'fixture',GEMINI_TTS_MODEL:'fixture-tts',ELEVENLABS_API_KEY:'fixture',ELEVENLABS_VOICE_ID:'fixture-voice',ELEVENLABS_FALLBACK_ENABLED:'true'};
  const previous=Object.fromEntries(Object.keys(settings).map(k=>[k,process.env[k]]));Object.assign(process.env,settings);
  let calls=0;
  globalThis.fetch=async(url)=>{calls++;return String(url).includes('generativelanguage')?new Response('{}',{status:503}):Response.json({audio_base64:Buffer.alloc(600).toString('base64')});};
  try{const result=await speak('This is a mock routing test.',60);assert.equal(result.provider,'elevenlabs');assert.equal(result.voice,'fixture-voice');assert.equal(calls,3);}
  finally{globalThis.fetch=originalFetch;for(const [k,v]of Object.entries(previous)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});
test('speech authentication failures stop without trying another provider (mock HTTP)',async()=>{
  const originalFetch=globalThis.fetch;const previous=process.env.GEMINI_API_KEY;const model=process.env.GEMINI_TTS_MODEL;process.env.GEMINI_API_KEY='fixture';process.env.GEMINI_TTS_MODEL='fixture';let calls=0;
  globalThis.fetch=async()=>{calls++;return new Response('{}',{status:401});};
  try{await assert.rejects(()=>speak('Mock authentication test.',60),e=>e instanceof ProviderError&&e.kind==='authentication');assert.equal(calls,1);}
  finally{globalThis.fetch=originalFetch;if(previous===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=previous;if(model===undefined)delete process.env.GEMINI_TTS_MODEL;else process.env.GEMINI_TTS_MODEL=model;}
});
test('malformed provider responses are sanitized instead of leaking raw response text',async()=>{
  const originalFetch=globalThis.fetch;globalThis.fetch=async()=>new Response('PRIVATE_FIXTURE',{status:200});
  try{await assert.rejects(()=>providerRequest('Fixture','https://example.invalid',{},{}),e=>e instanceof ProviderError&&e.kind==='invalid-response'&&!e.message.includes('PRIVATE_FIXTURE'));}
  finally{globalThis.fetch=originalFetch;}
});

test('interrupted response bodies are connection failures, malformed JSON remains invalid (mock HTTP)',async()=>{
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>{const response=new Response('{}',{status:200});response.json=async()=>{throw new DOMException('fixture timeout','TimeoutError');};return response;};
  try{await assert.rejects(()=>providerRequest('Fixture','https://example.invalid',{},{}),e=>e instanceof ProviderError&&e.kind==='connection'&&fallbackEligible(e));}
  finally{globalThis.fetch=originalFetch;}
});
