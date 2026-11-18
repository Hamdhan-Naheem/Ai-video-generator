"use client";
import {useEffect,useRef,useState} from "react";
import {UploadSnapshotSchema,UploadAllocationSchema,type UploadDto} from "@contracts";
import {accountRequest,AccountError} from "@/lib/auth-browser";
import {transferSource,type TransferState} from "@/lib/source-transfer";
import {Button,Notice} from "@/components/ui";
import type {DraftFormBinding} from "@/components/draft-form";
type Attempt={file:File;key:string;body:unknown;allocation?:UploadDto;transfer:TransferState};
export function SourceUploads({draft,recordings=false}:{draft:DraftFormBinding;recordings?:boolean}){
 const [items,setItems]=useState<UploadDto[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[retry,setRetry]=useState(0);
 const [hasAttempt,setHasAttempt]=useState(false);
 const attempt=useRef<Attempt|null>(null),controller=useRef<AbortController|null>(null),active=useRef(true),lock=useRef(false);
 const busyCallback=useRef(draft.onUploadBusy);useEffect(()=>{busyCallback.current=draft.onUploadBusy;},[draft.onUploadBusy]);
 useEffect(()=>{active.current=true;return()=>{active.current=false;controller.current?.abort();busyCallback.current(false);};},[]);
 useEffect(()=>{let live=true;if(!draft.projectId)return;accountRequest(`projects/${draft.projectId}/uploads`).then(data=>{if(live){setItems(UploadSnapshotSchema.parse(data).items);setLoading(false);setError("");}}).catch(()=>{if(live){setError("Could not load attachments. Try again.");setLoading(false);}});return()=>{live=false;};},[draft.projectId,retry]);
 if(!draft.projectId)return <Notice><span>Save this draft first, then add your private files here.</span><br/><a href="#draft-save-button">Go to Save draft</a></Notice>;
 const projectId=draft.projectId;
 async function sendFile(){
  const current=attempt.current;if(!current||lock.current)return;lock.current=true;setBusy(true);draft.onUploadBusy(true);setError("");setProgress(0);controller.current=new AbortController();
  try{
   if(!current.allocation){const result=UploadAllocationSchema.parse(await accountRequest(`projects/${projectId}/uploads`,{method:"POST",idempotencyKey:current.key,body:current.body}));current.allocation=result.snapshot.items.find(item=>item.uploadId===result.uploadId);if(!current.allocation)throw Error("Could not recover this upload.");if(active.current){setItems(result.snapshot.items);draft.onUploadSnapshot(result.snapshot.project,(current.body as {expectedDraftVersion:number}).expectedDraftVersion+1);}}
   const upload=current.allocation;
   // Recover a committed receipt before attempting to write the immutable object again.
   const recovered=UploadSnapshotSchema.parse(await accountRequest(`uploads/${upload.uploadId}`));const existing=recovered.items.find(item=>item.uploadId===upload.uploadId);
   if(existing?.state!=="received"){
    // The original storage response may be lost: reconcile object receipt first.
    let received=false;
    try{await accountRequest(`uploads/${upload.uploadId}/complete`,{method:"POST",body:{}});received=true;}catch(cause){if(!(cause instanceof AccountError) || cause.status!==409)throw cause;}
    if(!received){await transferSource(current.file,upload,current.transfer,value=>{if(active.current)setProgress(value);},controller.current.signal);await accountRequest(`uploads/${upload.uploadId}/complete`,{method:"POST",body:{}});}
   }
   if(!active.current)return;const snapshot=UploadSnapshotSchema.parse(await accountRequest(`projects/${projectId}/uploads`));setItems(snapshot.items);setProgress(100);attempt.current=null;setHasAttempt(false);
  }catch(cause){if(active.current){setError(cause instanceof Error?cause.message:"Upload failed. Retry when connected.");if(cause instanceof AccountError && cause.code==="DRAFT_VERSION_CONFLICT")draft.onUploadConflict();if(cause instanceof AccountError && cause.status===422 && !current.allocation){attempt.current=null;setHasAttempt(false);}}}
  finally{lock.current=false;if(active.current){setBusy(false);draft.onUploadBusy(false);}}
 }
 function choose(file:File,existing?:UploadDto){
  if(lock.current||attempt.current)return;
  const mime=file.type;const recording=mime==="video/mp4";
  if(!file.size || !["image/png","image/jpeg","image/webp",...(recordings?["video/mp4"]:[])].includes(mime)||file.size>(recording?45000000:5000000)){setError(recordings?"Choose JPEG, PNG or WebP up to 5 MB, or a supported MP4 up to 45 MB.":"Choose JPEG, PNG or WebP up to 5 MB.");return;}
  if(existing && (existing.filename!==file.name || Number(existing.byteSize)!==file.size || existing.mimeType!==mime)){setError("Choose the original file with matching name, type and size, or remove this allocation.");return;}
  attempt.current={file,key:crypto.randomUUID(),body:{expectedDraftVersion:draft.draftVersion,filename:file.name,mimeType:mime,byteSize:String(file.size),role:recording?"recording":"image"},allocation:existing,transfer:{}};setHasAttempt(true);void sendFile();
 }
 async function remove(item:UploadDto){if(lock.current)return;lock.current=true;setBusy(true);draft.onUploadBusy(true);setError("");try{const data=UploadSnapshotSchema.parse(await accountRequest(`uploads/${item.uploadId}`,{method:"DELETE",body:{}}));setItems(data.items);draft.onUploadSnapshot(data.project,draft.draftVersion!+1);if(attempt.current?.allocation?.uploadId===item.uploadId){attempt.current=null;setHasAttempt(false);}}catch(cause){setError(cause instanceof Error?cause.message:"Could not remove this attachment.");}finally{lock.current=false;if(active.current){setBusy(false);draft.onUploadBusy(false);}}}
 return <section className="source-uploads" aria-label="Private attachments" onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();if(busy||draft.conflict||hasAttempt)return;if(event.dataTransfer.files.length!==1){setError("Add one file at a time.");return;}choose(event.dataTransfer.files[0]);}}>
  <p className="field-hint">Files are private. Uploading does not start AI analysis. Received files still need decoding and validation before generation.</p>
  {error&&<Notice error>{error}</Notice>}
  {loading?<p role="status">Loading attachments…</p>:<ul className="source-upload-list">{items.map(item=><li key={item.uploadId}><div><strong>{item.filename}</strong><small>{(Number(item.byteSize)/1000000).toFixed(2)} MB · {item.state==="received"?"Uploaded · awaiting validation":"Awaiting upload"}</small></div><div className="source-upload-actions">{item.state==="allocated"&&<label className="button button-secondary">Choose original file<input type="file" disabled={busy||draft.conflict} accept={item.mimeType} onChange={event=>{const file=event.target.files?.[0];event.target.value="";if(file)choose(file,item);}}/></label>}<Button variant="quiet" disabled={busy||draft.conflict} onClick={()=>void remove(item)}>Remove<span className="sr-only"> {item.filename}</span></Button></div></li>)}</ul>}
  <div className="source-upload-actions"><label className="button button-secondary">Choose file<input type="file" disabled={busy||loading||draft.conflict||hasAttempt} accept={recordings?"image/png,image/jpeg,image/webp,video/mp4":"image/png,image/jpeg,image/webp"} onChange={event=>{const file=event.target.files?.[0];event.target.value="";if(file)choose(file);}}/></label>{busy&&<Button variant="quiet" onClick={()=>controller.current?.abort()}>Pause upload</Button>}{!busy&&hasAttempt&&<Button variant="secondary" onClick={()=>void sendFile()}>Retry upload</Button>}{!busy&&error&&!hasAttempt&&<Button variant="quiet" onClick={()=>{setLoading(true);setRetry(value=>value+1);}}>Reload attachments</Button>}</div>
  {busy&&<div role="status"><progress max={100} value={progress}/><span>{progress}% transferred · receipt confirmation follows</span></div>}
  <p className="field-hint">Up to 8 images (5 MB each){recordings?", one MP4 recording (45 MB, 120 seconds)":""}; 60 MB combined. {recordings&&"Recordings must use H.264 with optional AAC; "}Content checks run before AI processing. Removal detaches a file immediately; storage cleanup may retry.</p>
 </section>;
}
