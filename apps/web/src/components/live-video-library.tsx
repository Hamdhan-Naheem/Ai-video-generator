"use client";
import {DeleteVideo,VideoDeletionNotice} from '@/components/delete-video';
import type {DeleteVideoResult} from '@contracts';
import Link from 'next/link';
import Image from 'next/image';
import {useEffect,useRef,useState} from 'react';
import {EducationMediaGrantSchema,SavedVideoPageSchema,type SavedVideo,type SavedVideoPage} from '@contracts';
import {accountRequest} from '@/lib/auth-browser';
import {Button,Notice,StatusBadge} from '@/components/ui';
import {Icon} from '@/components/icons';
import {SavedDrafts} from '@/components/saved-drafts';

function PrivateThumbnail({item}:{item:SavedVideo}){
 const [url,setUrl]=useState<string|null>(null),box=useRef<HTMLDivElement|null>(null);
 useEffect(()=>{
  let active=true,started=false;const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
  async function load(){if(started)return;started=true;timer=setTimeout(()=>controller.abort(),20000);
   try{const grant=EducationMediaGrantSchema.parse(await accountRequest(`projects/${item.projectId}/results/${item.revisionId}/access`,{method:'POST',body:{kind:'thumbnail',download:false}},controller.signal));if(grant.kind!=='thumbnail'||grant.download||grant.revisionId!==item.revisionId)throw Error('Invalid thumbnail');if(active)setUrl(grant.url);}catch{if(active)setUrl(null);}finally{clearTimeout(timer);}
  }
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();void load();}},{rootMargin:'200px'});
  if(box.current)observer.observe(box.current);
  return()=>{active=false;observer.disconnect();controller.abort();clearTimeout(timer);};
 },[item.projectId,item.revisionId,item.serverTime]);
 return <div ref={box} className="library-thumbnail private-thumbnail">{url?<Image unoptimized loading="eager" src={url} width={480} height={270} alt="" onError={()=>setUrl(null)}/>:<Icon name="videos" width="38" height="38"/>}<span className="aspect-badge">{item.orientation==='portrait'?'9:16':'16:9'}</span><span className="thumbnail-play" aria-hidden="true"><Icon name="play" width="24" height="24"/></span></div>;
}
function VideoCard({item,state,onDeleted}:{item:SavedVideo;state:SavedVideo['status'];onDeleted:(receipt:DeleteVideoResult)=>void}){
 const result=`/projects/${item.projectId}/results/${item.revisionId}`,ready=state==='ready';
 return <article className="library-row ui-panel" aria-label={`${item.title}, version ${item.version}`}>
  {ready?<PrivateThumbnail item={item}/>:<div className="library-thumbnail unavailable-thumbnail"><Icon name="videos" width="32" height="32"/><span>{state==='expired'?'Video expired':'Media unavailable'}</span><span className="aspect-badge">{item.orientation==='portrait'?'9:16':'16:9'}</span></div>}
  <div className="library-copy"><div className="library-tags"><StatusBadge tone={ready?'success':'warning'}>{ready?'Ready':state==='expired'?'Expired':'Unavailable'}</StatusBadge><span className="version-chip">Version {item.version}</span></div><h3>{item.title}</h3><p>Education · {item.durationMs?`${(item.durationMs/1000).toFixed(1)} seconds`:`${item.targetSeconds}-second target`} · {item.orientation==='portrait'?'Portrait (9:16)':'Landscape (16:9)'} · 720p</p>
   {ready?<span className="caption-chip"><Icon name="captions" width="16" height="16"/>English captions available</span>:<p>{state==='expired'?'This video has expired. Its media can no longer be played or downloaded.':'The files for this result are unavailable. Try refreshing the list.'}</p>}
   <p className="expiry-line"><Icon name="clock" width="16" height="16"/>{state==='expired'?'Expired on ':'Available until '}<time dateTime={item.expiresAt}>{new Date(item.expiresAt).toLocaleString()}</time></p>
  </div><div className="library-actions"><Link className={`button button-${ready?'secondary':'quiet'}`} href={result} prefetch={false}>{ready?<Icon name="play-circle"/>:<Icon name="info"/>}{ready?'Open video':'View result'}<span className="sr-only">: {item.title}, version {item.version}</span></Link>{!ready&&item.canEditDraft&&<Link className="button button-secondary" href={`/projects/${item.projectId}`}>Review input<span className="sr-only">: {item.title}</span></Link>}<DeleteVideo video={item} onDeleted={onDeleted}/></div>
 </article>;
}
export function LiveVideoLibrary(){
 const [refresh,setRefresh]=useState(0),[deleted,setDeleted]=useState<{projectId:string;receipt:DeleteVideoResult}|null>(null);const removed=useRef(new Set<string>()),heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{if(deleted)heading.current?.focus();},[deleted]);
 const [data,setData]=useState<SavedVideoPage|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState(''),[now,setNow]=useState(0);
 const action=useRef<(cursor:string|null)=>void>(()=>{}),failedCursor=useRef<string|null>(null),clock=useRef({started:0,server:0});
 useEffect(()=>{
  let active=true,running=false;let controller:AbortController|null=null;
  async function load(cursor:string|null){if(running)return;running=true;failedCursor.current=cursor;setBusy(true);controller=new AbortController();const started=performance.now(),timer=setTimeout(()=>controller?.abort(),20000);
   try{const value=SavedVideoPageSchema.parse(await accountRequest('videos'+(cursor?'?cursor='+encodeURIComponent(cursor):''),undefined,controller.signal));if(active){clock.current={started,server:Date.parse(value.asOf)};setNow(clock.current.server+Math.max(0,performance.now()-started));setData(previous=>cursor&&previous?{...value,items:[...new Map([...previous.items,...value.items.filter(item=>!removed.current.has(item.revisionId))].map(item=>[item.revisionId,item])).values()]}:{...value,items:value.items.filter(item=>!removed.current.has(item.revisionId))});setError('');}}
   catch{if(active)setError('We couldn’t load your videos. Previously loaded results are still here. Try again.');}
   finally{clearTimeout(timer);running=false;if(active)setBusy(false);}
  }
  action.current=cursor=>void load(cursor);void load(null);return()=>{active=false;controller?.abort();action.current=()=>{};};
 },[refresh]);
 useEffect(()=>{
  const serverNow=clock.current.server+Math.max(0,performance.now()-clock.current.started);
  const deadlines=data?.items.filter(v=>v.status==='ready').map(v=>Date.parse(v.expiresAt)-serverNow).filter(v=>v>0)??[];
  const timer=deadlines.length?setTimeout(()=>setNow(clock.current.server+Math.max(0,performance.now()-clock.current.started)),Math.min(Math.min(...deadlines)+50,2147480000)):null;
  const check=()=>{if(!document.hidden)setNow(clock.current.server+Math.max(0,performance.now()-clock.current.started));};window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);
  return()=>{if(timer!==null)clearTimeout(timer);window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check);};
 },[data,now]);
 const state=(v:SavedVideo)=>Date.parse(v.expiresAt)<=now?'expired':v.status;
 const groups=[['Saved videos','ready'],['Expired videos','expired'],['Unavailable videos','unavailable']] as const;
 return <div className="library-page live-library"><div className="page-heading"><div><h1 ref={heading} tabIndex={-1}>My videos</h1><p>Open your saved videos or continue a draft.</p></div><Link className="button button-primary" href="/projects/new"><Icon name="plus"/>Create video</Link></div>
  {deleted&&<VideoDeletionNotice key={deleted.receipt.revisionId} projectId={deleted.projectId} receipt={deleted.receipt}/>}
  <section aria-label="Generated video library" aria-busy={busy}>
   <div className="recent-heading"><p className="account-intro">{data?<>Usage checked <time dateTime={data.asOf}>{new Date(data.asOf).toLocaleTimeString()}</time>. Refresh for the latest availability.</>:'Your private Education videos'}</p><Button variant="quiet" pending={busy} pendingLabel="Refreshing…" onClick={()=>action.current(null)}>Refresh videos</Button></div>
   <div className="library-summaries"><div className="ui-panel capacity-summary"><div><Icon name="layers"/><strong>{data?`${data.usage.retainedOutputs}${data.usage.maxOutputs!==null?` of ${data.usage.maxOutputs}`:''} saved-video slots used`:'Checking saved-video slots…'}</strong>{data?.usage.maxOutputs!==null&&data?.usage.maxOutputs!==undefined&&data.usage.maxOutputs<=10&&<div className="slot-bars" aria-hidden="true">{Array.from({length:data.usage.maxOutputs},(_,i)=><i className={i<data.usage.retainedOutputs?'slot-used':''} key={i}/>)}</div>}</div><p>Drafts don’t use saved-video slots.{data?.usage.reservedOutputs?` ${data.usage.reservedOutputs} slots reserved for processing.`:''}</p>{data&&!data.usage.accountingConfigured&&<p>Storage allocation is not configured. Generation requires an allocation.</p>}</div><div className="retention-summary"><Icon name="clock"/><div><strong>7-day retention policy</strong><p>Generated videos are available for seven days after completion. Download them before expiry. Downloaded copies stay on your device.</p></div></div></div>
   {error&&<Notice error onRetry={()=>action.current(failedCursor.current)} retrying={busy}>{error}</Notice>}
   {!data&&busy&&<p role="status">Loading your videos…</p>}
   {data?.items.length===0&&!data.nextCursor&&!busy&&<section className="live-empty"><Icon name="videos" width="40" height="40"/><h2>No saved videos yet</h2><p>Create an Education video or continue a draft below. Your completed results will appear here.</p><Link className="button button-primary" href="/projects/new?mode=education">Create your first video</Link></section>}
   {groups.map(([label,kind])=>{const items=data?.items.filter(v=>state(v)===kind)??[];return items.length>0&&<section className="library-section" aria-label={label} key={kind}><h2>{label} <span className="count-badge">{items.length}</span></h2><div className="library-items">{items.map(item=><VideoCard key={item.revisionId} item={item} state={kind} onDeleted={receipt=>{removed.current.add(item.revisionId);setData(previous=>previous?{...previous,items:previous.items.filter(v=>v.revisionId!==item.revisionId)}:previous);setDeleted({projectId:item.projectId,receipt});setRefresh(v=>v+1);}}/>)}</div></section>;})}
   {data?.nextCursor&&<div className="saved-drafts-more"><Button variant="secondary" pending={busy} onClick={()=>action.current(data.nextCursor)}>Load more videos</Button></div>}
  </section><SavedDrafts embedded/>
 </div>;
}
