"use client";
import {EducationRun} from '@/components/education-run';
import {GenerationRequestSchema,QueuedResultSchema,type GenerationRequest} from '@contracts';
import Link from "next/link";
import {BrandingForm} from "@/components/branding-form";
import {saveDraftAttempt,type CreateAttempt} from "@/lib/draft-save";
import {useRouter} from "next/navigation";
import {useEffect,useRef,useState} from "react";
import {INITIAL_VIDEO_PREFERENCES,ModeSchema,ProjectCreateRequestSchema,ProjectDtoSchema,type ProjectDto} from "@contracts";
import {AccountError,accountRequest} from "@/lib/auth-browser";
import {CreateVideo} from "@/components/create-video";
import {EducationForm} from "@/components/education-form";
import {SoftwareForm} from "@/components/software-form";
import {Button,Modal,Notice} from "@/components/ui";
import type {DraftFormBinding} from "@/components/draft-form";

export function DraftWorkspace({projectId,selectedMode}: {projectId?:string;selectedMode?:string}) {
 const router=useRouter();const mode=ModeSchema.safeParse(selectedMode);
 const [project,setProject]=useState<ProjectDto|null>(null),[title,setTitle]=useState("");
 const [loading,setLoading]=useState(!!projectId),[pending,setPending]=useState(false);
 const [error,setError]=useState(""),[message,setMessage]=useState(""),[conflict,setConflict]=useState(false);
 const [uploadBusy,setUploadBusy]=useState(false);
 const [loadRetry,setLoadRetry]=useState(0),[loadRetryable,setLoadRetryable]=useState(false);
 const [confirmReload,setConfirmReload]=useState(false),[reloadError,setReloadError]=useState("");
 const [formKey,setFormKey]=useState(0),[dirty,setDirty]=useState(false);
 const [hasGeneration,setHasGeneration]=useState(false);
 const [newGeneration,setNewGeneration]=useState<{input:unknown;preferences:unknown;acknowledgments:unknown}|null>(null);
 const [runActive,setRunActive]=useState(false),[runRefresh,setRunRefresh]=useState(0);
 const generationAttempt=useRef<{key:string;projectId:string;body:GenerationRequest}|null>(null);
 const draftStatus=useRef<HTMLDivElement>(null),focusAfterReload=useRef(false),errorSummary=useRef<HTMLDivElement>(null);
 const saving=useRef(false),createAttempt=useRef<CreateAttempt|null>(null);
 useEffect(()=>{
  let active=true;
  if(!projectId)return;
  const controller=new AbortController();
  accountRequest(`projects/${projectId}`,undefined,controller.signal).then(data=>{
   const saved=ProjectDtoSchema.parse(data);if(active){setProject(saved);setTitle(saved.title);setLoading(false);}
  }).catch(cause=>{if(active){setError(cause instanceof Error?cause.message:"We couldn’t load this draft.");setLoadRetryable(!(cause instanceof AccountError)||![401,403,404,410].includes(cause.status));setLoading(false);}});
  return ()=>{active=false;controller.abort();};
 },[projectId,loadRetry]);
 useEffect(()=>{
  if(!dirty || pending)return;
  const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
  window.addEventListener("beforeunload",warn);return ()=>window.removeEventListener("beforeunload",warn);
 },[dirty,pending]);
 useEffect(()=>{if(error)errorSummary.current?.focus();},[error]);
 const selected=project?.mode??(mode.success?mode.data:null);
 if(!projectId && !selected)return <CreateVideo live/>;
 async function save(input:unknown,preferences:unknown) {
  if(saving.current || conflict || uploadBusy)return;
  const parsed=ProjectCreateRequestSchema.safeParse({mode:selected,title,draftInput:input,preferences});
  if(!parsed.success){setError("Check the draft’s field lengths and supported video settings. Incomplete details are allowed.");return;}
  saving.current=true;setPending(true);setError("");setMessage("");
  try {
   createAttempt.current??={key:crypto.randomUUID(),body:parsed.data};
   const saved=await saveDraftAttempt(project,createAttempt.current,parsed.data,accountRequest);setProject(saved);setTitle(saved.title);setDirty(false);setMessage("Draft saved.");
   if(!projectId)router.replace(`/projects/${saved.id}`);
  } catch(cause){
   setError(cause instanceof Error?cause.message:"We couldn’t confirm the save. Retry the same details or check your dashboard.");
   const recovered=project??createAttempt.current?.receipt;
   if(recovered)setProject(recovered);
   if(cause instanceof AccountError && cause.status===409 && recovered)setConflict(true);
  } finally{saving.current=false;setPending(false);}
 }
 async function generate(input:unknown,preferences:unknown,acknowledgments:unknown){
  const recovering=!!generationAttempt.current;
  if(saving.current||conflict||uploadBusy||runActive)return;
  const parsed=ProjectCreateRequestSchema.safeParse({mode:selected,title,draftInput:input,preferences});
  if(!parsed.success){setError("Check the required Education fields and text limits.");return;}
  saving.current=true;setPending(true);setError("");setMessage("");
  try{
   if(!generationAttempt.current){
    createAttempt.current??={key:crypto.randomUUID(),body:parsed.data};
    const saved=await saveDraftAttempt(project,createAttempt.current,parsed.data,accountRequest);setProject(saved);setTitle(saved.title);setDirty(false);
    const body=GenerationRequestSchema.parse({draftVersion:saved.draftVersion,preferences,acknowledgments});
    generationAttempt.current={key:crypto.randomUUID(),projectId:saved.id,body};
   }
   const attempt=generationAttempt.current;QueuedResultSchema.parse(await accountRequest(`projects/${attempt.projectId}/generations`,{method:"POST",body:attempt.body,idempotencyKey:attempt.key}));
   setRunActive(true);setRunRefresh(v=>v+1);setMessage("Generation submitted. The saved input is frozen for this video.");generationAttempt.current=null;
   if(recovering&&dirty)setMessage("Your original generation is submitted. Your newer edits are still here; save them before opening progress.");
   else router.push(`/projects/${attempt.projectId}/progress`);
  }catch(cause){
   // Only confirmed admission rejections release this request identity. Network,
   // proxy and unreadable-success failures may already have committed a job.
   if(cause instanceof AccountError && ((cause.status>=400 && cause.status<500 && cause.status!==408 && cause.code!=="SERVICE_UNAVAILABLE" && cause.code!=="IDEMPOTENCY_CONFLICT") || (cause.status===503 && cause.code==="GENERATION_PAUSED")))generationAttempt.current=null;
   setError(cause instanceof Error?cause.message:"Generation could not be confirmed. Retry to recover the original request.");
  }
  finally{saving.current=false;setPending(false);}
 }
 async function reloadSaved() {
  if(!project || saving.current)return;saving.current=true;setPending(true);setReloadError("");
  try {const saved=ProjectDtoSchema.parse(await accountRequest(`projects/${project.id}`));setProject(saved);setTitle(saved.title);setFormKey(value=>value+1);setConflict(false);setDirty(false);setError("");focusAfterReload.current=true;setConfirmReload(false);setMessage("The latest saved draft has been loaded.");}
  catch(cause){setReloadError(cause instanceof Error?cause.message:"We couldn’t reload this draft. Your edits are still here.");}
  finally{saving.current=false;setPending(false);}
 }
 if(loading)return <p role="status">Loading your draft…</p>;
 if(projectId && !project)return <section className="ui-panel draft-message"><Notice error onRetry={loadRetryable?()=>{setLoading(true);setError("");setLoadRetry(value=>value+1);}:undefined}>{error||"This draft isn’t available."}</Notice><Link className="button button-secondary" href="/dashboard">Back to dashboard</Link></section>;
 if(!selected)return null;
 const binding:DraftFormBinding={onGenerate:selected==="education"&&!runActive?(input,prefs,ack)=>{if(hasGeneration&&!generationAttempt.current)setNewGeneration({input,preferences:prefs,acknowledgments:ack});else void generate(input,prefs,ack);}:undefined,projectId:project?.id,draftVersion:project?.draftVersion,uploadBusy,onUploadBusy:setUploadBusy,onUploadConflict:()=>{setConflict(true);setError("This draft changed in another tab. Reload saved draft before continuing.");},onUploadSnapshot:(snapshot,expectedVersion)=>{if(snapshot.draftVersion!==expectedVersion){setConflict(true);setError("This draft changed in another tab. Reload saved draft before continuing.");return;}setProject(snapshot);},input:project?.draftInput??{mode:selected,sources:[]},preferences:project?.preferences??INITIAL_VIDEO_PREFERENCES,title,pending,conflict,onTitleChange:value=>{setTitle(value);setDirty(true);setMessage("");},onDirty:()=>{setDirty(true);setMessage("");},onSave:(input,preferences)=>void save(input,preferences)};
 return <div className="draft-workspace" onDragOver={event=>{if(event.dataTransfer.types.includes("Files"))event.preventDefault();}} onDrop={event=>{if(event.dataTransfer.types.includes("Files"))event.preventDefault();}}>
  <div className="draft-status" ref={draftStatus} tabIndex={-1}><Link href="/dashboard">Back to dashboard</Link><span>{project?`Saved draft · version ${project.draftVersion}`:"New draft"}{dirty?" · Unsaved changes":""}</span></div>
  {error && <div ref={errorSummary} tabIndex={-1} role="group" aria-label="Draft action error"><Notice error>{error}</Notice></div>}{message && <Notice tone="success">{message}</Notice>}
  {conflict && <Button variant="secondary" pending={pending} onClick={()=>{setReloadError("");setConfirmReload(true);}}>Reload saved draft (replaces your edits)</Button>}
  <Modal open={confirmReload} onClose={()=>{if(!saving.current)setConfirmReload(false);if(focusAfterReload.current){focusAfterReload.current=false;draftStatus.current?.focus();}}} dismissible={!pending} title="Replace your unsaved edits?">
   <p>Loading the saved draft replaces your current fields and settings with the latest saved version. Copy any edits you want to keep before continuing.</p>
   {reloadError&&<Notice error>{reloadError}</Notice>}
   <div className="dialog-actions"><Button variant="secondary" data-initial-focus disabled={pending} onClick={()=>setConfirmReload(false)}>Keep editing</Button><Button pending={pending} pendingLabel="Loading saved draft…" onClick={()=>void reloadSaved()}>Replace with saved draft</Button></div>
  </Modal>
  <Modal open={newGeneration!==null} onClose={()=>{if(!saving.current)setNewGeneration(null);}} dismissible={!pending} title="Start a new generation?">
   <p>This creates another video request and may use additional AI allowance. To recover a stopped request with its completed work, use Retry on the progress page when available.</p>
   {project&&<Link className="generation-back" href={`/projects/${project.id}/progress`}>View latest progress and recovery</Link>}
   <div className="dialog-actions"><Button variant="secondary" data-initial-focus disabled={pending} onClick={()=>setNewGeneration(null)}>Keep editing</Button><Button pending={pending} onClick={()=>{const value=newGeneration;setNewGeneration(null);if(value)void generate(value.input,value.preferences,value.acknowledgments);}}>Start new generation</Button></div>
  </Modal>
  {selected==="education"&&<EducationRun projectId={project?.id} refresh={runRefresh} onActive={setRunActive} onExisting={setHasGeneration} compact/>}
  {selected==="education"?<EducationForm key={`education-${formKey}`} draft={binding}/>:selected==="software"?<SoftwareForm key={`software-${formKey}`} draft={binding}/>:<BrandingForm key={`branding-${formKey}`} draft={binding}/>}
 </div>;
}
