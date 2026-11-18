"use client";
import {createBrowserClient} from "@supabase/ssr";
import {accountRequest} from "@/lib/auth-browser";
import type {UploadDto} from "@contracts";
export type TransferState={location?:string};
export async function transferSource(file:File,upload:UploadDto,state:TransferState,progress:(value:number)=>void,signal:AbortSignal){
 const config=await accountRequest("upload-config");
 const client=createBrowserClient(config.url,config.anonKey);
 const {data:{session}}=await client.auth.getSession();
 if(!session)throw Error("Sign in again before uploading.");
 const headers={Authorization:`Bearer ${session.access_token}`,apikey:config.anonKey};
 const base=new URL(config.url);
 const allowed=(url:string)=>{const result=new URL(url,base);if(result.origin!==base.origin || !result.pathname.startsWith('/storage/v1/upload/resumable/'))throw Error("Invalid upload destination.");return result.href;};
 function xhr(url:string,method:string,body:Blob|null,extra:Record<string,string>,offset=0):Promise<XMLHttpRequest>{
  return new Promise((resolve,reject)=>{if(signal.aborted){reject(Error("Upload paused."));return;}const req=new XMLHttpRequest();req.open(method,url);req.timeout=120000;for(const [key,value] of Object.entries({...headers,...extra}))req.setRequestHeader(key,value);
   const abort=()=>req.abort();signal.addEventListener("abort",abort,{once:true});const clean=()=>signal.removeEventListener("abort",abort);
   req.upload.onprogress=event=>progress(Math.min(99,Math.floor((offset+event.loaded)/file.size*100)));
   req.onload=()=>{clean();if(req.status>=200 && req.status<300)resolve(req);else {if(req.status===401)window.dispatchEvent(new Event("account-session-expired"));reject(Error("Transfer failed. Retry to resume or confirm the upload."));}};
   req.onerror=req.ontimeout=req.onabort=()=>{clean();reject(Error("Transfer interrupted. Retry when connected."));};req.send(body);
  });
 }
 if(upload.protocol==="standard"){
  const path=upload.objectKey.split('/').map(encodeURIComponent).join('/');
  await xhr(`${base.origin}/storage/v1/object/sources/${path}`,"POST",file,{"Content-Type":upload.mimeType,"x-upsert":"false"});
 }else{
  if(!state.location){const metadata={bucketName:"sources",objectName:upload.objectKey,contentType:upload.mimeType,cacheControl:"0"};
   const response=await xhr(`${base.origin}/storage/v1/upload/resumable`,"POST",null,{"Tus-Resumable":"1.0.0","Upload-Length":String(file.size),"Upload-Metadata":Object.entries(metadata).map(([key,value])=>`${key} ${btoa(value)}`).join(','),"x-upsert":"false"});
   const location=response.getResponseHeader("Location");if(!location)throw Error("The recording upload could not start.");state.location=allowed(location);
  }
  const head=await xhr(allowed(state.location),"HEAD",null,{"Tus-Resumable":"1.0.0"});let offset=Number(head.getResponseHeader("Upload-Offset"));
  if(!Number.isSafeInteger(offset)||offset<0||offset>file.size)throw Error("Invalid recording resume offset.");
  while(offset<file.size){const end=Math.min(offset+6*1024*1024,file.size);const response=await xhr(allowed(state.location),"PATCH",file.slice(offset,end),{"Tus-Resumable":"1.0.0","Upload-Offset":String(offset),"Content-Type":"application/offset+octet-stream"},offset);const next=Number(response.getResponseHeader("Upload-Offset"));if(next!==end)throw Error("Recording resume could not be confirmed.");offset=next;}
 }
 progress(100);
}
