import React from 'react';
import {AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame} from 'remotion';
import type {VideoProps} from '../contracts.js';
import {Teacher} from './Teacher.js';
import {SolarVideo} from './SolarVideo.js';

export const EducationVideo:React.FC<VideoProps>=(props)=>props.visualStyle==='solar-energy'?<SolarVideo {...props}/>:<DiagramVideo {...props}/>;
const DiagramVideo:React.FC<VideoProps>=(props)=>{
  const frame=useCurrentFrame();const seconds=frame/30;const portrait=props.format==='portrait';
  const scene=props.scenes.find(s=>frame>=s.startFrame&&frame<s.startFrame+s.durationFrames)??props.scenes.at(-1)!;
  const local=frame-scene.startFrame;const opacity=interpolate(local,[0,12],[0,1],{extrapolateRight:'clamp',extrapolateLeft:'clamp'});
  const cue=props.mouthCues.find(c=>seconds>=c.start&&seconds<c.end)?.value??'X';
  const caption=props.captions.find(c=>frame*1000/30>=c.startMs&&frame*1000/30<c.endMs);
  const active=Math.min(scene.plan.diagramNodes.length-1,Math.floor(local/Math.max(1,scene.durationFrames)*scene.plan.diagramNodes.length));
  const audioUrl=typeof window==='undefined'?staticFile(props.audioFile):new URL(staticFile(props.audioFile),window.location.href);
  if(audioUrl instanceof URL&&audioUrl.hostname==='localhost')audioUrl.hostname='127.0.0.1';
  return <AbsoluteFill style={{background:'linear-gradient(145deg,#091f30,#103847)',fontFamily:'Arial, sans-serif',color:'#f4f9f8',overflow:'hidden'}}>
    <Audio src={String(audioUrl)}/>
    <div style={{position:'absolute',inset:0,opacity:.12,backgroundImage:'radial-gradient(#b4d5d5 1px, transparent 1px)',backgroundSize:'28px 28px'}}/>
    <div style={{position:'absolute',left:portrait?42:60,top:portrait?46:36,right:42,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <div style={{fontSize:18,letterSpacing:3,color:'#6be4ca',fontWeight:700}}>LEARN IN A MINUTE</div><div style={{fontSize:17,color:'#a7c4cc'}}>ENGLISH · EDUCATION</div>
    </div>
    <div style={{position:'absolute',left:portrait?42:60,right:portrait?42:60,top:portrait?96:85,fontSize:portrait?37:39,lineHeight:1.15,fontWeight:700}}>{props.title}</div>
    <div style={{position:'absolute',left:portrait?38:46,top:portrait?210:220,width:portrait?210:290,height:portrait?300:390}}>
      <Teacher mouth={cue} gesture={scene.plan.teacherGesture} frame={frame}/>
    </div>
    <div style={{position:'absolute',left:portrait?274:385,right:portrait?36:60,top:portrait?230:195,opacity}}>
      <div style={{fontSize:15,letterSpacing:2,color:'#6be4ca',marginBottom:12}}>SCENE {props.scenes.indexOf(scene)+1} / {props.scenes.length}</div>
      <div style={{fontSize:portrait?31:34,fontWeight:700,lineHeight:1.12}}>{scene.plan.title}</div>
    </div>
    <div style={{position:'absolute',left:portrait?44:388,right:portrait?44:60,top:portrait?540:320,display:'flex',flexDirection:portrait?'column':'row',gap:portrait?10:12,opacity}}>
      {scene.plan.diagramNodes.map((node,index)=><React.Fragment key={node}>
        {index>0?<div style={{alignSelf:'center',color:'#62d5bf',fontSize:portrait?18:27,lineHeight:.7}}>{portrait?'↓':'→'}</div>:null}
        <div style={{flex:1,minHeight:portrait?56:108,boxSizing:'border-box',background:index===active?'#1d655f':'#173d4d',border:`2px solid ${index===active?'#6be4ca':'#356070'}`,borderRadius:16,padding:portrait?'12px 20px':'20px 14px',fontSize:portrait?24:23,fontWeight:700,textAlign:'center',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1.15}}>{node}</div>
      </React.Fragment>)}
    </div>
    <div style={{position:'absolute',left:portrait?45:390,right:portrait?45:60,top:portrait?935:470,opacity,fontSize:portrait?23:20,color:'#c9dfe2',lineHeight:1.3}}>
      {scene.plan.keyPoints.slice(0,2).map(text=><div key={text}>• {text}</div>)}
    </div>
    {props.burnedCaptions&&caption?<div style={{position:'absolute',bottom:portrait?65:30,left:portrait?35:120,right:portrait?35:120,background:'rgba(3,13,21,.92)',padding:'15px 23px',borderRadius:14,textAlign:'center',fontSize:portrait?29:28,lineHeight:1.25,fontWeight:600}}>{caption.text}</div>:null}
    <div style={{position:'absolute',bottom:0,left:0,height:5,width:`${100*frame/props.durationFrames}%`,background:'#5ce1c4'}}/>
  </AbsoluteFill>;
};
