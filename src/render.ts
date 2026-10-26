import path from 'node:path';
import {setDefaultResultOrder} from 'node:dns';
import {availableParallelism,freemem} from 'node:os';
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {VideoProps,validateVideoProps} from './contracts.js';
import {root, exists} from './storage.js';
import {probe,browserPath} from './media.js';

export async function renderVideo(run:string,props:VideoProps,stillOnly=false){
  // Remotion's local asset server binds IPv4 on this Windows host.
  setDefaultResultOrder('ipv4first');
  props=validateVideoProps(props);
  const serveUrl=await bundle({entryPoint:path.join(root,'src','video','index.tsx'),publicDir:path.join(run,'public'),webpackOverride:config=>({...config,resolve:{...config.resolve,extensionAlias:{...config.resolve?.extensionAlias,'.js':['.js','.ts','.tsx']}}})});
  const browserExecutable=await browserPath();
  const composition=await selectComposition({serveUrl,id:'Education',inputProps:props,browserExecutable});
  if(stillOnly){await renderStill({serveUrl,composition,inputProps:props,browserExecutable,output:path.join(run,`preview-${props.format}.png`),frame:Math.min(600,props.durationFrames-1)});return;}
  const output=path.join(run,`${props.format}-${props.burnedCaptions?'captioned':'clean'}.mp4`);
  const concurrency=Math.max(1,Math.min(4,availableParallelism(),Math.floor(freemem()/800_000_000)));let lastProgress=-1;
  console.log(`Rendering with ${concurrency} frame workers.`);
  await renderMedia({serveUrl,composition,inputProps:props,browserExecutable,codec:'h264',audioCodec:'aac',outputLocation:output,concurrency,crf:23,onProgress:({progress})=>{const quarter=Math.floor(progress*4);if(quarter>lastProgress){lastProgress=quarter;console.log(`Render ${Math.min(100,quarter*25)}%`);}}});
  const info=await probe(output);const video=info.streams.find(s=>s.codec_type==='video');
  if(!video||!info.streams.some(s=>s.codec_type==='audio')||Math.abs(info.duration-props.durationFrames/30)>.2||video.width!==(props.format==='portrait'?720:1280)||video.height!==(props.format==='portrait'?1280:720))throw new Error('Rendered media failed duration/stream/dimension checks');
  return {output,duration:info.duration,bytes:(await (await import('node:fs/promises')).stat(output)).size,frameWorkers:concurrency};
}
