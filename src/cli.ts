import path from 'node:path';
import {mkdir,readFile,writeFile,copyFile,open,unlink} from 'node:fs/promises';
import {z} from 'zod';
import {parseArgs} from 'node:util';
import {InputSchema,StoryboardSchema,Caption,VideoProps,validateWordBudget,validateSceneVisuals} from './contracts.js';
import {checkpoint,event,exists,hash,fileHash,readJson,root,safeRun,writeJson} from './storage.js';
import {planEducation,speak,ProviderError} from './providers.js';
import {captionGroups,exportCaptions,providerCaptions,timeline,validateCaptions} from './timing.js';

const args=process.argv.slice(2);
const parsed=parseArgs({args,allowPositionals:true,strict:true,options:{input:{type:'string'},run:{type:'string'},format:{type:'string'},captions:{type:'boolean'},still:{type:'boolean'}}});
const command=parsed.positionals[0]??'help';
function flag(name:'input'|'run'|'format'){return parsed.values[name];}
let interrupted=false;process.on('SIGINT',()=>{interrupted=true;console.log('Cancellation requested; stopping at the next safe checkpoint.');});
async function checkCancellation(run:string){if(interrupted||await exists(path.join(run,'cancel.json')))throw new Error('Run cancelled; no new result will be published');}

