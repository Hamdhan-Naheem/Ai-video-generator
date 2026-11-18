type DescriptorResult={data:unknown;error:{code?:string}|null};
type Dependencies={
 describe:()=>PromiseLike<DescriptorResult>;
 sign:(bucket:string,objectKey:string,seconds:number)=>PromiseLike<{data:{signedUrl:string}|null;error:unknown}>;
 storageOrigin:string;
 now?:()=>number;
};
function descriptor(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const data=value as Record<string,unknown>;
 if(typeof data.bucket!=='string'||!data.bucket||typeof data.objectKey!=='string'||!data.objectKey||typeof data.expiresAt!=='string')return null;
 const expires=Date.parse(data.expiresAt);return Number.isFinite(expires)?{bucket:data.bucket,objectKey:data.objectKey,expires}:null;
}
const denied=()=>({status:404 as const,code:'NOT_FOUND',message:'This result is unavailable or expired.'});
const unavailable=()=>({status:503 as const,code:'STORAGE_UNAVAILABLE',message:'Private media is temporarily unavailable.'});
/** Never hand out the signed URL until the same owner-authorized object is rechecked. */
export async function authorizeLegacyMedia({describe,sign,storageOrigin,now=Date.now}:Dependencies){
 const initial=await describe();
 if(initial.error)return initial.error.code==='42501'?denied():unavailable();
 const before=descriptor(initial.data);if(!before)return denied();
 const started=now(),seconds=Math.min(60,Math.floor((before.expires-started)/1000)-2);
 if(seconds<1)return denied();
 const permit=await sign(before.bucket,before.objectKey,seconds);
 if(permit.error||!permit.data)return unavailable();
 // Deletion, account disablement and latest-result changes can commit while
 // Storage is signing. Re-run the authoritative descriptor instead of trusting it.
 const confirmed=await describe();
 if(confirmed.error)return confirmed.error.code==='42501'?denied():unavailable();
 const after=descriptor(confirmed.data);if(!after)return denied();
 if(after.bucket!==before.bucket||after.objectKey!==before.objectKey)return unavailable();
 if(Math.min(before.expires,after.expires,started+seconds*1000)<=now())return denied();
 try{if(new URL(permit.data.signedUrl).origin!==new URL(storageOrigin).origin)return unavailable();}catch{return unavailable();}
 return {status:307 as const,url:permit.data.signedUrl};
}
