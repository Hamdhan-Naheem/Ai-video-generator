import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EducationAnimationSchema,educationAnimationKind,educationAnimationPrompt,bubbleSortTrace,validateAnimationChoice,validateAnimationSequence} from '../src/education-visuals.ts';
import {SceneSchema,StoryboardSchema,validateSceneVisuals} from '../src/contracts.ts';
const input={topic:'How sorting algorithms work'};
test('sorting trace performs only adjacent inverted swaps and preserves identity including duplicates',()=>{
 for(const values of [[5,1,4,2,3],[2,2,1],[1,2,3],[9,8,7,6,5,4,3]]){
  const {steps,result}=bubbleSortTrace(values);assert.deepEqual(result.map(x=>x.value),[...values].sort((a,b)=>a-b));assert.deepEqual(result.map(x=>x.id).sort(),values.map((_,i)=>i));
  for(const s of steps){assert.equal(s.swap,s.before[s.left].value>s.before[s.left+1].value);for(let i=0;i<values.length;i++)assert.equal(s.after[i].id,s.before[s.swap&&i===s.left?i+1:s.swap&&i===s.left+1?i-1:i].id);}
 }
});
test('only supported topics select specialized visuals; other sorting algorithms keep generic diagrams',()=>{
 assert.equal(educationAnimationKind(input),'bubble-sort');assert.equal(educationAnimationKind({topic:'How LLMs work'}),'llm-flow');
 for(const topic of ['Quicksort','Merge sort versus bubble sort','Hydroelectric generation','Sorting waste','Fine tuning a large language model'])assert.equal(educationAnimationKind({topic}),null);
 assert.match(educationAnimationPrompt({topic:'How LLMs work'}),/NOT a real tokenizer/);
});
test('scene animation data rejects code, remote media, unknown algorithms and unbounded examples',()=>{
 for(const bad of [{kind:'quicksort',phase:'compare',values:[3,1,2]},{kind:'bubble-sort',phase:'compare',values:[3,1,2],url:'https://evil.invalid'},{kind:'bubble-sort',phase:'compare',values:[1,2,300]},{kind:'llm-flow',phase:'predict',tokens:['<script>','hello'],outputToken:'world'},{kind:'llm-flow',phase:'predict',tokens:['one','two'],outputToken:'three',probability:.9}])assert.equal(EducationAnimationSchema.safeParse(bad).success,false);
});
test('animation sequence keeps one example and ordered phases; topic choice cannot drift',()=>{
 const scenes=['input','compare','compare','result'].map(phase=>({animation:EducationAnimationSchema.parse({kind:'bubble-sort',phase,values:[5,1,4,2,3]})}));assert.doesNotThrow(()=>validateAnimationChoice(scenes,input));
 assert.throws(()=>validateAnimationSequence([...scenes].reverse()));assert.throws(()=>validateAnimationChoice(scenes,{topic:'How LLMs work'}));assert.throws(()=>validateAnimationSequence([scenes[0],{animation:EducationAnimationSchema.parse({kind:'bubble-sort',phase:'result',values:[2,3,1]})}]));
});
test('legacy scenes remain accepted and solar scenes cannot mix unrelated specialized animations',()=>{
 const base={id:'scene-1',title:'Energy',narration:'Energy changes form.',layout:'intro',keyPoints:['Energy'],diagramNodes:['Input','Output'],teacherGesture:'explain'};
 assert.equal(SceneSchema.safeParse(base).success,true);
 const scene=SceneSchema.parse({...base,animation:{kind:'bubble-sort',phase:'input',values:[3,1,2]}});assert.throws(()=>validateSceneVisuals([scene],'solar-energy'));
 assert.equal(StoryboardSchema.safeParse({title:'Energy',learningObjective:'Energy changes.',factualCautions:[],scenes:[0,1,2,3].map((n)=>({...base,id:`scene-${n+1}`,layout:n===0?'intro':n===3?'recap':'explain'}))}).success,true);
});

test('planner requests required topic-specific scene data and validates the returned example (mock provider)',async()=>{
 const {planEducation}=await import('../src/providers.ts');const oldFetch=globalThis.fetch,oldKey=process.env.GEMINI_API_KEY,oldModel=process.env.GEMINI_PLANNER_MODEL;process.env.GEMINI_API_KEY='synthetic';process.env.GEMINI_PLANNER_MODEL='fixture';
 try{for(const kind of ['bubble-sort','llm-flow'] as const){
  const phases=kind==='bubble-sort'?['input','compare','compare','result']:['tokenize','context','predict','generate'];
  const plan={title:'Example',learningObjective:'Understand the example.',factualCautions:[],scenes:phases.map((phase,i)=>({id:`scene-${i+1}`,title:'Example',narration:Array(30).fill('example').join(' '),layout:i===0?'intro':i===3?'recap':'explain',keyPoints:['Example'],diagramNodes:['Input','Output'],teacherGesture:'point',animation:kind==='bubble-sort'?{kind,phase,values:[5,1,4,2,3]}:{kind,phase,tokens:['The','sky','is'],outputToken:'blue'}}))};
  let calls=0;globalThis.fetch=async(_url,init)=>{calls++;const body=JSON.parse(String(init?.body));assert.ok(body.response_format.schema.properties.scenes.items.required.includes('animation'));assert.ok(body.input.includes(kind));return Response.json({output_text:JSON.stringify(plan)});};
  const result=await planEducation({topic:kind==='bubble-sort'?'Sorting algorithms':'How LLMs work',audience:'beginner',durationSeconds:60,format:'landscape',referenceNotes:''});assert.equal(result.scenes[0].animation?.kind,kind);assert.equal(calls,1);
 }}finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;if(oldModel===undefined)delete process.env.GEMINI_PLANNER_MODEL;else process.env.GEMINI_PLANNER_MODEL=oldModel;}
});