async function main(){
  if(parsed.positionals.length>1)throw new Error('Unexpected positional argument. Use the documented npm aliases, or call Node directly with --run=<id>.');
  if(flag('format')&&!['landscape','portrait'].includes(flag('format')!))throw new Error('Invalid format; choose landscape or portrait before starting generation');
  if(command==='help'){console.log('Commands: doctor | tools | plan --input <json> [--run <id>] | generate --input <json> [--run <id>] [--format portrait|landscape] [--captions] | render --run <id> [--format portrait|landscape] [--captions] [--still] | cancel --run <id>');return;}
  if(command==='doctor')return (await import('./media.js')).doctor();if(command==='tools')return (await import('./media.js')).installTools();
  const runId=flag('run')??`education-${new Date().toISOString().replace(/[:.]/g,'-')}`;const run=safeRun(runId);
  if(command==='cancel'){await writeJson(path.join(run,'cancel.json'),{requestedAt:new Date().toISOString()});console.log('Cancellation recorded. Use a new run ID to start again.');return;}
  if(!['plan','generate','render'].includes(command))throw new Error('Unknown command. Use npm run pipeline -- help');
  if(command==='render'&&!flag('run'))throw new Error('render requires --run');
  await mkdir(run,{recursive:true});
  const lockFile=path.join(run,'.lock');let lock;
  try{lock=await open(lockFile,'wx');await lock.writeFile(JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}));}
  catch{throw new Error('This run is already locked. If the previous process crashed, confirm it has stopped before manually removing its local .lock file.');}
  const started=Date.now();
  try{
    await checkCancellation(run);await writeJson(path.join(run,'status.json'),{state:'running',command,at:new Date().toISOString()});
    if(command==='render'){
      const {renderVideo}=await import('./render.js');
      const saved=await readJson<VideoProps>(path.join(run,'timeline.json'));const format=flag('format')??saved.format;
      if(format!=='portrait'&&format!=='landscape')throw new Error('Invalid format');
      const result=await renderVideo(run,{...saved,format,burnedCaptions:args.includes('--captions')},args.includes('--still'));
      await checkCancellation(run);await writeJson(path.join(run,`render-report-${format}.json`),{mode:'live-artifact-reuse',result,at:new Date().toISOString()});await writeJson(path.join(run,'status.json'),{state:args.includes('--still')?'preview_ready':'ready',at:new Date().toISOString()});console.log(`Render ready: ${run}`);return;
    }
    const inputPath=path.resolve(flag('input')??'examples/education.json');const input=InputSchema.parse(await readJson(inputPath));
    const inputSnapshot=path.join(run,'input.json');
    if(await exists(inputSnapshot)&&hash(await readJson(inputSnapshot))!==hash(input))throw new Error('Run ID already belongs to different input; use a new run ID');
    await writeJson(inputSnapshot,input);await event(run,'understand','validated educational input');
    let plan=await checkpoint(run,'storyboard',{input,model:process.env.GEMINI_PLANNER_MODEL,version:1},v=>{const p=StoryboardSchema.parse(v);validateSceneVisuals(p.scenes,input.visualStyle);return p;},()=>planEducation(input));
    let count=validateWordBudget(plan,input.durationSeconds);await writeFile(path.join(run,'script.txt'),plan.scenes.map(s=>s.narration).join('\n\n'));
    await checkCancellation(run);
    if(command==='plan'){await writeJson(path.join(run,'report.json'),{status:'planned',live:true,wordCount:count,scenes:plan.scenes.length,secondsElapsed:(Date.now()-started)/1000,limitations:['Narration, captions, teacher cues and MP4 are not produced by the plan command.','AI-generated educational facts still need quality review.']});await writeJson(path.join(run,'status.json'),{state:'planned',at:new Date().toISOString()});console.log(`Storyboard ready: ${run}`);return;}
    const {captionAudio,mouthCues,normalizeAudio,probe}=await import('./media.js');const {renderVideo}=await import('./render.js');
    const publicDir=path.join(run,'public');await mkdir(publicDir,{recursive:true});let script=plan.scenes.map(s=>s.narration).join(' ');
    const voiceFingerprint=()=>hash({script,model:process.env.GEMINI_TTS_MODEL,voice:process.env.GEMINI_VOICE_NAME,fallbackModel:process.env.ELEVENLABS_TTS_MODEL,fallbackVoice:process.env.ELEVENLABS_VOICE_ID,version:2});
    let speechKey=voiceFingerprint();
    const speechMetaFile=path.join(run,'speech.json');const audioFile=path.join(publicDir,'narration.wav');
    let speechMeta:{key:string;audioHash:string;provider:string;model:string;voice:string;duration:number;alignment?:Parameters<typeof providerCaptions>[0]};
    for(let calibration=0;;calibration++){
    if(await exists(speechMetaFile)&&await exists(audioFile)&&(await readJson<{key:string;audioHash:string}>(speechMetaFile)).key===speechKey&&(await readJson<{audioHash:string}>(speechMetaFile)).audioHash===await fileHash(audioFile)){speechMeta=await readJson(speechMetaFile);await probe(audioFile);await event(run,'narration','reused');}
    else {
      await event(run,'narration','running');const speech=await speak(script,input.durationSeconds);await checkCancellation(run);
      const rawFile=path.join(run,speech.mime.includes('mpeg')?'narration-source.mp3':'narration-source.wav');await writeFile(rawFile,speech.bytes);
      const duration=await normalizeAudio(rawFile,audioFile);
      speechMeta={key:speechKey,audioHash:await fileHash(audioFile),provider:speech.provider,model:speech.model,voice:speech.voice,duration,alignment:speech.alignment};await writeJson(speechMetaFile,speechMeta);await event(run,'narration','complete');
    }
    if(speechMeta.duration>=input.durationSeconds*.85&&speechMeta.duration<=Math.min(90,input.durationSeconds+3))break;
    const repairFile=path.join(run,'duration-repair.json');
    if(calibration>=1||await exists(repairFile))throw new Error(`Narration duration ${speechMeta.duration.toFixed(1)}s remains unsuitable after bounded correction; review saved script and voice pacing`);
    await checkCancellation(run);await writeJson(repairFile,{at:new Date().toISOString(),previousDuration:speechMeta.duration});
    const desired=Math.round(Math.max(input.durationSeconds*1.8,Math.min(input.durationSeconds*2.5,count*(input.durationSeconds*.96)/speechMeta.duration)));
    await event(run,'storyboard','calibrating narration length to measured voice speed');
    plan=await planEducation(input,desired);count=validateWordBudget(plan,input.durationSeconds);
    const cached=await readJson<{key:string}>(path.join(run,'storyboard.json'));await writeJson(path.join(run,'storyboard.json'),{key:cached.key,value:plan});
    script=plan.scenes.map(s=>s.narration).join(' ');await writeFile(path.join(run,'script.txt'),plan.scenes.map(s=>s.narration).join('\n\n'));speechKey=voiceFingerprint();
    }
    await checkCancellation(run);
    const captions=await checkpoint(run,'alignment',{speechKey,audioHash:speechMeta.audioHash,provider:speechMeta.provider,version:1},v=>validateCaptions(z.array(z.object({text:z.string(),startMs:z.number(),endMs:z.number(),timestampMs:z.number().nullable(),confidence:z.number().nullable()})).parse(v),speechMeta.duration),async()=>speechMeta.alignment?providerCaptions(speechMeta.alignment):captionAudio(audioFile));
    const measured=timeline(plan,captions,speechMeta.duration,input.durationSeconds);const groups=captionGroups(captions);
    await writeFile(path.join(run,'captions.srt'),exportCaptions(groups));await writeFile(path.join(run,'captions.vtt'),exportCaptions(groups,true));
    await checkCancellation(run);
    const mouths=await checkpoint(run,'teacher-cues',{speechKey,audioHash:speechMeta.audioHash,provider:speechMeta.provider,version:1},v=>z.array(z.object({start:z.number().nonnegative(),end:z.number().positive(),value:z.enum(['A','B','C','D','E','F','G','H','X'])})).min(1).parse(v),()=>mouthCues(audioFile,script,run));
    const format=flag('format')??input.format;if(format!=='landscape'&&format!=='portrait')throw new Error('Invalid format');
    const props:VideoProps={title:plan.title,...(input.visualStyle?{visualStyle:input.visualStyle}:{}),format,durationFrames:measured.durationFrames,audioFile:'narration.wav',scenes:measured.scenes,captions:groups,mouthCues:mouths,burnedCaptions:args.includes('--captions')};await writeJson(path.join(run,'timeline.json'),props);
    await checkCancellation(run);await event(run,'render','running');const result=await renderVideo(run,props);await checkCancellation(run);
    await writeJson(path.join(run,'report.json'),{status:'ready',live:true,provider:speechMeta.provider,voice:speechMeta.voice,wordCount:count,transcriptWordCoverage:measured.coverage,result,secondsElapsed:(Date.now()-started)/1000,limitations:['Automated checks do not establish factual accuracy or human-rated caption/lip-sync quality.']});await writeJson(path.join(run,'status.json'),{state:'ready',at:new Date().toISOString()});await event(run,'render','ready');console.log(`Video ready: ${result?.output}`);
  }catch(error){
    const message=error instanceof ProviderError?error.message:error instanceof z.ZodError?'Input or pipeline data failed runtime validation':error instanceof Error?error.message:'Unknown pipeline failure';
    // Only own validated errors are persisted; provider HTTP bodies are never exposed.
    const state=interrupted||message.includes('cancelled')?'cancelled':'failed';await writeJson(path.join(run,'failure.json'),{status:state,message,at:new Date().toISOString()});await writeJson(path.join(run,'status.json'),{state,message,at:new Date().toISOString()});throw new Error(message);
  }finally{await lock.close();await unlink(lockFile);}
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Pipeline failed');process.exitCode=1;});
