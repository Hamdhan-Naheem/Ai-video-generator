import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
import type {CleanupClaim,RetentionPort} from './retention.ts';
export function retentionPort(url:string,key:string,owner?:string,signal?:AbortSignal):RetentionPort&{retry(task:string):Promise<unknown>}{
 const runner=randomUUID(),client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,redirect:'error',cache:'no-store',signal:AbortSignal.any([AbortSignal.timeout(15000),...(signal?[signal]:[])])})}});
 async function rpc(name:string,args:Record<string,unknown>):Promise<unknown>{const r=await client.rpc(name,args);if(r.error)throw Error('RETENTION_SERVICE_UNAVAILABLE');return r.data;}
 const action=(operation:string,c?:CleanupClaim)=>rpc('media_cleanup_task',{operation,runner,scope_owner:owner??null,...(c?{task:c.taskId,expected_token:c.leaseToken}:{})});
 return{
  sweep:(apply,batch)=>rpc('sweep_expired_media',{apply_changes:apply,scope_owner:owner??null,page_size:batch}),
  claim:()=>action('claim'),
  remove:async c=>{const r=await client.storage.from(c.bucket).remove([c.objectKey]);if(r.error)throw Error('RETENTION_STORAGE_UNAVAILABLE');},
  finish:c=>action('finish',c),fail:c=>action('fail',c),
  retry:task=>rpc('media_cleanup_task',{operation:'retry',task,scope_owner:owner??null}),
 };
}
