import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Teacher} from './Teacher.js';

export type SolarPreviewProps = {stage: number; portrait: boolean; live?: boolean; mouth?: string; gesture?: string; progress?: number; night?: number};
const beats = [
  {name: 'A home powered by sunshine', line: 'Sunlight carries energy. Solar panels help us use it.', tag: '01 / THE SOURCE'},
  {name: 'Light becomes electrical energy', line: 'Solar cells convert some sunlight into direct-current electricity.', tag: '02 / THE PANELS'},
  {name: 'The inverter makes it usable', line: 'An inverter changes direct current into alternating current for the home.', tag: '03 / THE INVERTER'},
  {name: 'Energy reaches the home', line: 'The electricity can power lights and appliances while sunlight is available.', tag: '04 / THE HOME'},
];
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Original code-drawn scenery. This is a visual prototype, not a generated lesson.
// Stage is explicit: no topic keyword matching or arbitrary model-authored SVG.
export const SolarExplainer: React.FC<SolarPreviewProps> = ({stage, portrait, live=false, mouth='X', gesture='point', progress=0, night=0}) => {
  const frame = useCurrentFrame();
  const beat = beats[stage]!;
  const sunScale = 1 + Math.sin(frame / 22) * .025;
  const pulse = (frame % 90) / 90;
  const power = stage >= 2 && night<.6;
  const zoom = live ? 1 + (stage===1?.12:stage===2?.08:0)*Math.sin(Math.PI*Math.min(1,progress)) : 1;
  const focus = stage===1?[760,230]:[515,420];
  const lit = stage >= 3 && (!live || progress>.1) && night<.6;
  const worldY = portrait ? 300 : 107;
  const worldScale = portrait ? .7 : .92;
  const worldX = portrait ? -70 : 40;
  const rays = [[286,132,690,258],[305,101,748,236],[322,71,805,212]];
  const energyPath = 'M760 260 L760 309 Q760 325 744 325 L580 325 L580 437 L515 437 L515 518 L650 518 L650 467';
  return <AbsoluteFill style={{background:'#f8faf3',fontFamily:'Arial, sans-serif',color:'#243c38',overflow:'hidden'}}>
    <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,rgb('+(231-night*1)+','+(245-night*12)+','+(250-night*5)+') 0%,#f7fbf5 62%,#fff8e8 100%)'}}/>
    <div style={{position:'absolute',left:portrait?35:58,right:40,top:portrait?40:30,fontSize:14,fontWeight:700,letterSpacing:2.5,color:'#557b70'}}>FIELD NOTES · SOLAR ENERGY</div>
    <div style={{position:'absolute',left:portrait?35:58,right:35,top:portrait?83:65,fontSize:portrait?39:38,fontWeight:700,letterSpacing:-1,lineHeight:1.12}}>{beat.name}</div>
    <div style={{position:'absolute',left:worldX,top:worldY,width:1280,height:560,transform:`scale(${worldScale})`,transformOrigin:'top left'}}>
      <svg viewBox="0 0 1280 560" width="1280" height="560" aria-label="Sunlight reaches rooftop solar panels, connected through an inverter to a home">
        <defs>
          <linearGradient id="grass" x2="0" y2="1"><stop stopColor="#d8e9b7"/><stop offset="1" stopColor="#c0d79d"/></linearGradient>
          <linearGradient id="panel" x2="1" y2="1"><stop stopColor="#2c6985"/><stop offset="1" stopColor="#173f65"/></linearGradient>
          <linearGradient id="beam"><stop stopColor="#f8cf55" stopOpacity=".6"/><stop offset="1" stopColor="#f8cf55" stopOpacity=".04"/></linearGradient>
        </defs>
        <g transform={`translate(${focus[0]*(1-zoom)} ${focus[1]*(1-zoom)}) scale(${zoom})`}>
        <path d="M0 410 Q240 302 509 404 Q805 325 1280 390 L1280 560 L0 560Z" fill="#e4edcf"/>
        <path d="M0 469 Q320 390 630 451 Q1050 375 1280 440 L1280 560 L0 560Z" fill="url(#grass)"/>
        <g fill="#fff" opacity=".78" transform={`translate(${Math.sin(frame/150)*7},0)`}>
          <path d="M430 100 Q413 76 445 65 Q453 34 487 52 Q515 43 526 67 Q563 69 553 99Z"/>
          <path d="M1000 74 Q984 50 1013 40 Q1020 18 1050 32 Q1076 22 1085 45 Q1118 44 1115 74Z"/>
        </g>
        <g opacity={1-night} transform={`translate(239 ${90+night*100}) scale(${sunScale})`}>
          <circle r="79" fill="#ffe59b" opacity=".4"/><circle r="55" fill="#ffd15c"/>
          {Array.from({length:12},(_,i)=><path key={i} d="M0 -68 L0 -83" transform={`rotate(${i*30})`} stroke="#edb640" strokeWidth="5" strokeLinecap="round"/>)}
        </g>
        <g opacity={1-night}><path d="M291 117 L321 65 L842 205 L667 278Z" fill="url(#beam)" opacity={stage===0?.6:1}/>
        {rays.map(([x1,y1,x2,y2],i)=><g key={i}>
          <path d={`M${x1} ${y1} L${x2} ${y2}`} stroke="#e8b538" strokeWidth="2" strokeDasharray="7 12" opacity=".38"/>
          <circle cx={x1+(x2-x1)*pulse} cy={y1+(y2-y1)*pulse} r="5" fill="#f6bd38"/>
        </g>)}
        </g>
        {night>0?<g opacity={night}><path d="M258 37 A55 55 0 1 0 280 126 A46 46 0 0 1 258 37Z" fill="#bcc9e3"/><circle cx="347" cy="60" r="3" fill="#a8b9d5"/><circle cx="177" cy="132" r="2" fill="#a8b9d5"/></g>:null}
        {/* Tree sways around its rooted trunk. */}
        <g transform={`rotate(${Math.sin(frame/28)*.8} 1110 461)`}>
          <path d="M1110 460 L1110 304" stroke="#92745b" strokeWidth="16" strokeLinecap="round"/>
          <ellipse cx="1110" cy="285" rx="66" ry="85" fill="#82ad77"/><circle cx="1079" cy="314" r="39" fill="#91b983"/>
          <path d="M1110 360 L1081 333 M1110 330 L1133 307" stroke="#769b68" strokeWidth="5" fill="none"/>
        </g>
        <ellipse cx="810" cy="488" rx="260" ry="22" fill="#7f9e6f" opacity=".16"/>
        <path d="M615 271 L843 153 L1058 271 L1058 467 L615 467Z" fill="#fff8e9" stroke="#d5c7a7" strokeWidth="3"/>
        <path d="M585 283 L843 137 L1084 283 L1054 299 L843 179 L612 300Z" fill="#bd795d"/>
        <path d="M653 259 L808 172 L860 201 L703 290Z" fill="url(#panel)" stroke="#b8d6e2" strokeWidth="4"/>
        <g stroke="#89b2c8" strokeWidth="1.5" opacity=".85">
          <path d="M679 244 L729 275 M705 230 L756 260 M731 215 L782 245 M757 201 L808 231 M783 186 L834 216 M670 270 L826 183 M688 280 L844 193"/>
        </g>
        {stage===1?<path d="M645 260 L808 164 L870 201 L703 298Z" fill="none" stroke="#f2ba3e" strokeWidth="4" strokeDasharray="8 6"/>:null}
        <rect x="645" y="328" width="109" height="95" rx="7" fill={lit?'#ffe7a0':'#c9e4e7'} stroke="#c1b89e" strokeWidth="5"/>
        <path d="M700 330 L700 420 M648 376 L751 376" stroke="#fff9e8" strokeWidth="7"/>
        <rect x="804" y="325" width="87" height="142" rx="7" fill="#91b9a6"/><circle cx="875" cy="402" r="4" fill="#fff4cf"/>
        <rect x="929" y="328" width="94" height="95" rx="7" fill={lit?'#ffe7a0':'#c9e4e7'} stroke="#c1b89e" strokeWidth="5"/>
        <path d="M976 330 L976 420 M931 376 L1021 376" stroke="#fff9e8" strokeWidth="7"/>
        {lit?<g>
          <circle cx="696" cy="366" r="18" fill="#ffca54" opacity=".25"/><path d="M686 352 L706 352 L713 365 L679 365Z" fill="#eab446"/><path d="M696 365 L696 395 M685 396 L707 396" stroke="#b68d3d" strokeWidth="4"/>
          <rect x="944" y="351" width="63" height="39" rx="4" fill="#547c72"/><rect x="949" y="356" width="53" height="28" rx="2" fill="#bfe0d5"/><path d="M976 390 L976 400 M962 401 L989 401" stroke="#547c72" strokeWidth="4"/>
        </g>:null}
        {/* A deliberately visible schematic cable: energy-flow markers, not electrons to scale. */}
        <path d={energyPath} fill="none" stroke={power?'#d9a43a':'#a6b8aa'} strokeWidth="7" strokeLinecap="round"/>
        {power?Array.from({length:7},(_,i)=><circle key={i} r="5.5" fill="#fff5b8" style={{offsetPath:`path('${energyPath}')`,offsetDistance:`${((pulse+i/7)%1)*100}%`}}/>):null}
        <rect x="468" y="398" width="94" height="111" rx="13" fill="#fbfffa" stroke={stage===2?'#d9a43a':'#8da99a'} strokeWidth="3"/>
        <rect x="483" y="413" width="64" height="30" rx="6" fill="#dcefe5"/>
        <path d={power?'M490 429 Q496 410 502 429 T514 429 T526 429 T538 429':'M490 429 L538 429'} stroke="#458c78" strokeWidth="2.5" fill="none"/>
        <circle cx="515" cy="485" r="4" fill={power?'#5eab76':'#bcc7bf'}/>
        <text x="515" y="468" textAnchor="middle" fill="#547569" fontSize="13" fontWeight="700">INVERTER</text>
        <path d="M361 471 Q388 414 411 471 M354 471 Q352 430 329 438" fill="none" stroke="#7eaa73" strokeWidth="5"/>
        <g fill="#86ad78"><ellipse cx="376" cy="444" rx="16" ry="7" transform="rotate(-35 376 444)"/><ellipse cx="345" cy="449" rx="16" ry="7" transform="rotate(35 345 449)"/></g>
        <g fontSize="16" fontWeight="700" fill="#426557">
          {stage<=1?<><rect x="387" y="181" width="132" height="37" rx="18" fill="#fff9df"/><text x="453" y="205" textAnchor="middle">SUNLIGHT</text></>:null}
          {stage===1?<><path d="M792 258 L865 111" stroke="#6a9185" strokeWidth="2"/><text x="869" y="105">SOLAR CELLS</text></>:null}
          {stage>=2?<><rect x="595" y="411" width="105" height="34" rx="17" fill="#fff9df"/><text x="647" y="433" textAnchor="middle">DC energy</text><rect x="559" y="496" width="86" height="34" rx="17" fill="#fff9df"/><text x="602" y="518" textAnchor="middle">AC supply</text></>:null}
        </g>
      </g>
      </svg>
    </div>
    <div style={{position:'absolute',left:portrait?32:40,top:portrait?730:375,width:portrait?175:185,height:portrait?250:265}}><Teacher mouth={mouth} gesture={gesture} frame={frame}/></div>
    <div style={{position:'absolute',left:portrait?225:245,right:portrait?35:65,top:portrait?827:607,display:live?'none':undefined,fontSize:portrait?24:22,lineHeight:1.4,color:'#395e50',maxWidth:portrait?425:650}}>{beat.line}</div>
    <div style={{position:'absolute',left:portrait?35:58,bottom:portrait?66:27,fontSize:12,letterSpacing:1.8,fontWeight:700,color:'#6b8678'}}>{beat.tag}</div>
    <div style={{position:'absolute',right:portrait?35:45,bottom:portrait?66:27,fontSize:12,color:'#6b8678'}}>{live?'ENGLISH · EDUCATION':'VISUAL PREVIEW · NO AUDIO'}</div>
    <div style={{position:'absolute',bottom:0,height:4,width:`${interpolate(stage,[0,3],[25,100],clamp)}%`,background:'#92b899'}}/>
  </AbsoluteFill>;
};
