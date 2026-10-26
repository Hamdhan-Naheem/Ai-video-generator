import {test} from 'node:test';
import assert from 'node:assert/strict';
import {InputSchema,SceneSchema,validateSceneVisuals,validateVideoProps,solarVisuals} from '../src/contracts.js';
const scenes=solarVisuals.map((visual,i)=>SceneSchema.parse({id:'scene-'+(i+1),title:'Energy conversion',narration:'Follow solar energy.',layout:i===0?'intro':i===3?'recap':'process',keyPoints:['Energy changes form'],diagramNodes:['Source','Destination'],teacherGesture:'point',visual}));
test('solar rendering rejects missing or reordered visual mechanisms',()=>{
  validateSceneVisuals(scenes,'solar-energy');
  assert.throws(()=>validateSceneVisuals([...scenes].reverse(),'solar-energy'));
  assert.throws(()=>validateSceneVisuals(scenes.slice(0,3),'solar-energy'));
  assert.throws(()=>validateSceneVisuals(scenes.map(s=>({...s,visual:undefined})),'solar-energy'));
  assert.throws(()=>validateSceneVisuals(scenes,undefined));
  assert.equal(InputSchema.safeParse({topic:'Solar',audience:'beginners',durationSeconds:60,format:'landscape',visualStyle:'arbitrary-code'}).success,false);
});
test('validated solar timeline preserves visual instructions through render validation',()=>{
  const props={title:'Solar',visualStyle:'solar-energy',format:'landscape',durationFrames:1800,audioFile:'narration.wav',scenes:scenes.map((plan,i)=>({plan,startFrame:i*450,durationFrames:450})),captions:[],mouthCues:[],burnedCaptions:true};
  assert.equal(validateVideoProps(props).scenes[2].plan.visual,'inverter');
  assert.throws(()=>validateVideoProps({...props,visualStyle:undefined}));
});
