import "server-only";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
import {authConfig} from "@/lib/auth-server";
import type {Database} from "../../../../shared/database/database.types";
function cleanupClient(timeoutMs:number){
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)return null;
 const signal=AbortSignal.timeout(timeoutMs);
 return createClient<Database>(authConfig().url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal})}});
}
async function cleanup(client:SupabaseClient<Database>,upload:string,owner:string){
 const {data,error}=await client.rpc("cleanup_source_upload",{upload,owner,finish:false});if(error || !data || typeof data!=="object" || Array.isArray(data) || data.bucket!=="sources" || typeof data.objectKey!=="string")return false;
 const removed=await client.storage.from("sources").remove([data.objectKey]);if(removed.error)return false;
 const final=await client.rpc("cleanup_source_upload",{upload,owner,finish:true});return !final.error && !!final.data && typeof final.data==="object" && !Array.isArray(final.data) && final.data.deferRelease!==true;
}
export async function cleanupRemovedSource(upload:string,owner:string){
 try{const client=cleanupClient(30000);return client?await cleanup(client,upload,owner):false;}catch{return false;}
}
// Bounded best effort after the response. Durable tasks and uploads:cleanup
// handle interruption, retries and conservative partial-upload retention.
export async function cleanupRemovedDraftSources(project:string,owner:string){
 try{
  const client=cleanupClient(8000);if(!client)return;
  const draft=await client.from("projects").select("id").eq("id",project).eq("owner_id",owner).eq("draft_state","removed").maybeSingle();
  if(draft.error||!draft.data)return;
  const uploads=await client.from("upload_allocations").select("id").eq("project_id",project).eq("owner_id",owner).eq("state","abandoned").order("created_at").limit(9);
  if(uploads.error||!uploads.data)return;
  await Promise.allSettled(uploads.data.map(upload=>cleanup(client,upload.id,owner)));
 }catch{/* Durable pending work remains available to the cleanup runner. */}
}
