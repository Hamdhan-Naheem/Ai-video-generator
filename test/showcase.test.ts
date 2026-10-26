import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sections,evidenceQuotes,validateShowcasePlan,validateShowcaseProps} from '../src/showcase-contracts.js';
const keys=['hero','planning','guests','collaboration','hero'] as const;
const plan={product:'Make My Marriage',scenes:keys.map(section=>({section,headline:'Plan together',sourceQuote:evidenceQuotes[section],narration:'Keep wedding plans together with events tasks budgets and family details in one shared workspace.'}))};
test('screenshot plan rejects unsupported claims, unknown sections and excessive narration',()=>{
  assert.equal(validateShowcasePlan(plan).scenes.length,5);
  assert.throws(()=>validateShowcasePlan({...plan,scenes:plan.scenes.map((s,i)=>i===2?{...s,sourceQuote:'Pay vendors inside the app'}:s)}));
  assert.throws(()=>validateShowcasePlan({...plan,scenes:plan.scenes.map(s=>({...s,narration:s.narration.repeat(5)}))}));
  assert.throws(()=>validateShowcasePlan({...plan,scenes:[...plan.scenes].reverse()}));
});
test('short showcase timeline is separate from education and rejects gaps and out-of-range captions',()=>{
  const props={plan:validateShowcasePlan(plan),scenes:keys.map((_,i)=>({startFrame:i*210,durationFrames:210})),durationFrames:1050,captions:[]};
  assert.equal(validateShowcaseProps(props).durationFrames,1050);
  assert.throws(()=>validateShowcaseProps({...props,durationFrames:1800}));
  assert.throws(()=>validateShowcaseProps({...props,scenes:props.scenes.map((s,i)=>i===1?{...s,startFrame:220}:s)}));
  assert.throws(()=>validateShowcaseProps({...props,captions:[{text:'Test',startMs:0,endMs:36000}]}));
});

test('reviewed bride-or-groom homophone correction preserves measured intervals and requires script context',async()=>{
  const {correctShowcaseTerms}=await import('../src/showcase-caption-terms.js');
  const captions=[{text:' brighter',startMs:24000,endMs:24500,timestampMs:24000,confidence:.9},{text:' groom',startMs:24500,endMs:25000,timestampMs:24500,confidence:.8}];
  const fixed=correctShowcaseTerms(captions,'Start with the bride or groom side.');
  assert.equal(fixed[0].text,' bride or');assert.equal(fixed[0].startMs,24000);assert.equal(fixed[0].endMs,24500);
  assert.equal(correctShowcaseTerms(captions,'A brighter future')[0].text,' brighter');
});
