import {mkdir,mkdtemp,realpath,rm} from 'node:fs/promises';
import path from 'node:path';
import {setDefaultResultOrder} from 'node:dns';
import {bundle} from '@remotion/bundler';
import {renderStill,renderMedia,selectComposition} from '@remotion/renderer';
import {browserPath,ffmpeg,runTool} from '../src/media.ts';
import {validateVideoProps,type VideoProps} from '../src/contracts.ts';
import {EducationAnimationSchema} from '../src/education-visuals.ts';

// Synthetic silent component previews, not generated narration or a live AI result.
setDefaultResultOrder('ipv4first');
const out=path.resolve('.cache/topic-visual-previews');await mkdir(path.join(out,'public'),{recursive:true});
await runTool(ffmpeg,['-y','-v','error','-f','lavfi','-i','anullsrc=r=16000:cl=mono','-t','60',path.join(out,'public/narration.wav')]);
const temporary=await mkdtemp(path.resolve('.cache/topic-preview-bundle-'));
try{
 const serveUrl=await bundle({entryPoint:path.resolve('src/video/index.tsx'),publicDir:path.join(out,'public'),outDir:temporary,enableCaching:false,symlinkPublicDir:false,webpackOverride:c=>({...c,resolve:{...c.resolve,extensionAlias:{...c.resolve?.extensionAlias,'.js':['.js','.ts','.tsx']}}})});
 const browserExecutable=await browserPath();
 for(const kind of ['bubble-sort','llm-flow'] as const){
  if(process.argv.includes('--sorting-only')&&kind!=='bubble-sort')continue;
  const phases=kind==='bubble-sort'?['input','compare','compare','result']:['tokenize','context','predict','generate'];
  for(const format of ['landscape','portrait'] as const){
   const props=validateVideoProps({title:kind==='bubble-sort'?'Bubble sort: compare, swap, repeat':'How a language model predicts the next token',visualStyle:'education-light',format,durationFrames:1800,audioFile:'narration.wav',mouthCues:[],captions:[],burnedCaptions:false,scenes:phases.map((phase,i)=>({startFrame:i*450,durationFrames:450,plan:{id:`scene-${i+1}`,title:kind==='bubble-sort'?['Start with an unsorted array','Compare adjacent values','Continue the remaining passes','The same values, in order'][i]:['Turn text into tokens','Build context with a transformer','Predict a possible next token','Append and repeat'][i],narration:'Synthetic silent component fixture.',layout:i===0?'intro':i===3?'recap':'explain',keyPoints:kind==='bubble-sort'?['Swap only when the left value is larger.','Repeat comparisons to sort the example.']:['The diagram simplifies real model inference.','The sample continuation is illustrative.'],diagramNodes:kind==='bubble-sort'?['Compare','Swap','Repeat']:['Tokens','Context','Predict','Append'],teacherGesture:'point',animation:EducationAnimationSchema.parse(kind==='bubble-sort'?{kind,phase,values:[5,1,4,2,3]}:{kind,phase,tokens:['The','sky','is'],outputToken:'blue'})}}))}) as VideoProps;
   const composition=await selectComposition({serveUrl,id:'Education',inputProps:props,browserExecutable});
   for(const frame of (process.argv.includes('--compare-only')?[600]:[600,1500]))await renderStill({serveUrl,composition,inputProps:props,browserExecutable,frame,output:path.join(out,`${kind}-${format}-${frame}.png`)});
   if(format==='landscape'&&process.argv.includes('--clips'))await renderMedia({serveUrl,composition,inputProps:props,browserExecutable,frameRange:kind==='bubble-sort'?[450,569]:[900,1019],outputLocation:path.join(out,`${kind}-silent-fixture.mp4`),codec:'h264',audioCodec:'aac',concurrency:2,crf:23});
  }
 }
 console.log('Synthetic silent previews: '+out);
}finally{if(path.dirname(temporary)!==path.resolve('.cache')||!path.basename(temporary).startsWith('topic-preview-bundle-')||await realpath(temporary)!==temporary)throw Error('Unsafe fixture cleanup target');await rm(temporary,{recursive:true,force:true});}
