import {withJobWorkspace} from '../maintenance/workspaces.ts';
import {root} from '../storage.js';
import {freeWorkerMemory} from './resources.ts';
import {WorkerAssignmentSchema,type WorkerAssignment} from '../../shared/contracts/worker.ts';
import path from 'node:path';
import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {z} from 'zod';
import {WorkerExecutionReplySchema,EducationVerificationSchema,type WorkerOperation} from '../../shared/contracts/execution.ts';
import {InputSchema,StoryboardSchema,validateWordBudget,validateSceneVisuals,validateVideoProps,type Caption,type MouthCue,type Storyboard,type VideoProps} from '../contracts.js';
import {planEducation,speak,speakElevenLabs,required,PlanningRecoverySchema,type ProviderHooks} from '../providers.js';
import {safeRun,checkpoint,writeJson,hash,fileHash,exists,readJson} from '../storage.js';
import {ffmpeg,runTool,normalizeAudio,captionAudio,mouthCues,probe} from '../media.js';
import {validateCaptions,providerCaptions,matchWords,captionGroups,exportCaptions} from '../timing.js';
import {renderVideo} from '../render.js';
import {WorkerTransport,WorkerTransportError,LeaseGuard} from './transport.js';

const captionSchema=z.array(z.object({text:z.string(),startMs:z.number(),endMs:z.number(),timestampMs:z.number().nullable(),confidence:z.number().nullable()}));
const cueSchema=z.array(z.object({start:z.number().nonnegative(),end:z.number().positive(),value:z.enum(['A','B','C','D','E','F','G','H','X'])})).min(1);
type SavedCheckpoint={stage:string;key:string;dependencyHash:string;manifest:Record<string,unknown>;assets:string[]};
const health=async()=>{const {statfs}=await import('node:fs/promises');return{executionReady:true,freeDiskBytes:((await statfs(process.cwd(),{bigint:true})).bavail*(await statfs(process.cwd(),{bigint:true})).bsize).toString(),freeMemoryBytes:String(freeWorkerMemory()),toolVersions:{node:process.versions.node}};};
export interface ExecutionAuthority {readonly controller:AbortController;assertActive():void;stop():void}
export class EducationSession{
 lastOperation='initializing';lastStage='understand';readonly run:string;private checkpoints:SavedCheckpoint[]=[];
 constructor(readonly client:WorkerTransport,readonly assignment:WorkerAssignment,readonly instanceId:string,readonly guard:ExecutionAuthority){this.run=safeRun(`web-${assignment.jobId}`);}
 async operation(operation:WorkerOperation){this.lastOperation=operation.type;if(operation.type==='progress')this.lastStage=operation.stage;this.guard.assertActive();const response=WorkerExecutionReplySchema.parse(await this.client.send('execute',{instanceId:this.instanceId,jobId:this.assignment.jobId,leaseToken:this.assignment.leaseToken,health:await health(),operation},this.guard.controller.signal));if(operation.type!=='complete'&&operation.type!=='fail')this.guard.assertActive();return response.value;}
 async restore(){const value=await this.operation({type:'state'});this.checkpoints=z.array(z.object({id:z.uuid(),stage:z.string(),key:z.string(),dependencyHash:z.string(),manifest:z.record(z.string(),z.unknown()),assets:z.array(z.uuid())})).parse(value.checkpoints);}
 saved(key:string,dependencyHash:string){return this.checkpoints.find(c=>c.key===key&&c.dependencyHash===dependencyHash);}
 async save(stage:'understand'|'story'|'voice'|'render',key:string,dependencyHash:string,manifest:Record<string,any>,assetIds:string[]=[]){await this.operation({type:'checkpoint',stage,key,dependencyHash,manifest,assetIds});this.checkpoints.push({stage,key,dependencyHash,manifest,assets:assetIds});}
 private storageUrl(raw:unknown){const u=new URL(z.string().parse(raw));if(u.username||u.password||!u.pathname.startsWith('/storage/v1/')||(u.protocol!=='https:'&&u.origin!=='http://127.0.0.1:55421'))throw Error('INVALID_ARTIFACT_URL');return u;}
 async upload(file:string,key:string,kind:'audio'|'alignment'|'mouth_cues'|'timeline'|'thumbnail'|'video'|'report'|'captions_srt'|'captions_vtt'){
  this.guard.assertActive();const size=(await stat(file)).size;if(size<1||size>52428800)throw Error('ARTIFACT_SIZE_INVALID');const bytes=await readFile(file),checksum=createHash('sha256').update(bytes).digest('hex');
  const allocation=await this.operation({type:'allocate',key,kind,bytes:size,checksum});
  if(allocation.state==='allocated'){
   // Validate before the transfer catch: invalid grants are not network failures.
   const url=this.storageUrl(allocation.uploadUrl);this.guard.assertActive();
   try{
    const response=await fetch(url,{method:'PUT',headers:{'Content-Type':String(allocation.mime),'x-upsert':'false'},body:bytes,redirect:'error',signal:AbortSignal.any([this.guard.controller.signal,AbortSignal.timeout(90000)])});
    await response.body?.cancel();
   }catch{
    // Storage may have accepted the bytes. Never overwrite or repeat the PUT here.
    this.guard.assertActive();
   }
  }
  this.guard.assertActive();
  try{await this.operation({type:'confirm',assetId:String(allocation.assetId)});}
  catch(error){
   this.guard.assertActive();
   // Preserve authoritative lease/auth/integrity failures; only infrastructure is retryable.
   if(error instanceof TypeError||error instanceof DOMException&&['TimeoutError','AbortError'].includes(error.name)||error instanceof WorkerTransportError&&error.code==='WORKER_UNAVAILABLE')throw Error('ARTIFACT_UPLOAD_FAILED');
   throw error;
  }
  return String(allocation.assetId);
 }
 async download(assetId:string,destination:string){const descriptor=await this.operation({type:'read',assetId});const response=await fetch(this.storageUrl(descriptor.url),{redirect:'error',signal:AbortSignal.any([this.guard.controller.signal,AbortSignal.timeout(90000)])});if(!response.ok||!response.body)throw Error('ARTIFACT_READ_FAILED');const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>52428800||size>Number(descriptor.bytes)){await reader.cancel();throw Error('ARTIFACT_READ_INVALID');}chunks.push(part.value);}const bytes=Buffer.concat(chunks);if(bytes.length!==Number(descriptor.bytes)||createHash('sha256').update(bytes).digest('hex')!==descriptor.checksum)throw Error('ARTIFACT_HASH_INVALID');this.guard.assertActive();await mkdir(path.dirname(destination),{recursive:true});await writeFile(destination,bytes);}
 hooks(unit:string,allowFallback:boolean):ProviderHooks{return{signal:this.guard.controller.signal,allowFallback,beforeDispatch:async(provider,body)=>{if(process.env.WORKER_PROVIDER_CALLS_ALLOWED==='false')throw Error('CACHE_ONLY_PROVIDER_DISPATCH_BLOCKED');this.guard.assertActive();const requestHash=hash(body),modelId=provider==='Gemini'?required('GEMINI_PLANNER_MODEL'):provider==='Gemini TTS'?required('GEMINI_TTS_MODEL'):process.env.ELEVENLABS_TTS_MODEL||'eleven_flash_v2_5',voiceId=provider==='Gemini TTS'?'Kore':provider==='ElevenLabs'?required('ELEVENLABS_VOICE_ID'):undefined;const value=await this.operation({type:'attempt',nonce:randomUUID(),operationKey:`${unit}:${provider.replaceAll(' ','-')}:${requestHash.slice(0,16)}`,provider:provider as 'Gemini',modelId,voiceId,requestHash});if(value.dispatchAuthorized!==true)throw Error('PROVIDER_RECONCILIATION_REQUIRED');return String(value.attemptId);},afterDispatch:async(attemptId,status)=>{await this.operation({type:'attempt_result',attemptId,status});},repair:async(key)=>{await this.operation({type:'repair',key:`${unit}:${key}`,stage:'story',reason:'PLAN_INVALID'});}};}
}

