import path from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {setDefaultResultOrder} from 'node:dns';
import {bundle} from '@remotion/bundler';
import {renderStill,selectComposition} from '@remotion/renderer';
import {browserPath} from '../src/media.js';
import {root} from '../src/storage.js';

// Review-only stills. No provider imports, network AI requests, speech or MP4 export.
setDefaultResultOrder('ipv4first');
const output=path.join(root,'local-runs','solar-visual-preview');
await mkdir(output,{recursive:true});
const serveUrl=await bundle({entryPoint:path.join(root,'src','video','solar-preview-entry.tsx'),webpackOverride:config=>({...config,resolve:{...config.resolve,extensionAlias:{...config.resolve?.extensionAlias,'.js':['.js','.ts','.tsx']}}})});
const browserExecutable=await browserPath();
const files:string[]=[];
for(const portrait of [false,true]){
  for(const stage of portrait?[3]:[0,1,2,3]){
    const inputProps={stage,portrait};
    const composition=await selectComposition({serveUrl,id:'SolarPreview',inputProps,browserExecutable});
    const file=`${portrait?'portrait':'landscape'}-scene-${stage+1}.png`;
    await renderStill({serveUrl,composition,inputProps,browserExecutable,output:path.join(output,file),frame:45});
    files.push(file);console.log(`Saved ${file}`);
  }
}
await writeFile(path.join(output,'preview-report.json'),JSON.stringify({type:'hand-authored-visual-direction-preview',aiRequests:0,audioGenerated:false,videoRendered:false,files,limitations:['Stills do not establish animation or narration synchronization quality.','Solar-specific component is not connected to general topic planning.']},null,2));
