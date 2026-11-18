"use client";
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import {GenerationCancelResultSchema,type EducationRun} from '@contracts';
import {accountRequest,AccountError} from '@/lib/auth-browser';
import {Button,Modal,Notice} from '@/components/ui';
export function GenerationCancellation({run,onChanged,projectId}:{projectId?:string;run:EducationRun;onChanged:()=>void}){
 const [open,setOpen]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState(''),[uncertain,setUncertain]=useState(false);
 const busy=useRef(false),alive=useRef(true),controller=useRef<AbortController|null>(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;controller.current?.abort();};},[]);
 const send=useCallback(async()=>{
  if(busy.current)return;busy.current=true;setPending(true);setError('');const request=new AbortController();controller.current=request;const timeout=setTimeout(()=>request.abort(),20000);
  try{GenerationCancelResultSchema.parse(await accountRequest(`jobs/${run.jobId}/cancel`,{method:'POST',body:{}},request.signal));if(alive.current){setUncertain(false);setOpen(false);onChanged();}}
  catch(cause){if(alive.current){const unknown=!(cause instanceof AccountError)||cause.status>=500;setUncertain(unknown);setError(unknown?'We couldn’t confirm cancellation. Check the same request again; your draft is preserved.':cause instanceof Error?cause.message:'Cancellation could not be confirmed.');if(!unknown)onChanged();}}
  finally{clearTimeout(timeout);busy.current=false;if(alive.current)setPending(false);}
 },[run.jobId,onChanged]);
 useEffect(()=>{
  if(run.status!=='cancel_requested')return;
  // This idempotent POST reconciles a previously recorded cancellation only.
  // Ordinary generation status GETs remain read-only.
  const check=()=>{if(!document.hidden&&navigator.onLine)void send();};
  const timer=setInterval(check,15000);window.addEventListener('online',check);document.addEventListener('visibilitychange',check);
  return()=>{clearInterval(timer);window.removeEventListener('online',check);document.removeEventListener('visibilitychange',check);};
 },[run.status,send]);
 if(run.status==='cancelled')return <div className="generation-recovery"><h3>Generation cancelled</h3><p>This generation has stopped. Your project input is saved. Previous completed videos keep their existing expiry.</p>{projectId?<Link className="button button-secondary" href={`/projects/${projectId}`}>Review input</Link>:<Button variant="secondary" onClick={()=>{const field=document.getElementById('education-topic');field?.scrollIntoView({block:'center',behavior:'smooth'});field?.focus();}}>Review input</Button>}<p>Reviewing input will not restart generation. Choose Generate video when you’re ready to create a new request.</p></div>;
 const stopping=run.status==='cancel_requested';
 return <div className="generation-recovery" aria-label="Generation cancellation">
  {error&&!open&&<Notice error>{error}</Notice>}
  {stopping?<><h3>Stopping generation</h3><p>Your cancellation is saved. We’re waiting for the processing computer to stop or its current permission to expire. No finished video can be published for this request.</p><p>You can leave this page. Your input remains saved. You can start another generation after this one has stopped.</p><Button variant="secondary" pending={pending} pendingLabel="Checking cancellation…" onClick={()=>void send()}>Check cancellation</Button></>:uncertain?<Button variant="secondary" pending={pending} onClick={()=>void send()}>Check cancellation</Button>:<Button variant="secondary" className="generation-cancel-button" onClick={()=>setOpen(true)}>Cancel generation</Button>}
  <Modal open={open} onClose={()=>{if(!pending)setOpen(false);}} title="Cancel this generation?" dismissible={!pending}>
   <p>We’ll stop this request. Your project input will remain saved, but this generation won’t produce a finished video.</p>
   <Notice>Previous completed video versions keep their existing expiry. Requests already sent to an AI provider may still consume usage.</Notice>
   {error&&<Notice error>{error}</Notice>}
   <p>Dismissing leaves generation running unless cancellation has already been submitted.</p>
   <div className="dialog-actions"><Button variant="secondary" data-initial-focus disabled={pending} onClick={()=>setOpen(false)}>{uncertain?'Close':'Keep generating'}</Button><Button variant="danger" pending={pending} pendingLabel="Requesting stop…" onClick={()=>void send()}>{uncertain?'Check cancellation':'Cancel generation'}</Button></div>
  </Modal>
 </div>;
}