function narrationCheckpoint(scene:Storyboard['scenes'][number],provider:'gemini'|'elevenlabs',calibration:number,voice:string,model:string){
 return{key:`${scene.id}-${provider}-${calibration}`,fingerprint:hash({scene,provider,voice,model,version:1})};
}
/** A fallback checkpoint selects the provider for the whole scene set on retry. */
export function restoredNarrationProvider(session:Pick<EducationSession,'saved'>,scenes:Storyboard['scenes'],calibration:number):'gemini'|'elevenlabs'{
 const voice=process.env.ELEVENLABS_VOICE_ID;if(!voice)return 'gemini';
 const model=process.env.ELEVENLABS_TTS_MODEL||'eleven_flash_v2_5';
 const compatible=(scene:Storyboard['scenes'][number],provider:'gemini'|'elevenlabs',selectedVoice:string,selectedModel:string)=>{
  const identity=narrationCheckpoint(scene,provider,calibration,selectedVoice,selectedModel),cached=session.saved(identity.key,identity.fingerprint);
  if(!cached)return false;
  if(cached.stage!=='voice'||cached.manifest.provider!==provider||cached.manifest.voice!==selectedVoice)throw Error('VOICE_CACHE_INVALID');
  return true;
 };
 const fallbackCount=scenes.filter(scene=>compatible(scene,'elevenlabs',voice,model)).length;
 if(!fallbackCount)return 'gemini';
 if(fallbackCount===scenes.length)return 'elevenlabs';
 const primaryModel=process.env.GEMINI_TTS_MODEL;
 if(primaryModel&&scenes.every(scene=>compatible(scene,'gemini','Kore',primaryModel)))return 'gemini';
 return 'elevenlabs';
}

