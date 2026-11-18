import {PreferencesSchema} from '../shared/contracts/common.ts';
/** Test-only recovery of this task's public hydroelectric fixture, never user media. */
import path from 'node:path';
import {readFile,mkdir,copyFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {z} from 'zod';
import {hash,fileHash,safeRun,writeJson,readJson} from '../src/storage.ts';
import {InputSchema,StoryboardSchema,validateWordBudget} from '../src/contracts.ts';
import {validateCaptions,matchWords} from '../src/timing.ts';
import {probe} from '../src/media.ts';
import {GenerationInputSchema} from '../shared/contracts/inputs.ts';
export const fixtureInput=GenerationInputSchema.parse({mode:'education',title:'Hydroelectric explanation',topic:'How a hydroelectric power station converts moving water into electricity',audience:'beginner',intendedUse:'personal-learning',referenceNotes:'Water flowing downhill turns a turbine. The turbine drives a generator. The generator converts mechanical energy into electrical energy; energy is not created from nothing.',sources:[]});
const captionsSchema=z.array(z.object({text:z.string(),startMs:z.number(),endMs:z.number(),timestampMs:z.number().nullable(),confidence:z.number().nullable()}));
export async function seedEducationFixture(sourceId:string,assignment:{jobId:string;input:{inputHash:string;manifest:{input:unknown;preferences:unknown}}}){
 if(!/^web-[a-f0-9-]{36}$/.test(sourceId))throw Error('Invalid fixture run');const source=safeRun(sourceId),run=safeRun(`web-${assignment.jobId}`),env=parseEnv(await readFile('.env','utf8'));
 const current=GenerationInputSchema.parse(assignment.input.manifest.input);if(current.mode!=='education')throw Error('Education fixture required');if(hash(current)!==hash(fixtureInput)||PreferencesSchema.parse(assignment.input.manifest.preferences).targetSeconds!==75||PreferencesSchema.parse(assignment.input.manifest.preferences).voiceProfileId!=='Kore')throw Error('Only the exact public verification fixture may use this cache');
 const plan=StoryboardSchema.parse((await readJson<{value:unknown}>(path.join(source,'story-0.json'))).value);validateWordBudget(plan,75);
 const input=InputSchema.parse({topic:current.topic,audience:current.mode==='education'?current.audience:'beginner',durationSeconds:75,format:PreferencesSchema.parse(assignment.input.manifest.preferences).orientation,referenceNotes:current.mode==='education'?current.referenceNotes:'',brief:current.brief,learningObjective:current.mode==='education'?current.learningObjective:undefined});
 const planHash=hash({input,inputHash:assignment.input.inputHash,calibration:0,wordTarget:Math.round(75*2.15),model:env.GEMINI_PLANNER_MODEL,version:1});await mkdir(run,{recursive:true});
 await writeJson(path.join(run,'story-0.json'),{key:hash({planHash}),value:plan});
 for(const scene of plan.scenes){
  const name=`${scene.id}-gemini-0`,from=path.join(source,name),to=path.join(run,name),audio=path.join(from,'public','narration.wav');
  const meta=await readJson<{fingerprint:string;audioHash:string;duration:number}>(path.join(from,'voice.json'));
  if(meta.fingerprint!==hash({scene,provider:'gemini',voice:'Kore',model:env.GEMINI_TTS_MODEL,version:1})||meta.audioHash!==await fileHash(audio))throw Error('Fixture voice provenance mismatch');
  const measured=(await probe(audio)).duration;if(Math.abs(measured-meta.duration)>.01)throw Error('Fixture duration mismatch');
  const captions=validateCaptions(captionsSchema.parse(await readJson(path.join(from,'whisper-raw.json'))).filter(c=>c.text.trim()),measured);matchWords(scene.narration,captions);
  const raw=await readJson<{mouthCues:{start:number;end:number;value:string}[]}>(path.join(from,'mouth-cues.json'));const cues=raw.mouthCues;let end=0;for(const cue of cues){if(!Number.isFinite(cue.start)||!Number.isFinite(cue.end)||cue.start<end-.02||cue.end<=cue.start||cue.end>measured+.15||!['A','B','C','D','E','F','G','H','X'].includes(cue.value))throw Error('Fixture cue mismatch');end=cue.end;}
  await mkdir(path.join(to,'public'),{recursive:true});await copyFile(audio,path.join(to,'public','narration.wav'));await writeJson(path.join(to,'voice.json'),{...meta,captions,cues,analysisHash:hash({captions,cues,duration:meta.duration})});
 }
 await writeJson(path.join(run,'verification-provenance.json'),{sourceRun:sourceId,reason:'Render-only visual/coordination verification; original public-topic Gemini speech and measured timing reused.',providerCalls:0});
}
