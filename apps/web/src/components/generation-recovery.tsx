"use client";
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {GenerationRecoverySchema,QueuedResultSchema,type GenerationRecovery} from '@contracts';
import {accountRequest,AccountError} from '@/lib/auth-browser';
import {Button,Notice} from '@/components/ui';
const messages:Record<GenerationRecovery['reason'],string>={
 daily_limit:'The daily AI request allowance has been reached. It resets at 00:00 UTC. Your saved draft and valid completed work are preserved. Check recovery options after the reset; a new generation cannot bypass the allowance.',
 retry:'A temporary processing problem stopped this video. Retry uses the same saved input and valid completed work. Your current draft edits are not included. Remaining processing limits still apply; additional provider usage may occur.',
 edit_input:'Review your topic, audience and notes on the saved draft page. Save your corrections and choose Generate to create a new request; the stopped request will stay unchanged.',
 inputs_expired:'Required media or recovery files are no longer available. Review the saved form and create a new request. A new request may use AI resources.',
 budget_exhausted:'This request reached its recovery limits. Retry cannot reset those limits. You may review the draft and deliberately submit a new generation if account history and daily allowances permit. Shared AI limits still apply.',
 operator_required:'This failure needs the operator to check the processing configuration or an uncertain provider response. Automatic retry is unavailable. Your draft is preserved.',
 state_conflict:'This request can no longer be retried. Check the latest generation status.',unavailable:'This saved request is no longer available for recovery.'
};
export function GenerationRecovery({jobId,onRetrying,onRecovered,projectId,stage}:{jobId:string;projectId?:string;stage?:string;onRetrying:(active:boolean)=>void;onRecovered:()=>void}){
 const [recovery,setRecovery]=useState<GenerationRecovery|null>(null),[error,setError]=useState(''),[pending,setPending]=useState(false),[readVersion,setReadVersion]=useState(0),[uncertain,setUncertain]=useState(false);
 const identity=useRef<string|null>(null),busy=useRef(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{let active=true;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  accountRequest(`jobs/${jobId}/recovery`,undefined,controller.signal).then(v=>{if(active){setRecovery(GenerationRecoverySchema.parse(v));setError('');}}).catch(()=>{if(active)setError('We couldn’t check recovery options. Your saved draft is preserved.');}).finally(()=>clearTimeout(timer));
  return()=>{active=false;clearTimeout(timer);controller.abort();};
 },[jobId,readVersion]);
 async function retry(){
  if(busy.current)return;busy.current=true;setPending(true);setError('');onRetrying(true);identity.current??=crypto.randomUUID();
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{QueuedResultSchema.parse(await accountRequest(`jobs/${jobId}/retry`,{method:'POST',body:{},idempotencyKey:identity.current},controller.signal));if(alive.current){identity.current=null;setUncertain(false);setReadVersion(v=>v+1);onRecovered();}}
  catch(cause){if(alive.current){const ambiguous=!(cause instanceof AccountError)||cause.status>=500&&cause.code!=='GENERATION_PAUSED';setUncertain(ambiguous);onRetrying(ambiguous);setError(ambiguous?'We couldn’t confirm the retry. Check this same retry request before starting another video.':cause instanceof Error?cause.message:'Retry is unavailable.');}}
  finally{clearTimeout(timer);busy.current=false;if(alive.current)setPending(false);}
 }
 const edit=()=>{const topic=document.getElementById('education-topic');topic?.scrollIntoView({block:'center',behavior:'smooth'});topic?.focus();};
 return <div className="generation-recovery" aria-label="Generation recovery">
  {stage&&<p>Stopped during {stage==="story"?"story planning":stage==="voice"?"voice and caption preparation":stage==="render"?"rendering and verification":"input preparation"}. Your saved draft and completed checkpoints are preserved.</p>}
  <h3>{recovery?.reason==='edit_input'?'Your input needs attention':'Recovery options'}</h3>
  {error&&<Notice error onRetry={uncertain?undefined:()=>setReadVersion(v=>v+1)}>{error}</Notice>}
  {!recovery&&!error&&<p role="status">Checking recovery options…</p>}
  {recovery&&<p id="retry-unavailable-reason">{messages[recovery.reason]}</p>}
  <p className="generation-checked">Generation reference: {jobId}</p>
  {recovery?.reason==="operator_required"&&<Link className="generation-back" href="/contact">Contact the creator with this reference</Link>}
  <div className="education-action-buttons">
   {recovery?.reason==='daily_limit'&&<Button variant="secondary" onClick={()=>setReadVersion(v=>v+1)}>Check daily allowance</Button>}
   {(recovery?.reason==='retry'||uncertain)&&<Button pending={pending} pendingLabel="Confirming retry…" onClick={()=>void retry()}>{uncertain?'Check retry request':'Retry generation'}</Button>}
   {recovery&&recovery.reason!=="retry"&&!uncertain&&<Button variant="secondary" disabled aria-describedby="retry-unavailable-reason">Retry unavailable</Button>}
   {projectId?<Link className="button button-secondary" href={`/projects/${projectId}`}>Edit saved draft</Link>:recovery&&["edit_input","inputs_expired","budget_exhausted"].includes(recovery.reason)&&<Button variant="secondary" onClick={edit}>Edit input</Button>}
  </div>
 </div>;
}
