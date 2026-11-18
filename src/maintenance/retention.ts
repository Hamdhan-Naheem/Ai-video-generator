import {z} from 'zod';
const id=z.uuid(),time=z.iso.datetime({offset:false});
export const SweepSchema=z.strictObject({preview:z.boolean(),expired:z.number().int().nonnegative(),scheduled:z.number().int().nonnegative()});
export const CleanupClaimSchema=z.union([z.strictObject({idle:z.literal(true)}),z.strictObject({taskId:id,assetId:id,bucket:z.literal('artifacts'),objectKey:z.string().regex(/^[a-f0-9-]{36}\/[a-f0-9-]{36}\/[a-f0-9-]{36}\/[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/),leaseToken:z.string().regex(/^[1-9][0-9]*$/),serverTime:time,leaseExpiresAt:time}).superRefine((v,c)=>{const ttl=Date.parse(v.leaseExpiresAt)-Date.parse(v.serverTime);if(ttl<=0||ttl>60000||v.objectKey.split('/')[2]!==v.assetId||BigInt(v.leaseToken)>9223372036854775807n)c.addIssue({code:'custom',message:'Invalid cleanup lease'});})]);
export type CleanupClaim=Exclude<z.infer<typeof CleanupClaimSchema>,{idle:true}>;
export const AckSchema=z.union([z.strictObject({done:z.literal(true)}),z.strictObject({retry:z.literal(true)})]);
export interface RetentionPort{
 sweep(apply:boolean,batch:number):Promise<unknown>;
 claim():Promise<unknown>;
 remove(claim:CleanupClaim):Promise<void>;
 finish(claim:CleanupClaim):Promise<unknown>;
 fail(claim:CleanupClaim):Promise<unknown>;
}
export async function runRetentionCycle(port:RetentionPort,options:{apply?:boolean;batch?:number;owner?:string;signal?:AbortSignal;now?:()=>number}={}){
 const batch=options.batch??25;if(!Number.isInteger(batch)||batch<1||batch>100)throw Error('Invalid retention batch');
 if(options.owner)id.parse(options.owner);options.signal?.throwIfAborted();
 const now=options.now??(()=>performance.now()),sweep=SweepSchema.parse(await port.sweep(options.apply===true,batch));
 if(sweep.preview!==(options.apply!==true))throw Error('Invalid retention preview');
 const stats={...sweep,claimed:0,deleted:0,deferred:0};if(sweep.preview)return stats;
 for(let n=0;n<batch;n++){
  options.signal?.throwIfAborted();const started=now(),value=CleanupClaimSchema.parse(await port.claim());if('idle' in value)break;
  if(options.owner&&value.objectKey.split('/')[0]!==options.owner)throw Error('Cleanup scope mismatch');
  stats.claimed++;const deadline=started+Date.parse(value.leaseExpiresAt)-Date.parse(value.serverTime);
  if(now()>=deadline){stats.deferred++;continue;}
  try{
   await port.remove(value);options.signal?.throwIfAborted();if(now()>=deadline)throw Error('Cleanup lease expired');
   const ack=AckSchema.parse(await port.finish(value));if(!('done' in ack))throw Error('Cleanup not confirmed');stats.deleted++;
  }catch{
   // A lost finish response may already have committed. The idempotent failure
   // acknowledgment confirms Done without repeating a byte/slot release.
   try{const ack=AckSchema.parse(await port.fail(value));if('done' in ack){stats.deleted++;continue;}}catch{/* Expired claims are reclaimed later. */}
   stats.deferred++;
  }
 }
 return stats;
}
export async function watchRetention(cycle:()=>Promise<void>,wait:()=>Promise<void>,signal:AbortSignal){
 while(!signal.aborted){await cycle();if(signal.aborted)break;try{await wait();}catch{if(!signal.aborted)throw Error('Retention timer unavailable');}}
}
