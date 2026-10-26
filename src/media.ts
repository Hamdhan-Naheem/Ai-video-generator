import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir, readFile, writeFile, readdir, stat, rename} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import path from 'node:path';
import ffmpegImport from 'ffmpeg-static';
import {installWhisperCpp, transcribe, toCaptions} from '@remotion/install-whisper-cpp';
import {ensureBrowser} from '@remotion/renderer';
import {Caption, MouthCue} from './contracts.js';
import {exists, root, writeJson} from './storage.js';
const execute=promisify(execFile);
export const ffmpeg=ffmpegImport as unknown as string;
const ffprobePath=async()=>((await import('ffprobe-static')).default as unknown as {path:string}).path;
export const whisperPath=path.join(root,'.cache','whisper.cpp');
const whisperVersion='1.6.0';
export async function browserPath(){
  const configured=process.env.REMOTION_BROWSER_EXECUTABLE;if(configured){if(!await exists(configured))throw new Error('Configured browser executable does not exist');return configured;}
  for(const candidate of ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe','C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'])if(await exists(candidate))return candidate;
  return null;
}
export async function runTool(exe:string,args:string[],timeout=180000){
  if(!exe)throw new Error('Missing media executable');
  try{return await execute(exe,args,{windowsHide:true,timeout,maxBuffer:8*1024*1024});}
  catch{throw new Error(`Local media command failed: ${path.basename(exe)}; check tool installation and input compatibility`);}
}
export async function probe(file:string){
  const {stdout}=await runTool(await ffprobePath(),['-v','error','-show_format','-show_streams','-of','json',file]);
  const data=JSON.parse(stdout);const duration=Number(data.format?.duration);
  if(!Number.isFinite(duration)||duration<=0)throw new Error('Media duration is invalid');
  return {duration,streams:data.streams as Array<{codec_type:string;width?:number;height?:number}>};
}
export async function normalizeAudio(source:string,destination:string){
  await runTool(ffmpeg,['-y','-v','error','-i',source,'-ac','1','-ar','16000','-c:a','pcm_s16le',destination]);
  const info=await probe(destination);if(!info.streams.some(s=>s.codec_type==='audio'))throw new Error('Narration has no audio stream');
  const wave=await readFile(destination); let nonZero=0;
  for(let i=44;i+1<wave.length;i+=2)if(Math.abs(wave.readInt16LE(i))>200)nonZero++;
  if(nonZero<100)throw new Error('Narration appears silent');
  return info.duration;
}
export async function findRhubarb(dir=path.join(root,'.cache','rhubarb')):Promise<string|undefined>{
  if(!await exists(dir))return;
  for(const item of await readdir(dir,{withFileTypes:true})){
    if(item.isSymbolicLink())continue;
    const full=path.join(dir,item.name);
    if(item.isFile()&&item.name.toLowerCase()===(process.platform==='win32'?'rhubarb.exe':'rhubarb'))return full;
    if(item.isDirectory()){const result=await findRhubarb(full);if(result)return result;}
  }
}
export async function installTools(){
  if(process.platform!=='win32')throw new Error('Automatic native-tool installer currently supports Windows; configure native tools manually on other systems');
  console.log('Installing Whisper.cpp Windows binary and base.en model (no Python).');
  if(!await exists(path.join(whisperPath,'main.exe'))){
    try{await installWhisperCpp({to:whisperPath,version:whisperVersion,printOutput:false});}
    catch(error){if((error as NodeJS.ErrnoException).code!=='EBUSY'||!await exists(path.join(whisperPath,'main.exe')))throw error;console.log('Whisper extracted; temporary archive cleanup deferred because Windows still holds the file.');}
  }
  if(!await exists(path.join(whisperPath,'main.exe')))throw new Error('Whisper installation did not produce main.exe');
  if(!await findRhubarb()){
    console.log('Downloading Rhubarb from its official GitHub release.');
    const response=await fetch('https://api.github.com/repos/DanielSWolf/rhubarb-lip-sync/releases/latest',{headers:{'User-Agent':'ai-video-generator-prototype'},signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw new Error(`Rhubarb release lookup HTTP ${response.status}`);
    const release=await response.json() as {tag_name:string;assets:Array<{name:string;browser_download_url:string}>};
    const asset=release.assets.find(a=>/Windows\.zip$/i.test(a.name));
    if(!asset||!asset.browser_download_url.startsWith('https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/'))throw new Error('No official Rhubarb Windows archive found');
    const download=await fetch(asset.browser_download_url,{signal:AbortSignal.timeout(180000)});
    if(!download.ok)throw new Error(`Rhubarb download HTTP ${download.status}`);
    const dir=path.join(root,'.cache','rhubarb');await mkdir(dir,{recursive:true});const zip=path.join(root,'.cache','rhubarb.zip');
    await writeFile(zip,Buffer.from(await download.arrayBuffer()));
    await runTool('powershell.exe',['-NoProfile','-File',path.join(root,'scripts','expand-archive.ps1'),'-ArchivePath',zip,'-DestinationPath',dir]);
    await writeJson(path.join(dir,'installed-version.json'),{source:asset.browser_download_url,version:release.tag_name});
    if(!await findRhubarb())throw new Error('Rhubarb executable not found after extraction');
  }
  console.log('Ensuring Remotion browser is available.');await ensureBrowser({browserExecutable:await browserPath()});
  const modelFolder=path.join(whisperPath,'models');await mkdir(modelFolder,{recursive:true});const modelFile=path.join(modelFolder,'ggml-base.en.bin');
  if(!await exists(modelFile)||(await stat(modelFile)).size!==147964211){
    console.log('Downloading the English Whisper model from its official repository.');
    const response=await fetch('https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin',{signal:AbortSignal.timeout(300000)});
    if(!response.ok||!response.body)throw new Error(`Whisper model download HTTP ${response.status}`);
    const temporary=modelFile+'.download';await pipeline(Readable.fromWeb(response.body as any),createWriteStream(temporary));
    if((await stat(temporary)).size!==147964211)throw new Error('Downloaded Whisper model failed size verification');
    await rename(temporary,modelFile);
  }
  console.log('Media tools installed.');
}
export async function doctor(){
  console.log(`Node ${process.versions.node}; available RAM ${Math.round((await import('node:os')).freemem()/1024**3)} GiB`);
  console.log(`Gemini key: ${process.env.GEMINI_API_KEY?'configured':'missing'}; ElevenLabs: ${process.env.ELEVENLABS_API_KEY?'configured':'optional, absent'}`);
  let ffprobe='';try{ffprobe=await ffprobePath();}catch{}
  console.log(`FFmpeg: ${ffmpeg&&await exists(ffmpeg)?'available':'missing'}; FFprobe: ${ffprobe&&await exists(ffprobe)?'available':'missing'}`);
  const modelFile=path.join(whisperPath,'models','ggml-base.en.bin');
  console.log(`Whisper model: ${await exists(modelFile)&&(await stat(modelFile)).size===147964211?'available':'missing/incomplete; run npm run pipeline:tools'}`);
  console.log(`Rhubarb: ${await findRhubarb()?'available':'run npm run pipeline:tools'}`);
}
export async function captionAudio(file:string):Promise<Caption[]>{
  if(!await exists(path.join(whisperPath,'models','ggml-base.en.bin')))throw new Error('Whisper tools/model not installed. Run npm run pipeline:tools');
  const result=await transcribe({inputPath:file,whisperPath,modelFolder:path.join(whisperPath,'models'),whisperCppVersion:whisperVersion,model:'base.en',tokenLevelTimestamps:true,splitOnWord:true,printOutput:false,language:'English'});
  const converted=toCaptions({whisperCppOutput:result});
  await writeJson(path.join(path.dirname(path.dirname(file)),'whisper-raw.json'),converted.captions);
  return converted.captions.filter(c=>c.text.trim()).map(c=>({...c}));
}
export async function mouthCues(file:string,script:string,outDir:string):Promise<MouthCue[]>{
  const exe=await findRhubarb();if(!exe)throw new Error('Rhubarb missing. Run npm run pipeline:tools');
  const textFile=path.join(outDir,'narration.txt');const output=path.join(outDir,'mouth-cues.json');await writeFile(textFile,script);
  await runTool(exe,['-f','json','--dialogFile',textFile,'-o',output,file],300000);
  const data=JSON.parse(await readFile(output,'utf8'));
  if(!Array.isArray(data.mouthCues)||!data.mouthCues.length)throw new Error('No teacher mouth cues generated');
  const duration=(await probe(file)).duration;
  let end=0;
  for(const cue of data.mouthCues){
    if(!Number.isFinite(cue.start)||!Number.isFinite(cue.end)||cue.start<end-0.02||cue.end<=cue.start||cue.end>duration+0.15||!/[A-HX]/.test(cue.value)||cue.value.length!==1)throw new Error('Invalid Rhubarb mouth timing');
    end=cue.end;
  }
  return data.mouthCues;
}
