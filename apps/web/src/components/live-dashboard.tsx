"use client";
import Image from "next/image";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {DashboardDtoSchema,type DashboardDto} from "@contracts";
import {Dashboard} from "@/components/dashboard";
import {Button,Notice,StatusBadge} from "@/components/ui";
import {accountRequest} from "@/lib/auth-browser";

const states:Record<DashboardDto["recentProjects"][number]["state"],string>={draft:"Draft",ready:"Ready",expired:"Expired",queued:"Queued",waiting_worker:"Waiting for processing computer",running:"Processing",waiting_quota:"Waiting for provider",cancel_requested:"Stopping",needs_input:"Needs input",failed:"Failed",cancelled:"Cancelled",saved:"Saved"};
const modes={education:"Education",software:"Software showcase",branding:"Product branding"};
function workerLabel(worker:DashboardDto["worker"]) {return worker.status==="not_configured" ? "Worker not configured" : worker.processingPaused ? "Processing paused" : worker.status==="online" ? "Worker connected" : "Worker offline";}
function bytes(value:string|null) {return value===null ? "Not configured" : `${BigInt(value).toLocaleString("en-US")} bytes`;}
export function LiveDashboard({displayName,onProcessingStatus}: {displayName:string;onProcessingStatus:(label:string)=>void}) {
 const [data,setData]=useState<DashboardDto|null>(null),[error,setError]=useState("");
 const [pending,setPending]=useState(false);
 const reload=useRef<()=>void>(()=>{});
 useEffect(()=>{
  let active=true,running=false;
  async function load() {
   if(running)return;running=true;if(active)setPending(true);
   try {
    const result=DashboardDtoSchema.parse(await accountRequest("dashboard"));
    if(active){setData(result);setError("");onProcessingStatus(workerLabel(result.worker));}
   } catch {if(active){setError("We couldn’t load your dashboard. Try again.");onProcessingStatus("Processing status unavailable");}}
   finally {running=false;if(active)setPending(false);}
  }
  const check=()=>{if(document.visibilityState==="visible")void load();};
  reload.current=()=>void load();void load();
  window.addEventListener("focus",check);document.addEventListener("visibilitychange",check);
  const timer=setInterval(check,60_000);
  return ()=>{active=false;clearInterval(timer);window.removeEventListener("focus",check);document.removeEventListener("visibilitychange",check);};
 },[onProcessingStatus]);
 const recent=<section className="recent-projects live-projects" aria-labelledby="recent-title" aria-busy={pending}>
  <div className="recent-heading"><div><h2 id="recent-title">Recent projects</h2>{data && <span className="live-project-count">{data.projectCount} {data.projectCount===1 ? "project" : "projects"}</span>}</div><Button variant="quiet" pending={pending} pendingLabel="Refreshing…" onClick={()=>reload.current()}>Refresh</Button></div>
  {error ? <Notice error onRetry={()=>reload.current()} retrying={pending}>{error}</Notice> : !data ? <p role="status" className="live-empty">Loading your projects…</p> : data.recentProjects.length===0 ? <div className="live-empty"><Image src="/illustrations/education.svg" alt="" width={120} height={72}/><h3>Your first project starts here</h3><p>You haven’t saved any projects yet.</p><Link className="button button-primary" href="/projects/new">Create video</Link></div> : <><div className="project-grid">{data.recentProjects.map(project=><article className="project-card live-project-card" key={project.id}><div className="live-project-art"><Image src={`/illustrations/${project.mode}.svg`} alt="" width={120} height={72}/><StatusBadge tone={project.state==="ready" ? "success" : project.state==="failed" ? "error" : project.state==="expired" || project.state==="needs_input" ? "warning" : "neutral"}>{states[project.state]}</StatusBadge></div><div className="project-copy"><h3>{project.title}</h3><p>{modes[project.mode]}</p><p>Last edited <time dateTime={project.updatedAt}>{new Date(project.updatedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</time></p></div>{project.canEditDraft && <div className="draft-card-actions"><Link className="button button-secondary" href={`/projects/${project.id}`}>Continue draft</Link></div>}</article>)}</div>{data.projectCount>6 && <p className="account-intro">Showing your six most recently edited projects.</p>}<p className="account-intro">Open a saved draft to continue editing. Video playback is coming later.</p></>}
 </section>;
 const footer=<>
  {data && !error && <section className="live-studio-summary" aria-label="Studio status"><div className="live-usage"><h2>Video &amp; storage usage</h2><dl><div><dt>Saved videos</dt><dd>{data.usage.retainedOutputs}{data.usage.maxOutputs!==null ? ` of ${data.usage.maxOutputs} slots` : " · limit not configured"}</dd></div><div><dt>Reserved video slots</dt><dd>{data.usage.reservedOutputs??"Not configured"}</dd></div><div><dt>Storage used</dt><dd>{bytes(data.usage.usedBytes)}</dd></div><div><dt>Storage reserved</dt><dd>{bytes(data.usage.reservedBytes)}</dd></div><div><dt>Storage limit</dt><dd>{bytes(data.usage.byteLimit)}</dd></div></dl>{!data.usage.accountingConfigured && <p className="account-intro">Usage accounting is not configured. Generation is unavailable until storage limits are set.</p>}</div><div className="live-worker"><h2>Processing computer</h2><p>{data.worker.status==="not_configured" ? "No worker has been configured." : data.worker.status==="online" ? "Worker connected" : "Worker offline"}</p>{data.worker.processingPaused && <p>Processing is paused.</p>}<p className="account-intro">Video generation will be connected in a later update.</p></div><p className="live-summary-date">Updated <time dateTime={data.asOf}>{new Date(data.asOf).toLocaleTimeString("en-US")}</time></p></section>}
  <p className="dashboard-preview-note">Drafts are saved to your account. The video library is still a design preview; uploads and generation are coming later.</p>
  <p className="dashboard-retention">Videos expire seven days after completion.</p>
 </>;
 return <><p className="live-welcome">Welcome, {displayName}</p><Dashboard live recentContent={recent} footerContent={footer}/></>;
}
