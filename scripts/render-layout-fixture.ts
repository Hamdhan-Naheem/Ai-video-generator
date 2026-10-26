import path from 'node:path';
import {mkdir} from 'node:fs/promises';
import {ffmpeg,runTool} from '../src/media.js';
import {safeRun,writeJson} from '../src/storage.js';
import {renderVideo} from '../src/render.js';
import type {VideoProps} from '../src/contracts.js';

// Deliberately synthetic layout fixture. No AI, speech or lip-sync claim.
const run=safeRun('layout-fixture');await mkdir(path.join(run,'public'),{recursive:true});
await runTool(ffmpeg,['-y','-v','error','-f','lavfi','-i','anullsrc=r=16000:cl=mono','-t','60',path.join(run,'public','narration.wav')]);
const base:VideoProps={title:'LAYOUT TEST: How water becomes electrical energy',format:'landscape',durationFrames:1800,audioFile:'narration.wav',mouthCues:[],burnedCaptions:true,
  captions:[{text:'Synthetic layout fixture — this is not generated narration.',startMs:0,endMs:60000,timestampMs:null,confidence:null}],
  scenes:[{startFrame:0,durationFrames:1800,plan:{id:'scene-1',title:'Follow the conversion of energy',narration:'Synthetic fixture only.',layout:'process',keyPoints:['Moving water turns the turbine connected to a generator.','Energy changes form; it is not created from nothing.'],diagramNodes:['Water stored at height','Moving water','Rotating turbine','Electrical energy'],teacherGesture:'point'}}]};
for(const format of ['landscape','portrait'] as const)await renderVideo(run,{...base,format},true);
await writeJson(path.join(run,'fixture-report.json'),{type:'synthetic-layout-only',ai:false,speech:false,lipSync:false,formats:['landscape','portrait']});
console.log(`Synthetic previews saved to ${run}; no live generation is implied.`);
