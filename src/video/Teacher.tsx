import React from 'react';

// Original vector artwork: no external image, avatar service or licensed stock asset.
export const Teacher:React.FC<{mouth:string;gesture:string;frame:number}>=({mouth,gesture,frame})=>{
  const blink=frame%137<4;const rest=['A','X'].includes(mouth);
  const height=rest?3:mouth==='B'?8:mouth==='C'?14:mouth==='D'?22:mouth==='E'?17:mouth==='F'?12:8;
  const width=['E','F'].includes(mouth)?14:rest?30:36;
  return <svg viewBox="0 0 280 400" width="100%" height="100%" aria-label="Animated cartoon teacher">
    <ellipse cx="140" cy="386" rx="104" ry="10" fill="#061b26" opacity=".4"/>
    <path d="M91 295 L85 381 L129 381 L141 309 L153 381 L196 381 L188 294" fill="#25384a"/>
    <path d="M88 373 L74 389 Q74 398 130 392 L130 374 M153 374 L153 392 Q207 398 210 389 L195 373" fill="#10212e"/>
    <path d="M95 168 Q140 148 185 168 L205 301 Q140 322 75 301 Z" fill="#f2f6f5"/>
    <path d="M122 160 L140 188 L158 160 M140 189 L137 287" stroke="#bad4d4" strokeWidth="5" fill="none"/>
    <path d="M105 173 Q76 186 57 237 L73 255 L111 203" fill="#e1ebeb"/>
    <path d="M57 232 Q45 254 64 270 Q80 279 84 263 L74 244" fill="#b87d58"/>
    <g transform={gesture==='point'?'rotate(-36 183 187)':'rotate(0 183 187)'}>
      <path d="M176 174 Q211 184 229 224 L212 239 L169 201" fill="#e1ebeb"/>
      <path d="M214 221 Q225 211 237 216 L250 225 Q261 235 248 244 L228 246 L214 237" fill="#b87d58"/>
    </g>
    <rect x="122" y="135" width="36" height="37" rx="12" fill="#a96c4b"/>
    <ellipse cx="83" cy="94" rx="10" ry="18" fill="#b87d58"/><ellipse cx="197" cy="94" rx="10" ry="18" fill="#b87d58"/>
    <rect x="85" y="37" width="110" height="121" rx="49" fill="#c78e67"/>
    <path d="M84 89 Q65 16 125 17 Q197 -4 199 84 L184 64 Q164 76 144 46 Q118 74 90 65 Z" fill="#23323d"/>
    <path d="M101 83 Q114 75 127 82 M153 82 Q168 75 179 84" stroke="#49372b" strokeWidth="4" fill="none"/>
    <g fill="none" stroke="#294356" strokeWidth="4"><rect x="93" y="87" width="40" height="27" rx="9"/><rect x="148" y="87" width="40" height="27" rx="9"/><path d="M133 96 L148 96"/></g>
    {blink?<path d="M104 101 L122 101 M158 101 L177 101" stroke="#243440" strokeWidth="3"/>:<g fill="#243440"><ellipse cx="114" cy="100" rx="4" ry="5"/><ellipse cx="166" cy="100" rx="4" ry="5"/></g>}
    <path d="M139 100 L134 121 L145 121" stroke="#a5694a" strokeWidth="3" fill="none"/>
    <ellipse cx="140" cy="137" rx={width/2} ry={height/2} fill={rest?'#79503d':'#542e2d'}/>
    {!rest&&height>12?<path d="M126 134 Q140 130 154 134" stroke="#f9e9d5" strokeWidth="4"/>:null}
    <rect x="161" y="215" width="28" height="33" rx="3" fill="#28bfa9"/><path d="M168 220 L182 220" stroke="#e2fffa" strokeWidth="3"/>
  </svg>;
};
