"use client";
import {EducationResultPlayer} from "@/components/education-result";
import Link from "next/link";
import {GenerationCancellation} from "@/components/generation-cancellation";
import {GenerationRecovery} from "@/components/generation-recovery";
import {useCallback,useEffect,useRef,useState} from "react";
import {EducationRunSchema,type EducationRun as Run} from "@contracts";
import {AccountError,accountRequest} from "@/lib/auth-browser";
import {EDUCATION_STEPS,educationPollDelay,educationStepStates,educationStatus,isEducationActive} from "@/lib/education-progress";
import {Button,Notice} from "@/components/ui";
import {Icon} from "@/components/icons";
type Snapshot={projectId:string;run:Run|null};
type Failure={projectId:string;message:string;permanent:boolean};
export function EducationRun({projectId,refresh,onActive,onExisting,compact=false,standalone=false}:{projectId?:string;refresh:number;onActive:(active:boolean)=>void;onExisting?:(exists:boolean)=>void;compact?:boolean;standalone?:boolean}){
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[failure,setFailure]=useState<Failure|null>(null),[checking,setChecking]=useState(false);
 const recoveryHold=useRef(false);
 const [recoveryHeld,setRecoveryHeld]=useState<{projectId:string;held:boolean}|null>(null);
 useEffect(()=>{recoveryHold.current=false;},[projectId]);
 const latest=useRef<Snapshot|null>(null),retry=useRef<()=>void>(()=>{});
 const refreshRun=useCallback(()=>retry.current(),[]);
 useEffect(()=>{
  if(!projectId){onActive(false);return;}
  let alive=true,busy=false,checkAgain=false,permanent=false,timer:ReturnType<typeof setTimeout>|undefined,controller:AbortController|undefined;
  const known=()=>latest.current?.projectId===projectId?latest.current.run:undefined;
  const clearTimer=()=>{if(timer)clearTimeout(timer);timer=undefined;};
  function schedule(delay:number|null){clearTimer();if(alive&&!permanent&&!document.hidden&&delay!==null)timer=setTimeout(()=>void load(),delay);}
  async function load(){
   if(!alive||permanent||document.hidden)return;
   if(busy){checkAgain=true;return;}
   clearTimer();
   if(!navigator.onLine){setFailure({projectId:projectId!,message:"Your browser is offline. Last known progress and your draft are preserved. Reconnect to check again.",permanent:false});return;}
   busy=true;setChecking(true);if(known()===undefined)onActive(true);
   controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),20000);let delay:number|null=15000;
   try{
    const value=EducationRunSchema.nullable().parse(await accountRequest(`projects/${projectId}/generation`,undefined,controller.signal));
    if(!alive)return;
    const next={projectId:projectId!,run:value};latest.current=next;setSnapshot(next);setFailure(null);onExisting?.(value!==null);onActive(recoveryHold.current||isEducationActive(value));
    delay=educationPollDelay(value);
    // A terminal result needs no recurring polling. Recheck its known expiry once.
    if(value?.status==="succeeded"&&value.expiresAt){const remaining=Date.parse(value.expiresAt)-Date.parse(value.serverTime);if(remaining>0)delay=Math.min(remaining+250,2147480000);}
   }catch(cause){
    if(!alive)return;
    permanent=cause instanceof AccountError&&[401,403,404].includes(cause.status);
    setFailure({projectId:projectId!,permanent,message:permanent?(cause as AccountError).message:"We couldn’t refresh processing status. Last known progress and your draft are preserved. We’ll try again shortly."});
    if(permanent)delay=null;
   }finally{
    clearTimeout(timeout);busy=false;
    if(alive){setChecking(false);if(checkAgain&&!permanent){checkAgain=false;schedule(0);}else schedule(delay);}
   }
  }
  const check=()=>{if(!document.hidden)void load();else clearTimer();};
  retry.current=()=>void load();void load();
  window.addEventListener("focus",check);window.addEventListener("online",check);document.addEventListener("visibilitychange",check);
  return()=>{alive=false;clearTimer();controller?.abort();retry.current=()=>{};window.removeEventListener("focus",check);window.removeEventListener("online",check);document.removeEventListener("visibilitychange",check);};
 },[projectId,refresh,onActive,onExisting]);
 const run=snapshot&&snapshot.projectId===projectId?snapshot.run:null,error=failure?.projectId===projectId?failure:null;
 if(!projectId)return null;
 if(compact)return run||error?<Notice tone={error?"warning":"info"}>{error?"Generation status could not be checked.":educationStatus(run!)} Draft edits apply to future generations. <Link className="generation-back" href={`/projects/${projectId}/progress`}>View progress and recovery</Link></Notice>:null;
 if(!run&&!error&&snapshot?.projectId===projectId)return standalone?<Notice>No generation has been submitted for this project. <Link href={`/projects/${projectId}`}>Return to the draft</Link>.</Notice>:null;
 if(standalone&&run&&["succeeded","expired"].includes(run.status))return <section className="ui-panel generation-progress"><h2>{run.status==="succeeded"?"Your video is ready":"This video has expired"}</h2><p>{educationStatus(run)}</p><Link className="button button-primary" href={`/projects/${projectId}/results/${run.revisionId}`}>Watch and download</Link></section>;
 if(run&&["succeeded","expired"].includes(run.status))return <div className="generation-result-workspace">{error&&<Notice error onRetry={error.permanent?undefined:()=>retry.current()}>{error.message}</Notice>}{!error?.permanent&&<EducationResultPlayer key={run.revisionId} projectId={projectId} revisionId={run.revisionId}/>}<div className="education-action-buttons"><Link href="/dashboard">Back to dashboard</Link><Button variant="quiet" pending={checking} onClick={()=>retry.current()}>Check result status</Button></div></div>;
 const states=run?educationStepStates(run):[],stateLabels={complete:"Complete",current:"In progress",waiting:"Waiting",stopped:"Stopped",upcoming:"Not started",stopping:"Stopping",cancelled:"Cancelled"};
 const showWaiting=run&&isEducationActive(run)&&run.status!=="waiting_quota"&&(run.workerStatus!=="online"||run.claimsPaused&&run.status!=="running");
 return <section className="ui-panel education-section generation-progress" aria-label="Education generation">
  <div className="generation-heading"><div><span className="generation-eyebrow">Education generation</span><h2>{run?.status==="succeeded"?"Your video is ready":run?.status==="expired"?"Video expired":"Your video’s progress"}</h2></div><Button variant="quiet" disabled={!!error?.permanent} pending={checking} pendingLabel="Checking…" onClick={()=>retry.current()}>Check status</Button></div>
  {error&&<Notice error onRetry={error.permanent?undefined:()=>retry.current()} retrying={checking}>{error.message}</Notice>}
  {!run&&!error&&<p role="status">Checking generation status…</p>}
  {run&&<>
   <p className="generation-step-count">Step {run.status==="succeeded"||run.status==="expired"?4:Math.max(1,EDUCATION_STEPS.findIndex(s=>s.id===run.stage)+1)} of 4 · {EDUCATION_STEPS.find(s=>s.id===run.stage)?.title}</p>
   <p className="generation-summary" role="status">{error?"Last known status: ":""}{educationStatus(run)}</p>
   {showWaiting&&<Notice tone="warning">{run.status==="cancel_requested"?"Cancellation is saved. We’re checking that processing has stopped.":run.status==="running"?"We haven’t received a current processing heartbeat. Progress will be checked again; no new video request is needed.":run.claimsPaused?"New processing is paused. Your queued request remains saved.":run.workerStatus==="not_configured"?"An Education processing computer needs to be connected before this request can start.":"Generation will continue when a compatible processing computer is available."}</Notice>}
   {run.status==="waiting_quota"&&<Notice tone="warning">{run.retryAt?<>{Date.parse(run.retryAt)>Date.parse(run.serverTime)?"Provider retry eligible after ":"The last provider retry time was "}<time dateTime={run.retryAt}>{new Date(run.retryAt).toLocaleString()}</time>. Processing will be checked automatically; this is not a completion estimate.</>:"A provider retry time has not been confirmed. Your request is saved; status will be checked automatically."}</Notice>}
   <ol className="generation-stages" aria-label="Generation stages">{EDUCATION_STEPS.map((step,i)=><li key={step.id} className={`generation-step generation-${states[i]}`} aria-current={states[i]==="current"||states[i]==="waiting"?"step":undefined}>
    <span className="generation-step-number" aria-hidden="true">{states[i]==="complete"?<Icon name="check" width="17" height="17"/>:i+1}</span><div className="generation-step-copy"><h3>{step.title}</h3><p>{step.description}</p></div><span className="generation-step-state">{stateLabels[states[i]]}</span>
   </li>)}</ol>
   {(run.stage==="voice"||run.stage==="render")&&run.progress.totalScenes!==null&&<p className="generation-scenes">Narration prepared: {run.progress.completedScenes} of {run.progress.totalScenes} scenes ({Math.round(run.progress.completedScenes/run.progress.totalScenes*100)}% of narration scenes).</p>}
   {isEducationActive(run)&&run.status!=="cancel_requested"&&<p className="generation-note"><Icon name="info" width="17" height="17"/><span>Your request is saved. You can leave this page and return later. Draft edits apply to a future generation. Stages may repeat during automatic corrections.</span></p>}
   {(["failed","needs_input"].includes(run.status)||(recoveryHeld?.projectId===projectId&&recoveryHeld.held))&&!error?.permanent&&<GenerationRecovery key={run.jobId} jobId={run.jobId} projectId={projectId} stage={run.stage} onRetrying={active=>{recoveryHold.current=active;setRecoveryHeld({projectId:projectId!,held:active});onActive(active||isEducationActive(run));}} onRecovered={()=>{recoveryHold.current=false;setRecoveryHeld(null);retry.current();}}/>}
   {(isEducationActive(run)||run.status==="cancelled")&&!error?.permanent&&<GenerationCancellation key={run.jobId} projectId={projectId} run={run} onChanged={refreshRun}/>}
   <p className="generation-checked">Last checked <time dateTime={run.serverTime}>{new Date(run.serverTime).toLocaleTimeString()}</time>.</p>

  </>}
  <Link href="/dashboard" className="generation-back">Back to dashboard</Link>
 </section>;
}
