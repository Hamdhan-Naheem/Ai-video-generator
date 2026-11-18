"use client";
import {DeleteVideo,VideoDeletionNotice} from '@/components/delete-video';
import type {DeleteVideoResult} from '@contracts';
import {useCallback,useEffect,useRef,useState} from 'react';
import {EducationResultSchema,EducationMediaGrantSchema,type EducationResult,type EducationMediaGrant} from '@contracts';
import {accountRequest,AccountError} from '@/lib/auth-browser';
import {Button,Notice,StatusBadge} from '@/components/ui';
function applyCaptions(node:HTMLVideoElement|null,show:boolean){const track=node?.textTracks[0];if(track)track.mode=show?'showing':'disabled';}
type LocalGrant=EducationMediaGrant&{localDeadline:number};
type Media={video:LocalGrant;vtt:EducationMediaGrant|null;poster:EducationMediaGrant|null;epoch:number};
export function EducationResultPlayer({projectId,revisionId}:{projectId:string;revisionId:string}){
 const [deleted,setDeleted]=useState<DeleteVideoResult|null>(null);
 const focusDeletedHeading=useCallback((node:HTMLHeadingElement|null)=>{node?.focus();},[]);
 const [result,setResult]=useState<EducationResult|null>(null),[media,setMedia]=useState<Media|null>(null),[error,setError]=useState(''),[mediaError,setMediaError]=useState(''),[loading,setLoading]=useState(false),[download,setDownload]=useState(''),[captions,setCaptions]=useState(false),[expired,setExpired]=useState(false),[refresh,setRefresh]=useState(0);
 const player=useRef<HTMLVideoElement|null>(null),alive=useRef(true),controllers=useRef(new Set<AbortController>()),known=useRef<EducationResult|null>(null),current=useRef<Media|null>(null),busy=useRef(false),downloading=useRef(false),deadline=useRef(0),autoRenewed=useRef(-Infinity),restore=useRef({time:0,play:false}),captionMode=useRef(false),captionReady=useRef(false);
 const clear=useCallback(()=>{captionReady.current=false;const node=player.current;if(node){node.pause();node.removeAttribute('src');node.load();}current.current=null;if(alive.current)setMedia(null);},[]);
 useEffect(()=>{alive.current=true;const requests=controllers.current;return()=>{alive.current=false;for(const c of requests)c.abort();clear();};},[clear]);
 const trackChanged=useCallback(()=>{if(!captionReady.current)return;const show=player.current?.textTracks[0]?.mode==='showing';captionMode.current=show;setCaptions(show);},[]);
 const attachPlayer=useCallback((node:HTMLVideoElement|null)=>{const old=player.current;captionReady.current=false;old?.textTracks.removeEventListener('change',trackChanged);player.current=node;node?.textTracks.addEventListener('change',trackChanged);if(old&&old!==node)queueMicrotask(()=>{if(player.current!==old){old.pause();old.removeAttribute('src');old.load();}});},[trackChanged]);
 const request=useCallback(async(kind:'video'|'vtt'|'srt'|'thumbnail',asDownload=false)=>{
  const started=performance.now(),requests=controllers.current,controller=new AbortController();requests.add(controller);const timer=setTimeout(()=>controller.abort(),20000);
  try{const value=EducationMediaGrantSchema.parse(await accountRequest(`projects/${projectId}/results/${revisionId}/access`,{method:'POST',body:{kind,download:asDownload}},controller.signal));if(value.revisionId!==revisionId||value.kind!==kind||value.download!==asDownload)throw Error('Invalid media response');return {...value,localDeadline:started+Date.parse(value.expiresAt)-Date.parse(value.serverTime)};}
  finally{clearTimeout(timer);requests.delete(controller);}
 },[projectId,revisionId]);
 const reloadPlayer=useCallback(async()=>{
  if(busy.current||known.current?.status!=='ready'||performance.now()>=deadline.current)return;
  busy.current=true;setLoading(true);setMediaError('');const node=player.current;restore.current={time:node?.currentTime??0,play:!!node&&!node.paused&&!node.ended};
  try{const values=await Promise.allSettled([request('video'),request('vtt'),request('thumbnail')]);if(!alive.current)return;if(values[0].status==='rejected')throw values[0].reason;if(performance.now()>=values[0].value.localDeadline)throw new AccountError('This private link expired before loading. Reload the player.',409,'GRANT_EXPIRED');
   if(performance.now()>=deadline.current){clear();setExpired(true);return;}
   const next={video:values[0].value,vtt:values[1].status==='fulfilled'?values[1].value:null,poster:values[2].status==='fulfilled'?values[2].value:null,epoch:Date.now()};current.current=next;setMedia(next);if(!next.vtt)setMediaError('Captions could not load. Reload the player to try again.');
  }catch(cause){if(alive.current){setMediaError(cause instanceof AccountError?cause.message:'The video could not load. Reload the player to try again.');if(cause instanceof AccountError&&[401,403,404,410].includes(cause.status)){clear();setRefresh(v=>v+1);}}}
  finally{busy.current=false;if(alive.current)setLoading(false);}
 },[request,clear]);
 useEffect(()=>{
  if(deleted)return;
  let active=true;const requestedAt=performance.now(),requests=controllers.current,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);requests.add(controller);
  accountRequest(`projects/${projectId}/results/${revisionId}`,undefined,controller.signal).then(raw=>{
   if(!active)return;const value=EducationResultSchema.parse(raw);if(value.revisionId!==revisionId)throw Error('Result mismatch');known.current=value;setResult(value);setError('');
   deadline.current=value.expiresAt?requestedAt+Math.max(0,Date.parse(value.expiresAt)-Date.parse(value.serverTime)):0;
   const ended=value.status==='expired'||value.status==='ready'&&value.expiresAt!==null&&performance.now()>=deadline.current;setExpired(ended);if(value.status!=='ready'||ended){clear();return;}if(!current.current)void reloadPlayer();
  }).catch(cause=>{if(active){setError(cause instanceof AccountError?cause.message:'We couldn’t load this result. Your draft is preserved.');if(cause instanceof AccountError&&[401,403,404].includes(cause.status)){clear();known.current=null;setResult(null);}}}).finally(()=>{clearTimeout(timer);requests.delete(controller);});
  return()=>{active=false;clearTimeout(timer);controller.abort();requests.delete(controller);};
 },[projectId,revisionId,refresh,reloadPlayer,clear,deleted]);
 useEffect(()=>{
  if(deleted||!result?.expiresAt||result.status!=='ready')return;
  const expire=()=>{if(performance.now()>=deadline.current){setExpired(true);clear();}};
  const timer=setTimeout(expire,Math.min(Math.max(1,deadline.current-performance.now()+100),2147480000));
  const check=()=>{if(!document.hidden){expire();setRefresh(v=>v+1);}};window.addEventListener('focus',check);window.addEventListener('online',check);document.addEventListener('visibilitychange',check);
  return()=>{clearTimeout(timer);window.removeEventListener('focus',check);window.removeEventListener('online',check);document.removeEventListener('visibilitychange',check);};
 },[result,clear,deleted]);
 const renew=()=>{if(performance.now()>=deadline.current){setExpired(true);clear();return;}if(performance.now()-autoRenewed.current<30000)return;autoRenewed.current=performance.now();void reloadPlayer();};
 const onInteraction=()=>{const active=current.current;if(active&&active.video.localDeadline-performance.now()<=5000)renew();};
 async function save(kind:'video'|'srt'|'vtt'){
  if(downloading.current||expired||known.current?.status!=='ready')return;downloading.current=true;setDownload(kind);setMediaError('');
  try{const grant=await request(kind,true);if(!alive.current)return;if(performance.now()>=deadline.current){setExpired(true);clear();return;}if(performance.now()>=grant.localDeadline)throw new AccountError('Download authorization expired. Try again.',409,'GRANT_EXPIRED');const link=document.createElement('a');link.href=grant.url;link.download=`education-${revisionId}.${kind==='video'?'mp4':kind}`;link.rel='noreferrer';document.body.append(link);link.click();link.remove();}
  catch(cause){if(alive.current){setMediaError(cause instanceof AccountError?cause.message:'Download could not start. Try again.');if(cause instanceof AccountError&&[401,403,404,410].includes(cause.status)){clear();setRefresh(v=>v+1);}}}
  finally{downloading.current=false;if(alive.current)setDownload('');}
 }
 if(deleted)return <section className="education-result ui-panel" aria-label="Video result"><h2 tabIndex={-1} ref={focusDeletedHeading}>Video deleted</h2><VideoDeletionNotice projectId={projectId} receipt={deleted}/></section>;
 const unavailable=result?.status==='unavailable',ready=result?.status==='ready'&&!expired;
 return <section className="education-result ui-panel" aria-label="Video result">
  {error&&<Notice error onRetry={()=>setRefresh(v=>v+1)}>{error}</Notice>}
  {!result&&!error&&<p role="status">Loading your video result…</p>}
  {result&&<>
   <div className="result-heading"><div><StatusBadge tone={ready?'success':'warning'}>{expired?'Expired':unavailable?'Unavailable':'Ready'}</StatusBadge><h2>{expired?'This video has expired':unavailable?'This video is unavailable':'Your video is ready'}</h2><p>{result.title}</p></div><span>Version {result.version}</span></div>
   {expired||unavailable?<Notice>{expired?'Generated media is kept for seven days. This video can no longer be played or downloaded. Files you already downloaded remain on your device.':'This result’s files are unavailable. Your project input remains saved.'}</Notice>:<div className="result-grid">
    <div className={`result-preview result-${result.orientation}`}>
     {media?<video key={media.epoch} ref={attachPlayer} controls playsInline crossOrigin="anonymous" preload="metadata" poster={media.poster?.url} src={media.video.url} aria-label="Generated education video" onPlay={onInteraction} onSeeking={onInteraction} onWaiting={onInteraction} onStalled={onInteraction} onError={()=>{setMediaError('Playback was interrupted. Reload the player if it does not resume.');renew();}} onLoadedMetadata={()=>{const node=player.current;if(!node)return;node.currentTime=Math.min(restore.current.time,Math.max(0,node.duration-.1));applyCaptions(node,captionMode.current);captionReady.current=true;if(restore.current.play)void node.play().catch(()=>setMediaError('Your video is ready. Press Play to resume.'));}}>
      {media.vtt&&<track kind="captions" src={media.vtt.url} srcLang="en" label="English" onLoad={()=>{applyCaptions(player.current,captionMode.current);}} onError={()=>setMediaError('Captions could not load. Reload the player to try again.')}/>}
     </video>:<div className="result-placeholder" role="status">{loading?'Loading private video…':'Use Reload player to load your video.'}</div>}
     <div className="result-player-actions"><Button variant="secondary" disabled={!media?.vtt} aria-pressed={captions} onClick={()=>{const next=!captions;captionMode.current=next;setCaptions(next);applyCaptions(player.current,next);}}>Captions {captions?'on':'off'}</Button><Button variant="quiet" pending={loading} onClick={()=>void reloadPlayer()}>Reload player</Button></div>
     <p>English · {result.orientation==='portrait'?'Portrait 9:16':'Landscape 16:9'} · 720p · {result.durationMs?`${(result.durationMs/1000).toFixed(1)} seconds`:`${result.targetSeconds}-second target`}</p>
    </div>
    <aside className="result-downloads" aria-label="Download video"><h3>Download video</h3><Button pending={download==='video'} disabled={!!download} pendingLabel="Preparing download…" onClick={()=>void save('video')}>Download MP4</Button><details><summary>More download options</summary><Button variant="secondary" pending={download==='srt'} disabled={!!download} onClick={()=>void save('srt')}>Captions (.srt)</Button><Button variant="secondary" pending={download==='vtt'} disabled={!!download} onClick={()=>void save('vtt')}>Captions (.vtt)</Button></details><Notice>Download before expiry. Generated media is kept for seven days.</Notice></aside>
   </div>}
   {mediaError&&<Notice error>{mediaError}</Notice>}
   {result.completedAt&&<DeleteVideo video={{projectId,revisionId,version:result.version,title:result.title}} onDeleted={receipt=>{for(const c of controllers.current)c.abort();known.current=null;deadline.current=0;clear();setDeleted(receipt);}}/>}
   <p className="result-expiry">{expired?'Expired on ':unavailable?'Retention deadline: ':'Available until '}{result.expiresAt?new Date(result.expiresAt).toLocaleString():'the retention deadline'}.</p>
   <p>Narration: {result.narration.provider==='gemini'?'Gemini TTS':result.narration.provider==='elevenlabs'?'ElevenLabs':'Provider unavailable'}{result.narration.provider==='gemini'&&result.narration.voice?` · ${result.narration.voice}`:''}.</p>
   {result.narration.provider==='elevenlabs'&&<Notice>Generated with <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer">ElevenLabs</a>. Personal learning use only; include attribution when publishing.</Notice>}
  </>}
 </section>;
}
