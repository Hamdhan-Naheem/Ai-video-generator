import {Caption, Storyboard, VideoScene, words} from './contracts.js';

export function validateCaptions(captions:Caption[],duration:number):Caption[]{
  if(!captions.length)throw new Error('No captions returned');let last=0;
  return captions.map(c=>{
    if(!c.text.trim()||!Number.isFinite(c.startMs)||!Number.isFinite(c.endMs)||c.startMs<0||c.startMs<last-25||c.endMs<=c.startMs||c.endMs>duration*1000+150)throw new Error('Invalid or overlapping caption intervals');
    last=c.endMs;return {...c,endMs:Math.min(c.endMs,duration*1000)};
  });
}
export function providerCaptions(a:{characters:string[];character_start_times_seconds:number[];character_end_times_seconds:number[]}):Caption[]{
  if(a.characters.length!==a.character_start_times_seconds.length||a.characters.length!==a.character_end_times_seconds.length)throw new Error('Invalid provider character timing');
  const output:Caption[]=[];let text='',start=0,end=0;
  const flush=()=>{if(text.trim())output.push({text:text.trim(),startMs:start*1000,endMs:end*1000,timestampMs:start*1000,confidence:null});text='';};
  for(let i=0;i<a.characters.length;i++){
    const char=a.characters[i];if(!text)start=a.character_start_times_seconds[i];
    if(/\s/.test(char)){flush();continue;}text+=char;end=a.character_end_times_seconds[i];
  }flush();return output;
}
export function captionGroups(captions:Caption[]):Caption[]{
  const groups:Caption[]=[];let current:Caption|undefined;
  for(const c of captions){
    if(current && current.text.length+c.text.length<65 && c.endMs-current.startMs<4200 && c.startMs-current.endMs<900){current.text+=`${/^\s/.test(c.text)?'':' '}${c.text}`;current.endMs=c.endMs;}
    else {if(current)groups.push(current);current={...c,text:c.text.trim()};}
  }if(current)groups.push(current);return groups;
}
// LCS links recognized words to the real script; it never invents word timestamps.
export function matchWords(script:string, captions:Caption[]){
  const expected=words(script);const observed=captions.flatMap(c=>words(c.text).map(word=>({word,startMs:c.startMs,endMs:c.endMs})));
  if(expected.length>600||observed.length>900)throw new Error('Narration exceeds prototype alignment limits');
  const dp=Array.from({length:expected.length+1},()=>new Uint16Array(observed.length+1));
  for(let i=expected.length-1;i>=0;i--)for(let j=observed.length-1;j>=0;j--)dp[i][j]=expected[i]===observed[j].word?1+dp[i+1][j+1]:Math.max(dp[i+1][j],dp[i][j+1]);
  const matches=new Map<number,number>();let i=0,j=0;
  while(i<expected.length&&j<observed.length){if(expected[i]===observed[j].word){matches.set(i,j);i++;j++;}else if(dp[i+1][j]>=dp[i][j+1])i++;else j++;}
  const coverage=matches.size/Math.max(1,expected.length);if(coverage<0.85)throw new Error(`Speech/script word match ${(coverage*100).toFixed(1)}% is below 85%; inspect narration before rendering`);
  return {expected,observed,matches,coverage};
}
export function timeline(plan:Storyboard,captions:Caption[],audioDuration:number,target:number):{scenes:VideoScene[];durationFrames:number;coverage:number}{
  const script=plan.scenes.map(s=>s.narration).join(' ');const matched=matchWords(script,captions);const max=Math.min(90,target+3);
  if(audioDuration>max)throw new Error(`Narration is ${audioDuration.toFixed(1)}s, above ${max}s. Revise the storyboard; audio will not be clipped.`);
  if(audioDuration<target*0.85)throw new Error(`Narration is only ${audioDuration.toFixed(1)}s. Revise the script instead of padding a mostly silent video.`);
  const durationFrames=Math.max(target*30,Math.ceil(audioDuration*30));let wordOffset=0;
  const starts=plan.scenes.map((scene,index)=>{
    const offset=wordOffset;wordOffset+=words(scene.narration).length;if(index===0)return 0;
    const candidate=[...matched.matches.entries()].find(([expected])=>expected>=offset&&expected<wordOffset);
    if(!candidate)throw new Error(`No measured speech boundary found for ${scene.id}`);
    return Math.round(matched.observed[candidate[1]].startMs/1000*30);
  });
  const scenes=plan.scenes.map((scene,index)=>({plan:scene,startFrame:starts[index],durationFrames:(starts[index+1]??durationFrames)-starts[index]}));
  if(scenes.some(s=>s.durationFrames<15))throw new Error('Scene alignment produced an invalid/too-short scene');
  return {scenes,durationFrames,coverage:matched.coverage};
}
function timestamp(ms:number,separator:string){const n=Math.max(0,Math.round(ms));return `${String(Math.floor(n/3600000)).padStart(2,'0')}:${String(Math.floor(n/60000)%60).padStart(2,'0')}:${String(Math.floor(n/1000)%60).padStart(2,'0')}${separator}${String(n%1000).padStart(3,'0')}`;}
export function exportCaptions(captions:Caption[],vtt=false){return (vtt?'WEBVTT\n\n':'')+captions.map((c,i)=>`${vtt?'':`${i+1}\n`}${timestamp(c.startMs,vtt?'.':',')} --> ${timestamp(c.endMs,vtt?'.':',')}\n${c.text.trim()}\n`).join('\n');}
