"use client";
import Link from "next/link";
import Image from "next/image";
import {useEffect,useRef,useState} from "react";
import {DeleteDraftResultSchema,SavedDraftPageSchema,type SavedDraftPage} from "@contracts";
import {AccountError,accountRequest} from "@/lib/auth-browser";
import {Button,Modal,Notice,StatusBadge} from "@/components/ui";
const modes={education:"Education",software:"Software showcase",branding:"Product branding"};
type Draft=SavedDraftPage["items"][number];
export function SavedDrafts({embedded=false}:{embedded?:boolean}){
 const [data,setData]=useState<SavedDraftPage|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState("");
 const [selected,setSelected]=useState<Draft|null>(null),[deleting,setDeleting]=useState(false),[deleteError,setDeleteError]=useState(""),[success,setSuccess]=useState("");
 const action=useRef<(cursor:string|null)=>void>(()=>{}),failedCursor=useRef<string|null>(null);
 const removed=useRef(new Set<string>()),deleteInFlight=useRef(false),mounted=useRef(false),focusAfterDelete=useRef(false),heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{let active=true,running=false;mounted.current=true;async function load(cursor:string|null){
  if(running)return;running=true;failedCursor.current=cursor;if(active)setBusy(true);
  try{
   const value=SavedDraftPageSchema.parse(await accountRequest("drafts"+(cursor?"?cursor="+encodeURIComponent(cursor):"")));
   if(active){
    // An earlier list request must not restore a deleted card.
    const items=value.items.filter(item=>!removed.current.has(item.id));
    setData(previous=>cursor&&previous?{items:[...new Map([...previous.items,...items].map(item=>[item.id,item])).values()],nextCursor:value.nextCursor}:{items,nextCursor:value.nextCursor});setError("");
   }
  }catch{if(active)setError("We couldn’t load saved drafts. Your saved projects are unchanged. Try again.");}
  finally{running=false;if(active)setBusy(false);}
 };action.current=cursor=>void load(cursor);void load(null);return()=>{active=false;mounted.current=false;action.current=()=>{};};},[]);
 function closeDelete(){if(!deleteInFlight.current){setSelected(null);setDeleteError("");if(focusAfterDelete.current){focusAfterDelete.current=false;heading.current?.focus();}}}
 async function deleteDraft(){
  if(!selected||deleteInFlight.current)return;
  deleteInFlight.current=true;setDeleting(true);setDeleteError("");
  try{
   DeleteDraftResultSchema.parse(await accountRequest(`projects/${selected.id}/draft`,{method:"DELETE",body:{expectedDraftVersion:selected.draftVersion}}));
   removed.current.add(selected.id);
   if(mounted.current){focusAfterDelete.current=true;setData(previous=>previous?{...previous,items:previous.items.filter(item=>item.id!==selected.id)}:previous);setSelected(null);setSuccess(`“${selected.title}” was deleted. Generated videos are preserved. Unused file cleanup has been scheduled.`);}
  }catch(cause){if(mounted.current)setDeleteError(cause instanceof AccountError?cause.message:"We couldn’t confirm deletion. Try again to safely check the same draft.");}
  finally{deleteInFlight.current=false;if(mounted.current)setDeleting(false);}
 }
 return <div className={`saved-drafts-page ${embedded?"library-drafts":""}`}><div className="page-heading saved-drafts-heading"><div>{embedded?<h2 ref={heading} tabIndex={-1}>Drafts</h2>:<h1 ref={heading} tabIndex={-1}>Saved drafts</h1>}<p>Continue or delete your saved Education, Software and Branding drafts.</p></div><Link className={`button button-${embedded?"secondary":"primary"}`} href={embedded?"/drafts":"/projects/new"}>{embedded?"View all drafts":"Create video"}</Link></div>
  <div className="recent-heading"><p className="account-intro">{data?`${data.items.length} saved ${data.items.length===1?"draft":"drafts"} loaded. Refresh to see recent changes.`:"Your private drafts"}</p><Button variant="quiet" pending={busy} disabled={deleting} pendingLabel="Loading…" onClick={()=>action.current(null)}>Refresh</Button></div>
  {success&&<Notice tone="success">{success}</Notice>}
  {error&&<Notice error onRetry={()=>action.current(failedCursor.current)} retrying={busy}>{error}</Notice>}
  {!data&&busy&&<p role="status">Loading saved drafts…</p>}
  {data?.items.length===0&&!data.nextCursor&&!busy&&<section className="live-empty"><h2>No saved drafts yet</h2><p>Choose a video type and Save draft. It will appear here.</p><Link className="button button-secondary" href="/projects/new">Create your first draft</Link></section>}
  {data&&data.items.length>0&&<section className="project-grid" aria-label="Saved drafts" aria-busy={busy}>{data.items.map(item=><article className="project-card live-project-card" key={item.id}><div className="live-project-art"><Image src={`/illustrations/${item.mode}.svg`} alt="" width={120} height={72}/><StatusBadge>Draft</StatusBadge></div><div className="project-copy">{embedded?<h3>{item.title}</h3>:<h2>{item.title}</h2>}<p>{modes[item.mode]}</p><p>Updated <time dateTime={item.updatedAt}>{new Date(item.updatedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</time></p></div><div className="draft-card-actions"><Link className="button button-secondary" href={`/projects/${item.id}`}>Continue draft<span className="sr-only">: {item.title}</span></Link><Button variant="quiet" className="draft-delete-action" disabled={deleting} onClick={()=>{setSelected(item);setDeleteError("");setSuccess("");}}>Delete draft<span className="sr-only">: {item.title}</span></Button></div></article>)}</section>}
  {data?.nextCursor&&<div className="saved-drafts-more"><Button variant="secondary" pending={busy} disabled={deleting} pendingLabel="Loading…" onClick={()=>action.current(data.nextCursor)}>Load more drafts</Button></div>}
  <Modal open={selected!==null} onClose={closeDelete} dismissible={!deleting} title="Delete saved draft?">
   <p>Delete “{selected?.title}”? This removes the saved draft and cannot be undone.</p>
   <p>Generated videos and files used by them will be kept. Unused private files will be scheduled for cleanup.</p>
   {deleteError&&<Notice error>{deleteError}</Notice>}
   <div className="dialog-actions"><Button variant="secondary" data-initial-focus disabled={deleting} onClick={closeDelete}>Cancel</Button><Button variant="danger" pending={deleting} pendingLabel="Deleting…" onClick={()=>void deleteDraft()}>Delete draft</Button></div>
  </Modal>
 </div>;
}
