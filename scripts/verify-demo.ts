import path from 'node:path';
import {stat} from 'node:fs/promises';
import {ffmpeg,runTool,probe} from '../src/media.js';
import {fileHash,safeRun,writeJson} from '../src/storage.js';
const run=safeRun('education-demo');const results=[];
for(const name of ['landscape-captioned.mp4','portrait-captioned.mp4','landscape-clean.mp4']){
  const file=path.join(run,name);const metadata=await probe(file);const video=metadata.streams.find(s=>s.codec_type==='video');
  const portrait=name.startsWith('portrait');
  if(!video||video.width!==(portrait?720:1280)||video.height!==(portrait?1280:720)||metadata.duration<60||metadata.duration>63||!metadata.streams.some(s=>s.codec_type==='audio'))throw new Error(`Invalid demo stream/duration/dimensions: ${name}`);
  const frameRate=(video as {r_frame_rate?:string}).r_frame_rate;if(frameRate!=='30/1')throw new Error(`Unexpected demo frame rate: ${name}`);
  await runTool(ffmpeg,['-xerror','-v','error','-i',file,'-f','null','-'],180000);
  results.push({file:name,duration:metadata.duration,width:video.width,height:video.height,frameRate,bytes:(await stat(file)).size,sha256:await fileHash(file),fullDecode:'passed'});
  console.log(`${name}: full decode and stream checks passed`);
}
await writeJson(path.join(run,'verification.json'),{at:new Date().toISOString(),results,limitations:['Does not rate factual accuracy, pronunciation, caption-boundary error or subjective lip-sync naturalness.']});
