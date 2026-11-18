import assert from 'node:assert/strict';
import path from 'node:path';
import {access,copyFile,mkdir,readFile,stat,statfs,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {ffmpeg,runTool,probe,normalizeAudio,captionAudio,mouthCues,browserPath,findRhubarb} from '../src/media.ts';
import {renderVideo} from '../src/render.ts';
import {freeWorkerMemory,renderConcurrency} from '../src/worker/resources.ts';
import {validateVideoProps} from '../src/contracts.ts';
import {withJobWorkspace} from '../src/maintenance/workspaces.ts';

// Offline acceptance only: no queue connection, provider configuration, synthesis or uploads.
globalThis.fetch=async()=>{throw Error('Network calls forbidden in offline acceptance');};
for(const name of ['GEMINI_API_KEY','ELEVENLABS_API_KEY','SUPABASE_SERVICE_ROLE_KEY'])assert(!process.env[name],'Do not supply credentials to offline acceptance');
assert.equal(process.platform,'linux');assert.equal(process.arch,'x64');assert.notEqual(process.getuid?.(),0);
for(const forbidden of ['/app/.env','/app/.git','/app/apps','/app/.cache/worker/connection.json'])await assert.rejects(access(forbidden));
const out=path.resolve('.cache/container-check');await mkdir(path.join(out,'public'),{recursive:true});
const started=performance.now(),stages:Record<string,number>={};
async function stage<T>(name:string,fn:()=>Promise<T>){const at=performance.now();console.log(name+': starting');const value=await fn();stages[name]=Math.round(performance.now()-at);console.log(name+': passed');return value;}
const version=(await runTool(ffmpeg,['-version'])).stdout.split('\n')[0];
assert(await browserPath());assert(await findRhubarb());
const browser=(await runTool((await browserPath())!,['--version'])).stdout.trim();
const sample='/fixtures/Kore.wav',bytes=await readFile(sample);
assert.equal(createHash('sha256').update(bytes).digest('hex'),'a313b2008734f49b911c92bb662027bb6a23c5b7e057f2ced18e663074f6d56b','Use only the previously approved Education voice excerpt');
const source=path.join(out,'public/excerpt.wav');await normalizeAudio(sample,source);
const duration=(await probe(source)).duration;assert(Math.abs(duration-12)<0.1);
const captions=await stage('whisper',()=>captionAudio(source));assert(captions.length>5);assert(captions.some(c=>/water|hydroelectric|power/i.test(c.text)));
const cues=await stage('rhubarb',()=>mouthCues(source,'Welcome! Today we are exploring how a hydroelectric power station turns the natural movement of water into the electricity that powers our homes.',out));assert(cues.some(c=>c.value!=='X'));
await runTool(ffmpeg,['-y','-v','error','-stream_loop','4','-i',source,'-t','60',path.join(out,'public/narration.wav')]);
const repeatedCaptions=Array.from({length:5},(_,i)=>captions.map(c=>({...c,startMs:c.startMs+i*12000,endMs:c.endMs+i*12000}))).flat();
const repeatedCues=Array.from({length:5},(_,i)=>cues.map(c=>({...c,start:c.start+i*12,end:c.end+i*12}))).flat();
const outputs=[];
const fixture={jobId:randomUUID(),projectId:randomUUID(),revisionId:randomUUID()};
for(const format of ['landscape','portrait'] as const){
 const props=validateVideoProps({title:'Offline Linux worker verification',visualStyle:'education-light',format,durationFrames:1800,audioFile:'narration.wav',burnedCaptions:true,captions:repeatedCaptions,mouthCues:repeatedCues,scenes:Array.from({length:4},(_,i)=>({startFrame:i*450,durationFrames:450,plan:{id:`scene-${i+1}`,title:['Stored energy','Moving water','Turning a turbine','Generating electricity'][i],narration:'Repeated cached excerpt: tool verification, not a new AI-generated video.',layout:i===0?'intro':i===3?'recap':'process',keyPoints:['Synthetic timing and layout fixture','No AI requests made'],diagramNodes:['Water','Turbine','Generator'],teacherGesture:'point'}}))});
 const result=await stage('render-'+format,()=>withJobWorkspace(process.cwd(),fixture,async run=>{
  await mkdir(path.join(run,'public'),{recursive:true});await copyFile(path.join(out,'public/narration.wav'),path.join(run,'public/narration.wav'));
  const rendered=await renderVideo(run,props,false,true);assert(rendered);
  await assert.rejects(access(path.join(run,'.render-bundle')),'Private copied-audio bundle must be removed');
  const saved=path.join(out,path.basename(rendered.output));await copyFile(rendered.output,saved);return{...rendered,output:saved};
 }));assert(result);
 await stage('decode-'+format,()=>runTool(ffmpeg,['-xerror','-v','error','-i',result.output,'-f','null','-'],300000));
 const stream=(await probe(result.output)).streams.find(s=>s.codec_type==='video') as {r_frame_rate?:string;codec_name?:string};
 assert.equal(stream.r_frame_rate,'30/1');assert.equal(stream.codec_name,'h264');
 outputs.push({format,...result,output:path.basename(result.output)});
}
const disk=await statfs(out,{bigint:true});let cgroupPeak:string|null=null,cpu:string|null=null;
try{cgroupPeak=(await readFile('/sys/fs/cgroup/memory.peak','utf8')).trim();cpu=(await readFile('/sys/fs/cgroup/cpu.stat','utf8')).trim();}catch{}
const report={kind:'offline-cached-audio-synthetic-scenes',platform:process.platform,arch:process.arch,node:process.versions.node,ffmpeg:version,browser,configuredFrameWorkers:renderConcurrency(),freeMemoryBytes:freeWorkerMemory(),cgroupPeakBytes:cgroupPeak,cpu,freeDiskBytes:String(disk.bavail*disk.bsize),excerptBytes:(await stat(sample)).size,captionCount:captions.length,mouthCueCount:cues.length,stagesMs:stages,totalMs:Math.round(performance.now()-started),outputs};
await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