/** Joins measured scene boundaries, never divides an invented full-track clock. */
export function sceneTimeline(plan:Storyboard,parts:{duration:number;captions:Caption[];cues:MouthCue[]}[],target:number,format:'landscape'|'portrait'):VideoProps{
 if(parts.length!==plan.scenes.length)throw Error('SCENE_SET_INCOMPLETE');let frames=0;const captions:Caption[]=[],cues:MouthCue[]=[],scenes:VideoProps['scenes']=[];let coverage=1;
 for(let i=0;i<parts.length;i++){const p=parts[i],durationFrames=Math.ceil(p.duration*30);if(durationFrames<15)throw Error('SCENE_DURATION_INVALID');coverage=Math.min(coverage,matchWords(plan.scenes[i].narration,p.captions).coverage);scenes.push({plan:plan.scenes[i],startFrame:frames,durationFrames});captions.push(...validateCaptions(p.captions,p.duration).map(c=>({...c,startMs:c.startMs+frames/30*1000,endMs:c.endMs+frames/30*1000})));cues.push(...p.cues.map(c=>({...c,start:c.start+frames/30,end:c.end+frames/30})));frames+=durationFrames;}
 if(frames/30<target*.85||frames/30>Math.min(90,target+3))throw Error('DURATION_REPAIR_REQUIRED');const durationFrames=Math.max(target*30,frames);scenes.at(-1)!.durationFrames+=durationFrames-frames;
 return validateVideoProps({visualStyle:'education-light',title:plan.title,format,durationFrames,audioFile:'narration.wav',scenes,captions:captionGroups(captions),mouthCues:cues,burnedCaptions:false});
}

