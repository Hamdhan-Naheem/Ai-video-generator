import {createClient} from '@supabase/supabase-js';
import type {StateReader} from './workspaces.ts';
export function workspaceStateReader(url:string,key:string):StateReader{
 let serverTime='';const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,init)=>{const response=await fetch(input,{...init,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});serverTime=response.headers.get('date')??'';return response;}}});
 return async record=>{const j=await client.from('jobs').select('id,project_id,revision_id,kind,status,finished_at,lease_expires_at').eq('id',record.jobId).maybeSingle();if(j.error)throw Error('WORKSPACE_SERVICE_UNAVAILABLE');if(!j.data)return null;
  const revision=await client.from('revisions').select('id,expires_at').eq('id',record.revisionId).maybeSingle();if(revision.error||!revision.data)throw Error('WORKSPACE_SERVICE_UNAVAILABLE');
  return{jobId:j.data.id,projectId:j.data.project_id,revisionId:j.data.revision_id,kind:j.data.kind,status:j.data.status,finishedAt:j.data.finished_at,leaseExpiresAt:j.data.lease_expires_at,revisionExpiresAt:revision.data.expires_at,serverTime};
 };
}
