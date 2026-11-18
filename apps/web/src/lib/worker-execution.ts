import 'server-only';
import {createHash} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';
import {EducationVerificationSchema,WorkerExecutionReplySchema,WorkerExecutionRequestSchema} from '@contracts';
import type {Database,Json} from '../../../../shared/database/database.types';
export async function executeWorker(client:SupabaseClient<Database>,credentialHash:string,input:unknown){
 const request=WorkerExecutionRequestSchema.parse(input);
 async function rpc(payload:unknown){const result=await client.rpc('worker_execute',{credential_hash:credentialHash,protocol:1,payload:payload as Json});if(result.error){const code=/^[A-Z0-9]{5}$/.test(result.error.code)?result.error.code:'UNKNOWN';const category=/^(column reference "[a-z_]+" is ambiguous|record "[a-z_]+" has no field "[a-z_]+"|Ready revision requires verified clean export|Export retention must match live revision|Ready export requires available typed artifacts|Revision request is immutable|Asset identity is immutable|Latest result must be a live ready revision)$/.test(result.error.message)?result.error.message:'Database operation failed';console.error(JSON.stringify({workerOperation:request.operation.type,code,category}));throw Object.assign(Error('Worker execution unavailable'),{code:result.error.code});}return WorkerExecutionReplySchema.parse(result.data);}
 const operation=request.operation;
 if(operation.type==='confirm'){
  const descriptor=(await rpc({...request,operation:{type:'describe',assetId:operation.assetId}})).value;
  let verifiedReport;
  if(descriptor.kind==='report'){
   if(Number(descriptor.bytes)>65536)throw Error('Invalid verification report');
   const result=await client.storage.from(String(descriptor.bucket)).download(String(descriptor.objectKey));
   if(result.error||!result.data)throw Error('Verification report unavailable');
   const bytes=Buffer.from(await result.data.arrayBuffer());if(bytes.length>65536||createHash('sha256').update(bytes).digest('hex')!==descriptor.checksum)throw Error('Verification hash mismatch');
   verifiedReport=EducationVerificationSchema.parse(JSON.parse(bytes.toString('utf8')));
  }
  return rpc({...request,...(verifiedReport?{verifiedReport}:{})});
 }
 const response=await rpc(request);
 if(operation.type==='allocate'&&response.value.state==='allocated'){
  const permit=await client.storage.from(String(response.value.bucket)).createSignedUploadUrl(String(response.value.objectKey),{upsert:false});
  if(permit.error||!permit.data)throw Error('Artifact upload is unavailable');
  response.value={...response.value,uploadUrl:permit.data.signedUrl};
 }
 if(operation.type==='read'){
  const permit=await client.storage.from(String(response.value.bucket)).createSignedUrl(String(response.value.objectKey),60);
  if(permit.error||!permit.data)throw Error('Artifact read is unavailable');
  response.value={...response.value,url:permit.data.signedUrl};
 }
 return response;
}
