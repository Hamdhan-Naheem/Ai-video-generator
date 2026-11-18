import React from 'react';
import {bubbleSortTrace,type EducationAnimation} from '../education-visuals.js';
const forest='#235B4E',ink='#202722',soft='#E9F0EB',amber='#E8C36A',blue='#A8D4E3';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function TopicAnimation({animation,progress,comparisonProgress=progress}:{animation:EducationAnimation;progress:number;comparisonProgress?:number}){
 return animation.kind==='bubble-sort'?<SortAnimation animation={animation} progress={comparisonProgress}/>:<LlmAnimation animation={animation} progress={progress}/>;
}
function SortAnimation({animation,progress}:{animation:Extract<EducationAnimation,{kind:'bubble-sort'}>;progress:number}){
 const {steps,result}=bubbleSortTrace(animation.values),position=clamp(progress)*(steps.length),index=Math.min(steps.length-1,Math.floor(position)),step=steps[index];
 const moving=animation.phase==='compare'&&progress<1,items=animation.phase==='result'||animation.phase==='compare'&&!moving?result:animation.values.map((value,id)=>({id,value}));
 const before=moving?step.before:items,after=moving?step.after:items,fraction=clamp((position-index-.28)/.5),ease=fraction*fraction*(3-2*fraction),max=Math.max(...animation.values),width=660/animation.values.length;
 const message=animation.phase==='input'?'Unsorted input':animation.phase==='result'||!moving&&animation.phase==='compare'?'Sorted in ascending order':step.swap?'Left value is larger → swap':'Already ordered → keep';
 return <svg viewBox="0 0 850 240" width="100%" height="100%" role="img" aria-label="Illustrative ascending bubble sort">
  <text x="30" y="30" fontSize="22" fontWeight="700" fill={forest}>BUBBLE SORT</text><text x="820" y="30" textAnchor="end" fontSize="20" fill={ink}>{message}</text>
  <line x1="70" y1="195" x2="780" y2="195" stroke="#DCDDD5" strokeWidth="2"/>
  {before.map((item,slot)=>{const destination=after.findIndex(a=>a.id===item.id),x=95+(slot+(destination-slot)*ease)*width,h=40+item.value/max*90,highlight=moving&&(slot===step.left||slot===step.left+1);return <g key={item.id} transform={`translate(${x},${moving&&step.swap&&(slot===step.left||slot===step.left+1)?Math.sin(Math.PI*ease)*(slot===step.left?-28:10):0})`}>
   <rect x="0" y={195-h} width={width-20} height={h} rx="10" fill={animation.phase==='result'?forest:highlight?amber:blue}/>
   <text x={(width-20)/2} y={195-h+30} textAnchor="middle" fontSize="26" fontWeight="700" fill={animation.phase==='result'?'#FFFFFF':ink}>{item.value}</text>
  </g>;})}
  <text x="425" y="225" textAnchor="middle" fill={forest} fontSize="19">{moving?`Comparison ${index+1} of ${steps.length} · adjacent elements`:'Example array · values preserved'}</text>
 </svg>;
}
function LlmAnimation({animation,progress}:{animation:Extract<EducationAnimation,{kind:'llm-flow'}>;progress:number}){
 const phases=['tokenize','context','predict','generate'],active=phases.indexOf(animation.phase),x=[28,240,452,664],centres=x.map(n=>n+79),p=clamp(progress),labels=['Input tokens','Context','Next token','Append & repeat'];
 return <svg viewBox="0 0 850 240" width="100%" height="100%" role="img" aria-label="Simplified language-model inference">
  <text x="28" y="29" fontSize="22" fontWeight="700" fill={forest}>LANGUAGE MODEL · INFERENCE</text>
  {x.map((left,i)=><g key={i}>
   {i<3&&<><path d={`M${left+161} 111h44m-10-7 10 7-10 7`} fill="none" stroke={i<active?forest:'#BCD0C5'} strokeWidth="3"/>{i===active&&<circle cx={left+165+p*36} cy="111" r="5" fill={forest}/>}</>}
   <rect x={left} y="57" width="158" height="109" rx="16" fill={i===active?forest:soft}/>
   <text x={left+79} y="83" textAnchor="middle" fill={i===active?'#FFFFFF':forest} fontSize="18" fontWeight="700">{labels[i]}</text>
   {i===0?<>{animation.tokens.map((t,j)=><g key={j} opacity={active!==0||p>j/animation.tokens.length?1:.2}><rect x={left+12+j%2*68} y={j<2?99:128} width="63" height="25" rx="5" fill="#FFFFFF"/><text x={left+43+j%2*68} y={j<2?117:146} textAnchor="middle" fontSize="15" textLength={t.length>6?53:undefined} lengthAdjust="spacingAndGlyphs" fill={forest}>{t}</text></g>)}</>:i===1?<>{[0,1,2].map(row=>[0,1,2].map(col=><React.Fragment key={row*3+col}>{col<2&&[0,1,2].map(r=><path key={r} d={`M${left+35+col*44} ${105+row*19}L${left+79+col*44} ${105+r*19}`} stroke={i===active?'#A8D4E3':'#BCD0C5'} strokeWidth="1"/>)}<circle cx={left+35+col*44} cy={105+row*19} r="5" fill={i===active?amber:forest}/></React.Fragment>))}</>:<text x={left+79} y="127" textAnchor="middle" fontSize="22" textLength={animation.outputToken.length>8?130:undefined} lengthAdjust="spacingAndGlyphs" fontWeight="700" fill={i===active?'#FFFFFF':forest}>{active>=i?animation.outputToken:'…'}</text>}
  </g>)}
  {active===3&&<path d={`M${centres[3]} 171v14H${centres[1]}v-12m-6 7 6-7 6 7`} fill="none" stroke={forest} strokeWidth="2" strokeDasharray="7 5" strokeDashoffset={-p*40}/>}
  <text x="425" y="219" textAnchor="middle" fontSize="18" fill="#5E665F">Illustrative tokens and continuation · not a live model trace</text>
 </svg>;
}
