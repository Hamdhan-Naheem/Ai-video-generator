import {z} from 'zod';
const token=z.string().trim().min(1).max(14).refine(s=>!/[<>\u0000]/.test(s),'Use plain text');
export const EducationAnimationSchema=z.discriminatedUnion('kind',[
 z.strictObject({kind:z.literal('bubble-sort'),phase:z.enum(['input','compare','result']),values:z.array(z.number().int().min(1).max(99)).min(3).max(7)}),
 z.strictObject({kind:z.literal('llm-flow'),phase:z.enum(['tokenize','context','predict','generate']),tokens:z.array(token).min(2).max(4),outputToken:token})
]);
export type EducationAnimation=z.infer<typeof EducationAnimationSchema>;
type Input={topic:string;learningObjective?:string;brief?:string};
export function educationAnimationKind(input:Input):EducationAnimation['kind']|null{
 const text=[input.topic,input.learningObjective??'',input.brief??''].join(' ');
 if(/\b(?:llms?|large language models?|language model|chatgpt|transformer inference)\b/i.test(text)&&!/\b(?:fine[- ]?tuning|train(?:ing)? a|training only)\b/i.test(input.topic))return 'llm-flow';
 if(/\b(?:bubble sort|sorting algorithms?|sorting numbers?|dsa.{0,20}sort)\b/i.test(text)&&!/\b(?:quick|merge|heap|insertion|selection|radix|counting)[ -]?sort\b/i.test(text))return 'bubble-sort';
 return null;
}
export function validateAnimationSequence(scenes:{animation?:EducationAnimation}[]){
 const animated=scenes.flatMap(s=>s.animation?[s.animation]:[]);if(!animated.length)return;
 const first=animated[0],phases=first.kind==='bubble-sort'?['input','compare','result']:['tokenize','context','predict','generate'];let previous=-1;
 const data=(a:EducationAnimation)=>JSON.stringify(a.kind==='bubble-sort'?a.values:[a.tokens,a.outputToken]);
 for(const a of animated){const phase=phases.indexOf(a.phase);if(a.kind!==first.kind||data(a)!==data(first)||phase<previous)throw Error('Animation example and phase order must remain consistent');previous=phase;}
}
export function validateAnimationChoice(scenes:{animation?:EducationAnimation}[],input:Input){
 const kind=educationAnimationKind(input);
 if(kind&&scenes.some(s=>s.animation?.kind!==kind)||!kind&&scenes.some(s=>s.animation))throw Error('Animation must match the supported topic');
 if(kind){const phases=scenes.map(s=>s.animation!.phase);if(phases[0]!== (kind==='bubble-sort'?'input':'tokenize')||phases.at(-1)!==(kind==='bubble-sort'?'result':'generate'))throw Error('Animation must introduce and complete its example');}
 validateAnimationSequence(scenes);
}
export function educationAnimationPrompt(input:Input){
 const kind=educationAnimationKind(input);
 if(kind==='bubble-sort')return 'Use animation on EVERY scene: kind bubble-sort; phase input for introduction, compare for the middle scenes, result for recap. Use the SAME 3-7 integer values (1-99) in every scene. Explain this exact ascending bubble-sort example: adjacent comparisons, swap only when left > right, repeat passes. The renderer computes actual swaps. State this is a bubble-sort example; never label it quicksort, merge sort or another algorithm. Middle scenes share one continuous comparison sequence. No invented exact speech-to-swap synchronization.';
 if(kind==='llm-flow')return 'Use animation on EVERY scene: kind llm-flow; phase tokenize, context, predict, generate in that order (repeat a phase if needed). Use the SAME 2-4 short example tokens and one outputToken across all scenes. Explain inference: simplified tokenization, contextual transformer processing, next-token prediction, append the sample token and repeat. This is a simplified illustrative inference diagram, NOT a real tokenizer/model execution or training visualization. No fabricated probability/confidence scores. Narration must match each phase and the given example.';
 return 'Omit animation; use generic diagram nodes. Do not select an unrelated specialized animation.';
}
export type SortItem={id:number;value:number};
export function bubbleSortTrace(values:readonly number[]){
 const items=values.map((value,id)=>({id,value})),steps:{before:SortItem[];after:SortItem[];left:number;swap:boolean}[]=[];
 for(let end=items.length-1;end>0;end--){let changed=false;for(let left=0;left<end;left++){const before=items.map(x=>({...x})),swap=items[left].value>items[left+1].value;if(swap){[items[left],items[left+1]]=[items[left+1],items[left]];changed=true;}steps.push({before,after:items.map(x=>({...x})),left,swap});}if(!changed)break;}
 return {steps,result:items.map(x=>({...x}))};
}
