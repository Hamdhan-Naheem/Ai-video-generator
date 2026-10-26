import React from 'react';
import {AbsoluteFill,Audio,Img,interpolate,staticFile,useCurrentFrame} from 'remotion';
import type {ShowcaseProps} from '../showcase-contracts.js';
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const accents=['ONE SHARED WORKSPACE','PLANS THAT STAY CONNECTED','THE DETAILS, TOGETHER','BRING BOTH FAMILIES IN','YOUR NEXT CHAPTER'];
export const SoftwareShowcase:React.FC<ShowcaseProps>=(props)=>{
  const frame=useCurrentFrame();const seconds=frame/30;
  let index=props.scenes.findIndex(s=>frame>=s.startFrame&&frame<s.startFrame+s.durationFrames);if(index<0)index=4;
  const timing=props.scenes[index];const scene=props.plan.scenes[index];const progress=(frame-timing.startFrame)/timing.durationFrames;
  const opacity=interpolate(frame-timing.startFrame,[0,10],[0,1],clamp);
  const shift=(index===4?-100:0)+interpolate(progress,[0,1],[0,index===1?-275:index===3?-280:index===2?-85:0],clamp);
  const caption=props.captions.find(c=>seconds*1000>=c.startMs&&seconds*1000<c.endMs);
  const asset=(name:string)=>{const u=new URL(staticFile(name),window.location.href);if(u.hostname==='localhost')u.hostname='127.0.0.1';return String(u);};
  return <AbsoluteFill style={{fontFamily:'Arial, sans-serif',background:'#fbf7f4',color:'#292326',overflow:'hidden'}}>
    <Audio src={asset('narration.wav')}/>
    <div style={{position:'absolute',width:780,height:780,borderRadius:'50%',right:-230,top:-280,background:'radial-gradient(circle,#ecd3d6,transparent 68%)'}}/>
    <div style={{position:'absolute',left:56,top:43,fontSize:24,fontWeight:700,color:'#83293b',letterSpacing:-.7}}>Make My Marriage</div>
    <div style={{position:'absolute',right:51,top:49,fontSize:12,letterSpacing:2,color:'#9b7479'}}>THE WEDDING PLANNING WORKSPACE</div>
    <div style={{position:'absolute',left:56,top:166,width:470,opacity,transform:`translateY(${(1-opacity)*10}px)`}}>
      <div style={{fontSize:12,letterSpacing:2.3,fontWeight:700,color:'#955660',marginBottom:22}}>{accents[index]}</div>
      <div style={{fontSize:52,fontWeight:700,lineHeight:1.08,letterSpacing:-2}}>{scene.headline}</div>
      <div style={{width:55,height:3,background:'#a44b59',marginTop:28,marginBottom:24}}/>
      <div style={{fontSize:19,lineHeight:1.6,color:'#795f63',maxWidth:390}}>{index===0?'One calm place for couples and families.':index===1?'Events · tasks · budgets':index===2?'Guests · RSVP · documents':index===3?'Bride Side · Groom Side · Joint':'Create Your Wedding'}</div>
      {index===4?<div style={{display:'inline-block',marginTop:28,background:'#83293b',color:'white',fontSize:17,fontWeight:700,padding:'15px 22px',borderRadius:11}}>Create Your Wedding <span style={{paddingLeft:18}}>↗</span></div>:null}
      <div style={{display:'flex',gap:9,marginTop:36}}>{props.scenes.map((_,i)=><div key={i} style={{height:4,width:i===index?42:17,borderRadius:3,background:i===index?'#9d3f50':'#e5d2d1'}}/>)}</div>
    </div>
    <div style={{position:'absolute',left:585,top:103,width:642,height:496,borderRadius:18,overflow:'hidden',background:'#fff',boxShadow:'0 20px 55px #713b3b20',border:'1px solid #e6d8d5'}}>
      <div style={{height:36,display:'flex',alignItems:'center',gap:6,background:'#fffdfc',borderBottom:'1px solid #eadfdb',paddingLeft:15}}>{['#d7b0b3','#e7d3bf','#c6d1c0'].map(c=><div key={c} style={{width:7,height:7,borderRadius:9,background:c}}/>)}<span style={{fontSize:11,color:'#8a7479',marginLeft:18}}>Make My Marriage / website preview</span></div>
      <div style={{position:'relative',height:460,overflow:'hidden',opacity}}>
        <Img src={asset('crop-'+scene.section+'.png')} style={{display:'block',width:642,height:'auto',transform:`translateY(${shift}px)`}}/>
        <div style={{position:'absolute',bottom:0,height:25,left:0,right:0,background:'linear-gradient(transparent,#fbf7f4aa)'}}/>
      </div>
    </div>
    {caption?<div style={{position:'absolute',left:85,right:85,bottom:45,minHeight:34,textAlign:'center',fontSize:25,fontWeight:500,lineHeight:1.35,color:'#382a2e',padding:'11px 20px',background:'rgba(255,255,255,.95)',borderRadius:12}}>{caption.text}</div>:null}
    <div style={{position:'absolute',bottom:19,left:56,fontSize:10,letterSpacing:1.1,color:'#9d8587'}}>SOFTWARE SHOWCASE · ACTUAL WEBSITE SCREENSHOT</div>
    <div style={{position:'absolute',bottom:19,right:54,fontSize:10,color:'#9d8587'}}>Page examples are illustrative</div>
    <div style={{position:'absolute',bottom:0,left:0,height:3,width:`${frame/props.durationFrames*100}%`,background:'#913447'}}/>
  </AbsoluteFill>;
};
