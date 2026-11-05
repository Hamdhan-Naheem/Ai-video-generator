"use client";
import Link from "next/link";
import {saveDraftAttempt,type CreateAttempt} from "@/lib/draft-save";
import {useRouter} from "next/navigation";
import {useEffect,useRef,useState} from "react";
import {INITIAL_VIDEO_PREFERENCES,ModeSchema,ProjectCreateRequestSchema,ProjectDtoSchema,type ProjectDto} from "@contracts";
import {AccountError,accountRequest} from "@/lib/auth-browser";
import {CreateVideo} from "@/components/create-video";
import {EducationForm} from "@/components/education-form";
import {SoftwareForm} from "@/components/software-form";
import {TextField} from "@/components/form-fields";
import {VideoSettings} from "@/components/video-settings";
import {Button,Notice} from "@/components/ui";
import type {DraftFormBinding} from "@/components/draft-form";

export function DraftWorkspace({projectId,selectedMode}: {projectId?:string;selectedMode?:string}) {
 const router=useRouter();const mode=ModeSchema.safeParse(selectedMode);
 const [project,setProject]=useState<ProjectDto|null>(null),[title,setTitle]=useState("");
 const [loading,setLoading]=useState(!!projectId),[pending,setPending]=useState(false);
 const [error,setError]=useState(""),[message,setMessage]=useState(""),[conflict,setConflict]=useState(false);
 const [formKey,setFormKey]=useState(0),[dirty,setDirty]=useState(false);
 const saving=useRef(false),createAttempt=useRef<CreateAttempt|null>(null);
 useEffect(()=>{
  let active=true;
  if(!projectId)return;
  accountRequest(`projects/${projectId}`).then(data=>{
   const saved=ProjectDtoSchema.parse(data);if(active){setProject(saved);setTitle(saved.title);setLoading(false);}
  }).catch(cause=>{if(active){setError(cause instanceof Error?cause.message:"We couldn’t load this draft.");setLoading(false);}});
  return ()=>{active=false;};
 },[projectId]);
 useEffect(()=>{
  if(!dirty || pending)return;
  const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
  window.addEventListener("beforeunload",warn);return ()=>window.removeEventListener("beforeunload",warn);
 },[dirty,pending]);
 const selected=project?.mode??(mode.success?mode.data:null);
 if(!projectId && !selected)return <CreateVideo live/>;
 async function save(input:unknown,preferences:unknown) {
  if(saving.current || conflict)return;
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
 async function reloadSaved() {
  if(!project || saving.current)return;saving.current=true;setPending(true);setError("");
  try {const saved=ProjectDtoSchema.parse(await accountRequest(`projects/${project.id}`));setProject(saved);setTitle(saved.title);setFormKey(value=>value+1);setConflict(false);setDirty(false);setMessage("The latest saved draft has been loaded.");}
  catch(cause){setError(cause instanceof Error?cause.message:"We couldn’t reload this draft.");}
  finally{saving.current=false;setPending(false);}
 }
 if(loading)return <p role="status">Loading your draft…</p>;
 if(projectId && !project)return <section className="ui-panel draft-message"><Notice error>{error||"This draft isn’t available."}</Notice><Link className="button button-secondary" href="/dashboard">Back to dashboard</Link></section>;
 if(!selected)return null;
 const binding:DraftFormBinding={input:project?.draftInput??{mode:selected,sources:[]},preferences:project?.preferences??INITIAL_VIDEO_PREFERENCES,title,pending,conflict,onTitleChange:value=>{setTitle(value);setDirty(true);setMessage("");},onDirty:()=>{setDirty(true);setMessage("");},onSave:(input,preferences)=>void save(input,preferences)};
 return <div className="draft-workspace">
  <div className="draft-status"><Link href="/dashboard">Back to dashboard</Link><span>{project?`Saved draft · version ${project.draftVersion}`:"New draft"}{dirty?" · Unsaved changes":""}</span></div>
  {error && <Notice error>{error}</Notice>}{message && <Notice tone="success">{message}</Notice>}
  {conflict && <Button variant="secondary" pending={pending} onClick={reloadSaved}>Reload saved draft (replaces your edits)</Button>}
  {selected==="education"?<EducationForm key={`education-${formKey}`} draft={binding}/>:selected==="software"?<SoftwareForm key={`software-${formKey}`} draft={binding}/>:<BrandingDraft key={`branding-${formKey}`} draft={binding}/>}
 </div>;
}
function BrandingDraft({draft}: {draft:DraftFormBinding}) {
 const [duration,setDuration]=useState(String(draft.preferences.targetSeconds)),[orientation,setOrientation]=useState<string>(draft.preferences.orientation);
 return <div className="education-page"><Link className="back-link" href="/projects/new">All video types</Link><div className="page-heading"><h1>Create a product branding video</h1></div><Notice>The full product-branding form is coming later. You can save a project title and video settings now.</Notice><form className="education-workspace" onChange={draft.onDirty} onSubmit={event=>event.preventDefault()}><fieldset className="draft-fields" disabled={draft.pending}><section className="education-source ui-panel draft-message"><TextField label="Project title" maxLength={120} value={draft.title} onChange={event=>draft.onTitleChange(event.target.value)} hint="Optional. A blank title is saved as Untitled product branding video."/></section><aside className="education-settings-column"><VideoSettings prefix="branding-draft" duration={duration} onDurationChange={setDuration} orientation={orientation} onOrientationChange={setOrientation}/></aside><div className="education-actions"><Button variant="secondary" pending={draft.pending} pendingLabel="Saving draft…" disabled={draft.conflict} onClick={()=>draft.onSave(draft.input,{...draft.preferences,targetSeconds:Number(duration),orientation})}>Save draft</Button><Button disabled>Generate video</Button><p className="field-hint">Saving does not start AI processing. The product form, uploads and generation are not connected yet.</p></div></fieldset></form></div>;
}
