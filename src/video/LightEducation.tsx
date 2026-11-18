import React from 'react';
import {AbsoluteFill,Audio,interpolate,staticFile,useCurrentFrame} from 'remotion';
import type {VideoProps} from '../contracts.js';
import {TopicAnimation} from './TopicAnimation.js';
import {Teacher} from './Teacher.js';
export const LightEducation:React.FC<VideoProps>=(props)=>{
 const frame=useCurrentFrame(),portrait=props.format==='portrait',seconds=frame/30;
 const scene=props.scenes.find(s=>frame>=s.startFrame&&frame<s.startFrame+s.durationFrames)??props.scenes.at(-1)!;
 const local=frame-scene.startFrame,opacity=interpolate(local,[0,10],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'}),active=Math.min(scene.plan.diagramNodes.length-1,Math.floor(local/scene.durationFrames*scene.plan.diagramNodes.length));
 const compareScenes=props.scenes.filter(s=>s.plan.animation?.kind==='bubble-sort'&&s.plan.animation.phase==='compare');
 const comparisonProgress=(Math.max(0,compareScenes.indexOf(scene))+Math.min(1,Math.max(0,local/scene.durationFrames)))/Math.max(1,compareScenes.length);
 const cue=props.mouthCues.find(c=>seconds>=c.start&&seconds<c.end)?.value??'X',caption=props.captions.find(c=>seconds*1000>=c.startMs&&seconds*1000<c.endMs);
 const url=typeof window==='undefined'?staticFile(props.audioFile):new URL(staticFile(props.audioFile),window.location.href);if(url instanceof URL&&url.hostname==='localhost')url.hostname='127.0.0.1';
 return <AbsoluteFill style={{background:'#F7F6F2',color:'#202722',fontFamily:'Arial, sans-serif',overflow:'hidden'}}>
  <Audio src={String(url)}/>
  <div style={{position:'absolute',left:portrait?36:52,top:32,fontSize:17,fontWeight:700,letterSpacing:2,color:'#235B4E'}}>AI VIDEO STUDIO · EDUCATION</div>
  <div style={{position:'absolute',right:portrait?36:52,top:32,fontSize:15,color:'#5E665F'}}>ENGLISH</div>
  <div style={{position:'absolute',left:portrait?36:52,right:portrait?36:52,top:portrait?86:78,fontSize:portrait?38:40,fontWeight:700,lineHeight:1.15}}>{props.title}</div>
  <div style={{position:'absolute',left:portrait?28:28,top:portrait?228:245,width:portrait?220:270,height:portrait?290:360}}><Teacher mouth={cue} gesture={scene.plan.teacherGesture} frame={frame}/></div>
  <div style={{position:'absolute',left:portrait?278:350,right:portrait?34:52,top:portrait?235:190,opacity}}>
   <div style={{fontSize:15,fontWeight:700,letterSpacing:2,color:'#235B4E',marginBottom:14}}>SCENE {props.scenes.indexOf(scene)+1} OF {props.scenes.length}</div><div style={{fontSize:portrait?29:30,fontWeight:700,lineHeight:1.16}}>{scene.plan.title}</div>
  </div>
  <div style={{position:'absolute',left:portrait?36:350,right:portrait?36:52,top:portrait?530:272,height:portrait?280:205,background:'#FFFFFF',border:'1px solid #DCDDD5',borderRadius:20,overflow:'hidden'}}>
   {scene.plan.animation?<TopicAnimation animation={scene.plan.animation} progress={local/scene.durationFrames} comparisonProgress={comparisonProgress}/>:props.environment==='hydroelectric'?<HydroEnvironment frame={frame}/>:<svg viewBox="0 0 850 240" width="100%" height="100%" aria-hidden="true"><path d="M80 160 Q270 35 425 120 T770 110" fill="none" stroke="#DCEAE2" strokeWidth="28"/>{[0,1,2].map(i=>{const p=((frame/100+i/3)%1),x=85+p*680;return <circle key={i} cx={x} cy={128+Math.sin(p*Math.PI*2)*38} r={13} fill="#235B4E" opacity={.4+i*.2}/>;})}<circle cx="90" cy="160" r="35" fill="#E9F0EB" stroke="#235B4E" strokeWidth="3"/><path d="M78 160h24m-12-12v24" stroke="#235B4E" strokeWidth="3"/><rect x="730" y="75" width="65" height="65" rx="15" fill="#E9F0EB" stroke="#235B4E" strokeWidth="3"/><path d="M747 108l11 11 22-25" fill="none" stroke="#235B4E" strokeWidth="4"/></svg>}
  </div>
  <div style={{position:'absolute',left:portrait?36:350,right:portrait?36:52,top:portrait?838:490,display:'flex',flexWrap:portrait?'wrap':'nowrap',gap:12,opacity}}>
   {scene.plan.diagramNodes.map((node,i)=><div key={i} style={{flex:portrait?'1 1 44%':1,minHeight:portrait?64:52,padding:'12px 10px',borderRadius:12,background:!scene.plan.animation&&i===active?'#235B4E':'#E9F0EB',color:!scene.plan.animation&&i===active?'#FFFFFF':'#235B4E',fontSize:portrait?21:19,fontWeight:700,textAlign:'center',lineHeight:1.15,display:'flex',alignItems:'center',justifyContent:'center'}}>{node}</div>)}
  </div>
  <div style={{position:'absolute',left:portrait?40:350,right:portrait?40:52,top:portrait?1010:586,display:'flex',flexDirection:portrait?'column':'row',gap:portrait?16:28,fontSize:portrait?23:19,color:'#5E665F',lineHeight:1.3,opacity}}>{scene.plan.keyPoints.slice(0,2).map((text,i)=><div key={i} style={{flex:1}}>• {text}</div>)}</div>
  {props.burnedCaptions&&caption&&<div style={{position:'absolute',bottom:portrait?36:22,left:portrait?30:100,right:portrait?30:100,background:'#235B4E',color:'#FFFFFF',borderRadius:12,padding:'12px 20px',fontSize:portrait?27:26,textAlign:'center',lineHeight:1.2}}>{caption.text}</div>}
  <div style={{position:'absolute',bottom:0,height:5,left:0,width:`${frame/props.durationFrames*100}%`,background:'#235B4E'}}/>
 </AbsoluteFill>;
};
const HydroEnvironment=({frame}:{frame:number})=><svg viewBox="0 0 850 240" width="100%" height="100%" aria-hidden="true">
 <path d="M0 80Q70 66 140 78V220H0Z" fill="#D7EAE9"/><path d="M140 44L190 44L235 216H140Z" fill="#B8C7BF"/><path d="M20 110Q70 100 128 110M20 140Q70 130 128 140" fill="none" stroke="#79AEB5" strokeWidth="4"/>
 <path d="M160 125H240Q270 125 270 160H340" fill="none" stroke="#7EB8C2" strokeWidth="18"/><path d="M160 125H240Q270 125 270 160H340" fill="none" stroke="#D8F0F1" strokeWidth="5" strokeDasharray="14 14" strokeDashoffset={-frame*2}/>
 <circle cx="355" cy="160" r="43" fill="#E9F0EB" stroke="#235B4E" strokeWidth="4"/><g transform={`rotate(${frame*3},355,160)`}>{[0,90,180,270].map(angle=><path key={angle} d="M355 160Q320 125 350 124L355 160" fill="#235B4E" transform={`rotate(${angle},355,160)`}/>)}</g><circle cx="355" cy="160" r="8" fill="#A9C5B8"/>
 <path d="M400 160H455" stroke="#71877B" strokeWidth="10"/><rect x="455" y="117" width="100" height="86" rx="16" fill="#E9F0EB" stroke="#235B4E" strokeWidth="4"/><path d="M495 130L480 163H502L492 190L530 150H509L520 130Z" fill="#D0A759"/>
 <path d="M555 145H665V112H710" fill="none" stroke="#D0A759" strokeWidth="5"/>{[0,1,2].map(i=><circle key={i} cx={560+((frame/55+i/3)%1)*100} cy="145" r="5" fill="#D0A759"/>)}
 <path d="M700 135L755 82L810 135V213H700Z" fill="#ECF1E9" stroke="#235B4E" strokeWidth="4"/><rect x="720" y="144" width="22" height="25" fill="#F2D892"/><rect x="769" y="144" width="22" height="25" fill="#F2D892"/><path d="M750 212V175H769V212" fill="#ABC2AD" stroke="#235B4E" strokeWidth="2"/>
 <path d="M10 219H830" stroke="#B3C2B8" strokeWidth="3"/>
 <text x="30" y="38" fill="#235B4E" fontSize="20" fontFamily="Arial">Moving water → turbine → generator → electricity</text>
</svg>;
