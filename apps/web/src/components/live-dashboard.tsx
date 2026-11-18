"use client";
import {formatStorage} from "@/lib/usage";
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
  {error ? <Notice error onRetry={()=>reload.current()} retrying={pending}>{error}</Notice> : !data ? <p role="status" className="live-empty">Loading your projects…</p> : data.recentProjects.length===0 ? <div className="live-empty"><Image src="/illustrations/education.svg" alt="" width={120} height={72}/><h3>Your first project starts here</h3><p>You haven’t saved any projects yet.</p><Link className="button button-primary" href="/projects/new">Create video</Link></div> : <><div className="project-grid">{data.recentProjects.map(project=><article className="project-card live-project-card" key={project.id}><div className="live-project-art"><Image src={`/illustrations/${project.mode}.svg`} alt="" width={120} height={72}/><StatusBadge tone={project.state==="ready" ? "success" : project.state==="failed" ? "error" : project.state==="expired" || project.state==="needs_input" ? "warning" : "neutral"}>{states[project.state]}</StatusBadge></div><div className="project-copy"><h3>{project.title}</h3><p>{modes[project.mode]}</p><p>Last edited <time dateTime={project.updatedAt}>{new Date(project.updatedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</time></p></div>{project.canEditDraft && <div className="draft-card-actions"><Link className="button button-secondary" href={project.mode==="education"&&project.state!=="draft"?`/projects/${project.id}/progress`:`/projects/${project.id}`}>Continue draft</Link></div>}</article>)}</div>{data.projectCount>6 && <p className="account-intro">Showing your six most recently edited projects.</p>}<p className="account-intro">Open a saved draft to continue editing, or <Link href="/videos">open My videos</Link> to play and download completed Education results.</p></>}
 </section>;
 const usagePercent=data?.usage.usedBytes!==null&&data?.usage.usedBytes!==undefined&&data.usage.byteLimit!==null&&BigInt(data.usage.byteLimit)>0n?Number(BigInt(data.usage.usedBytes)*10000n/BigInt(data.usage.byteLimit))/100:0;
 const footer=<>
  {data && !error && <section className="live-studio-summary" aria-label="Studio status"><div className="live-usage"><h2>Video &amp; storage usage</h2><p className="usage-summary"><strong>{data.usage.retainedOutputs}{data.usage.maxOutputs!==null?` of ${data.usage.maxOutputs} saved videos`:' saved videos'}</strong></p><p className="usage-summary">{formatStorage(data.usage.usedBytes)}{data.usage.byteLimit!==null?` of ${formatStorage(data.usage.byteLimit)} used`:' used'}</p>{data.usage.usedBytes!==null&&data.usage.byteLimit!==null&&BigInt(data.usage.byteLimit)>0n&&<meter aria-label="Storage usage" min={0} max={100} value={usagePercent}/>}{!!data.usage.reservedOutputs&&<p>{data.usage.reservedOutputs} video slots reserved for generation.</p>}{data.usage.reservedBytes!==null&&BigInt(data.usage.reservedBytes)>0n&&<p>{formatStorage(data.usage.reservedBytes)} reserved for generation.</p>}<p className="account-intro">Delete a saved video to free its slot. Storage usage updates after safe file cleanup.</p><details><summary>How usage works</summary><p>These are your application allowances. Used storage includes generated video, audio, captions and supporting files. Reservations hold capacity for unfinished generation.</p><dl><div><dt>Reserved video slots</dt><dd>{data.usage.reservedOutputs??'Not configured'}</dd></div><div><dt>Storage reserved</dt><dd>{formatStorage(data.usage.reservedBytes)}</dd></div></dl></details>{!data.usage.accountingConfigured && <p className="account-intro">Usage accounting is not configured. Generation is unavailable until storage limits are set.</p>}</div><div className="live-worker"><h2>Processing computer</h2><p>{data.worker.status==="not_configured" ? "No worker has been configured." : data.worker.status==="online" ? "Worker connected" : "Worker offline"}</p>{data.worker.processingPaused && <p>Processing is paused.</p>}<p className="account-intro">Education generation requires an available processing computer. Other video modes are coming soon.</p></div><p className="live-summary-date">Updated <time dateTime={data.asOf}>{new Date(data.asOf).toLocaleTimeString("en-US")}</time></p></section>}
  <p className="dashboard-preview-note">Drafts are saved to your account. Education is the only generation mode currently available. Software showcase and Product branding generation will be available in a future release.</p>
  <p className="dashboard-retention">Generated videos are available for seven days after completion. Download them before expiry; downloaded copies stay on your device.</p>
 </>;
 return <><p className="live-welcome">Welcome, {displayName}</p><Dashboard live recentContent={recent} footerContent={footer}/></>;
}
