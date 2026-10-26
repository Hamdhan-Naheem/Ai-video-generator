import path from 'node:path';
import {stat} from 'node:fs/promises';
import {ffmpeg,runTool,probe} from '../src/media.js';
import {fileHash,safeRun,writeJson,readJson} from '../src/storage.js';
import {validateVideoProps} from '../src/contracts.js';

const run=safeRun('solar-demo');
const file=path.join(run,'landscape-captioned.mp4');
const props=validateVideoProps(await readJson(path.join(run,'timeline.json')));
if(props.visualStyle!=='solar-energy')throw new Error('Expected a solar timeline');
const info=await probe(file);const video=info.streams.find(s=>s.codec_type==='video') as {width?:number;height?:number;r_frame_rate?:string}|undefined;
if(!video||video.width!==1280||video.height!==720||video.r_frame_rate!=='30/1'||!info.streams.some(s=>s.codec_type==='audio')||Math.abs(info.duration-props.durationFrames/30)>.2)throw new Error('Solar output failed stream/frame/duration validation');
await runTool(ffmpeg,['-xerror','-v','error','-i',file,'-f','null','-'],180000);
const frames=[];
for(const [index,scene] of props.scenes.entries()){
  const fractions=index===1?[.25,.65]:index===3?[.5,.9]:[.5];
  for(const fraction of fractions){
    const seconds=(scene.startFrame+Math.floor(scene.durationFrames*fraction))/30;
    const name=`scene-${index+1}-${Math.round(fraction*100)}.png`;
    await runTool(ffmpeg,['-y','-v','error','-ss',String(seconds),'-i',file,'-frames:v','1',path.join(run,name)]);
    frames.push({file:name,seconds,visual:scene.plan.visual});
  }
}
await writeJson(path.join(run,'verification.json'),{at:new Date().toISOString(),file:'landscape-captioned.mp4',duration:info.duration,width:video.width,height:video.height,fps:video.r_frame_rate,bytes:(await stat(file)).size,sha256:await fileHash(file),fullDecode:'passed',frames,limitations:['Automated verification does not establish subjective narration, caption boundary or lip-sync quality.','Solar-specific scene family, not arbitrary topic support.']});
console.log('Solar MP4 fully decoded; stream, dimensions, frame rate and duration passed. Six representative PNG frames extracted.');
