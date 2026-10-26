import React from 'react';
import {AbsoluteFill,Audio,interpolate,staticFile,useCurrentFrame} from 'remotion';
import type {VideoProps} from '../contracts.js';
import {solarVisuals} from '../contracts.js';
import {SolarExplainer} from './SolarExplainer.js';

export const SolarVideo:React.FC<VideoProps>=(props)=>{
  const frame=useCurrentFrame();const seconds=frame/30;
  const scene=props.scenes.find(s=>frame>=s.startFrame&&frame<s.startFrame+s.durationFrames)??props.scenes.at(-1)!;
  const stage=solarVisuals.indexOf(scene.plan.visual as typeof solarVisuals[number]);
  if(stage<0)throw new Error('Unsupported solar scene');
  const mouth=props.mouthCues.find(c=>seconds>=c.start&&seconds<c.end)?.value??'X';
  const caption=props.captions.find(c=>seconds*1000>=c.startMs&&seconds*1000<c.endMs);
  const audioUrl=typeof window==='undefined'?staticFile(props.audioFile):new URL(staticFile(props.audioFile),window.location.href);
  if(audioUrl instanceof URL&&audioUrl.hostname==='localhost')audioUrl.hostname='127.0.0.1';
  const portrait=props.format==='portrait';
  const nightLine=stage===3?props.captions.find(c=>c.startMs>=scene.startFrame/30*1000&&/\bnight\b/i.test(c.text)):undefined;
  const night=nightLine?interpolate(seconds,[nightLine.startMs/1000-.5,nightLine.startMs/1000+1.5],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'}):0;
  return <AbsoluteFill>
    <SolarExplainer stage={stage} portrait={portrait} night={night} live mouth={mouth} gesture={scene.plan.teacherGesture} progress={(frame-scene.startFrame)/scene.durationFrames}/>
    <Audio src={String(audioUrl)}/>
    {props.burnedCaptions&&caption?<div style={{position:'absolute',left:portrait?35:245,right:portrait?35:45,bottom:portrait?170:55,padding:'12px 18px',borderRadius:12,background:'rgba(255,255,247,.97)',color:'#243c38',fontFamily:'Arial, sans-serif',fontSize:portrait?29:25,fontWeight:600,textAlign:'center',lineHeight:1.3,boxShadow:'0 2px 10px #25473812'}}>{caption.text}</div>:null}
    <div style={{position:'absolute',bottom:0,left:0,height:4,width:(100*frame/props.durationFrames)+'%',background:'#4c947d'}}/>
  </AbsoluteFill>;
};