export async function executeEducation(session:EducationSession){session.guard.assertActive();return withJobWorkspace(root,session.assignment,()=>executeEducationLocked(session));}
async function executeEducationLocked(session:EducationSession){
 const assignment=WorkerAssignmentSchema.parse(session.assignment),source=assignment.input.manifest.input,prefs=assignment.input.manifest.preferences;
 if(source.mode!=='education'||source.sources.length||prefs.voiceProfileId!=='Kore')throw Error('EDUCATION_INPUT_INVALID');
 const input=InputSchema.parse({topic:source.topic,audience:source.audience,durationSeconds:prefs.targetSeconds,format:prefs.orientation,referenceNotes:source.referenceNotes??'',brief:source.brief,learningObjective:source.learningObjective});
 if((process.env.GEMINI_VOICE_NAME||'Kore')!=='Kore')throw Error('WORKER_VOICE_CONFIGURATION_MISMATCH');
 await session.restore();await session.operation({type:'progress',stage:'story'});await mkdir(session.run,{recursive:true});const publicDir=path.join(session.run,'public');await mkdir(publicDir,{recursive:true});
 let coverage=1,wordTarget=Math.round(input.durationSeconds*2.15);let plan:Storyboard|undefined,props:VideoProps|undefined,usedProvider:'gemini'|'elevenlabs'='gemini',voice='Kore';
 for(let calibration=0;calibration<2;calibration++){
  await session.operation({type:"progress",stage:"story"});
  const planKey=`story-${calibration}`,planHash=hash({input,inputHash:assignment.input.inputHash,calibration,wordTarget,model:required('GEMINI_PLANNER_MODEL'),version:1});const saved=session.saved(planKey,planHash);
  plan=saved?StoryboardSchema.parse(saved.manifest.plan):await checkpoint(session.run,planKey,{planHash},v=>StoryboardSchema.parse(v),async()=>{
    const rejectionFile=path.join(session.run,planKey+'-validation.json');
    let planningRecovery:ReturnType<typeof PlanningRecoverySchema.parse>|undefined;
    if(await exists(rejectionFile)){
     const marker=z.strictObject({version:z.literal(1),dependencyHash:z.string().regex(/^[a-f0-9]{64}$/),recovery:PlanningRecoverySchema}).parse(await readJson(rejectionFile));
     if(marker.dependencyHash===planHash)planningRecovery=marker.recovery;
    }
    return planEducation(input,wordTarget,{...session.hooks(planKey,false),planningRecovery,onPlanningRejected:async recovery=>{session.guard.assertActive();await writeJson(rejectionFile,{version:1,dependencyHash:planHash,recovery});session.guard.assertActive();}});
   });
  validateWordBudget(plan,input.durationSeconds);validateSceneVisuals(plan.scenes);await session.operation({type:'plan',dependencyHash:planHash,modelId:required('GEMINI_PLANNER_MODEL'),plan});
  if(!saved)await session.save('story',planKey,planHash,{plan:JSON.parse(JSON.stringify(plan))});
  let parts:{duration:number;captions:Caption[];cues:MouthCue[]}[]=[];
  const restoredProvider=restoredNarrationProvider(session,plan.scenes,calibration);
  if(restoredProvider==='elevenlabs'&&source.intendedUse!=='personal-learning')throw Error('NARRATION_UNAVAILABLE');
  for(let providerPass=restoredProvider==='elevenlabs'?1:0;providerPass<2;providerPass++){
   await session.operation({type:"progress",stage:"voice",completedScenes:0,totalScenes:plan.scenes.length});
   parts=[];usedProvider=providerPass?'elevenlabs':'gemini';voice=providerPass?required('ELEVENLABS_VOICE_ID'):'Kore';let restart=false;
   for(const scene of plan.scenes){
    session.guard.assertActive();const {key,fingerprint}=narrationCheckpoint(scene,usedProvider,calibration,voice,providerPass?(process.env.ELEVENLABS_TTS_MODEL||'eleven_flash_v2_5'):required('GEMINI_TTS_MODEL'));const directory=path.join(session.run,key);await mkdir(path.join(directory,'public'),{recursive:true});const audio=path.join(directory,'public','narration.wav'),cached=session.saved(key,fingerprint);
    let duration:number,captions:Caption[],cues:MouthCue[];
    if(cached){await session.download(String(cached.manifest.audio),audio);duration=(await probe(audio)).duration;captions=captionSchema.parse(cached.manifest.captions);cues=cueSchema.parse(cached.manifest.cues);}
    else{
     const metadata=path.join(directory,'voice.json');let alignment:Parameters<typeof providerCaptions>[0]|undefined;
     if(await exists(audio)&&await exists(metadata)){const meta=await readJson<{fingerprint:string;audioHash:string;duration:number;alignment?:typeof alignment}>(metadata);if(meta.fingerprint!==fingerprint||meta.audioHash!==await fileHash(audio))throw Error('VOICE_CACHE_INVALID');duration=meta.duration;alignment=meta.alignment;}
     else{if(providerPass&&process.env.ELEVENLABS_FALLBACK_ENABLED!=='true')throw Error('NARRATION_UNAVAILABLE');const hooks=session.hooks(key,source.intendedUse==='personal-learning');const speech=providerPass?await speakElevenLabs(scene.narration,hooks):await speak(scene.narration,prefs.targetSeconds/plan.scenes.length,'education',hooks);if(speech.provider==='elevenlabs'&&!providerPass){const fallbackDir=path.join(session.run,`${scene.id}-elevenlabs-${calibration}`);await mkdir(path.join(fallbackDir,'public'),{recursive:true});const rawFallback=path.join(fallbackDir,'source.mp3'),fallbackAudio=path.join(fallbackDir,'public','narration.wav');await writeFile(rawFallback,speech.bytes);const fallbackDuration=await normalizeAudio(rawFallback,fallbackAudio);await writeJson(path.join(fallbackDir,'voice.json'),{fingerprint:narrationCheckpoint(scene,'elevenlabs',calibration,speech.voice,process.env.ELEVENLABS_TTS_MODEL||'eleven_flash_v2_5').fingerprint,audioHash:await fileHash(fallbackAudio),duration:fallbackDuration,alignment:speech.alignment});restart=true;break;}const raw=path.join(directory,speech.mime.includes('mpeg')?'source.mp3':'source.wav');await writeFile(raw,speech.bytes);duration=await normalizeAudio(raw,audio);alignment=speech.alignment;await writeJson(metadata,{fingerprint,audioHash:await fileHash(audio),duration,alignment});}
     const meta=await readJson<{captions?:unknown;cues?:unknown;analysisHash?:string}>(metadata);if(meta.captions&&meta.cues&&meta.analysisHash===hash({captions:meta.captions,cues:meta.cues,duration})){captions=validateCaptions(captionSchema.parse(meta.captions),duration);cues=cueSchema.parse(meta.cues);}else{captions=validateCaptions(alignment?providerCaptions(alignment):await captionAudio(audio),duration);cues=cueSchema.parse(await mouthCues(audio,scene.narration,directory));}matchWords(scene.narration,captions);let end=0;for(const cue of cues){if(cue.start<end-.02||cue.end>duration+.15||cue.end<=cue.start)throw Error('CUE_CACHE_INVALID');end=cue.end;}await writeJson(metadata,{...await readJson<Record<string,unknown>>(metadata),captions,cues,analysisHash:hash({captions,cues,duration})});
     const audioAsset=await session.upload(audio,`${key}-audio`,'audio');await session.save('voice',key,fingerprint,{audio:audioAsset,captions:JSON.parse(JSON.stringify(captions)),cues:JSON.parse(JSON.stringify(cues)),duration,provider:usedProvider,voice},[audioAsset]);
    }
    parts.push({duration,captions,cues});
    await session.operation({type:"progress",stage:"voice",completedScenes:parts.length,totalScenes:plan.scenes.length});
   }
   if(!restart)break;if(process.env.ELEVENLABS_FALLBACK_ENABLED!=='true'||source.intendedUse!=='personal-learning')throw Error('NARRATION_UNAVAILABLE');
  }
  coverage=Math.min(...parts.map((p,i)=>matchWords(plan!.scenes[i].narration,p.captions).coverage));
  try{props=sceneTimeline(plan,parts,prefs.targetSeconds,prefs.orientation);}
  catch(error){if(!(error instanceof Error)||error.message!=='DURATION_REPAIR_REQUIRED'||calibration)throw error;wordTarget=Math.round(Math.max(input.durationSeconds*1.8,Math.min(input.durationSeconds*2.5,validateWordBudget(plan,input.durationSeconds)*input.durationSeconds*.96/parts.reduce((sum,p)=>sum+p.duration,0))));await session.operation({type:'repair',key:'duration-calibration',stage:'voice',reason:'DURATION_INVALID'});continue;}
  const args:string[]=[];for(let i=0;i<plan.scenes.length;i++){const file=path.join(session.run,`${plan.scenes[i].id}-${usedProvider}-${calibration}`,'public','narration.wav');args.push('-i',file);}
  const filters=parts.map((part,i)=>`[${i}:a]apad=whole_dur=${Math.ceil(part.duration*30)/30},atrim=duration=${Math.ceil(part.duration*30)/30}[s${i}]`).join(';')+';'+parts.map((_,i)=>`[s${i}]`).join('')+`concat=n=${parts.length}:v=0:a=1[out]`;
  await runTool(ffmpeg,['-y','-v','error',...args,'-filter_complex',filters,'-map','[out]','-ac','1','-ar','16000','-c:a','pcm_s16le',path.join(publicDir,'narration.wav')]);break;
 }
 if(!plan||!props)throw Error('EDUCATION_OUTPUT_INCOMPLETE');props.environment=/\bhydroelectric\b|\bhydropower\b/i.test(source.topic)?'hydroelectric':'generic';session.guard.assertActive();
 const srt=path.join(session.run,'captions.srt'),vtt=path.join(session.run,'captions.vtt');await writeFile(srt,exportCaptions(props.captions));await writeFile(vtt,exportCaptions(props.captions,true));await writeJson(path.join(session.run,'timeline.json'),props);
 await session.operation({type:'progress',stage:'render'});
 const renderHash=hash(props),renderSaved=session.saved(`render-${prefs.orientation}`,renderHash);let output=path.join(session.run,`${prefs.orientation}-clean.mp4`),thumbnail=path.join(session.run,`preview-${prefs.orientation}.png`);
 if(renderSaved){await session.download(String(renderSaved.manifest.video),output);await session.download(String(renderSaved.manifest.thumbnail),thumbnail);}else{session.guard.assertActive();const rendered=await renderVideo(session.run,props,false,true);if(!rendered)throw Error('VIDEO_RENDER_FAILED');output=rendered.output;await renderVideo(session.run,props,true,true);}
 session.guard.assertActive();await runTool(ffmpeg,['-v','error','-xerror','-i',output,'-f','null','-'],300000);const measured=await probe(output);const stream=measured.streams.find(s=>s.codec_type==='video');if(!stream||(stream as typeof stream&{r_frame_rate?:string}).r_frame_rate!=='30/1')throw Error('VIDEO_VERIFICATION_FAILED');
 const report=EducationVerificationSchema.parse({version:1,orientation:prefs.orientation,durationMs:Math.round(measured.duration*1000),width:stream.width,height:stream.height,fps:30,fullDecode:true,audio:measured.streams.some(s=>s.codec_type==='audio'),sceneCount:plan.scenes.length,captionCount:props.captions.length,mouthCueCount:props.mouthCues.length,coverage,provider:usedProvider,voice});
 const reportFile=path.join(session.run,'verification.json');await writeJson(reportFile,report);
 const video=renderSaved?String(renderSaved.manifest.video):await session.upload(output,`video-${prefs.orientation}`,'video'),thumbnailId=renderSaved?String(renderSaved.manifest.thumbnail):await session.upload(thumbnail,`thumbnail-${prefs.orientation}`,'thumbnail');
 if(!renderSaved)await session.save('render',`render-${prefs.orientation}`,renderHash,{video,thumbnail:thumbnailId},[video,thumbnailId]);
 const srtId=await session.upload(srt,'captions-srt','captions_srt'),vttId=await session.upload(vtt,'captions-vtt','captions_vtt'),reportId=await session.upload(reportFile,'verification','report');
 await session.operation({type:'complete',key:'education-clean-v1',video,thumbnail:thumbnailId,srt:srtId,vtt:vttId,report:reportId});
}
