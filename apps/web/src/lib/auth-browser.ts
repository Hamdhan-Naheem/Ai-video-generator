import { ErrorEnvelopeSchema } from "../../../../shared/contracts/index.ts";

export class AccountError extends Error {
  constructor(message:string, public status:number, public code:string) { super(message); }
}
// Share only the in-flight read: simultaneous mutations must not mint competing cookies.
let csrfFlight:Promise<string>|null=null;
function csrfToken(){
  csrfFlight??=(async()=>{
    const response=await fetch("/api/v1/auth/csrf",{credentials:"same-origin",cache:"no-store",signal:AbortSignal.timeout(20000)}).catch(()=>{throw new AccountError("Security services could not be reached. Check your connection and try again.",503,"SERVICE_UNAVAILABLE");});
    if(!response.ok)throw new AccountError("Account services are unavailable. Please try again.",response.status,"SERVICE_UNAVAILABLE");
    const token=(await response.json().catch(()=>null))?.data?.csrfToken;
    if(typeof token!=="string")throw new AccountError("Security services are unavailable. Please try again.",503,"SERVICE_UNAVAILABLE");
    return token;
  })().finally(()=>{csrfFlight=null;});
  return csrfFlight;
}
export async function accountRequest(path:string, options?: {method:"POST"|"PATCH"|"DELETE";body:unknown;idempotencyKey?:string},signal?:AbortSignal) {
  const headers: Record<string,string> = {};
  if (options) {
    signal?.throwIfAborted();
    headers["X-CSRF-Token"] = await csrfToken();
    signal?.throwIfAborted();
    headers["Content-Type"] = "application/json";
    if(options.idempotencyKey)headers["Idempotency-Key"]=options.idempotencyKey;
  }
  const response = await fetch(`/api/v1/${path}`,{method:options?.method ?? "GET",headers,body:options ? JSON.stringify(options.body) : undefined,credentials:"same-origin",cache:"no-store",signal:signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000)}).catch(cause=>{if(signal?.aborted)throw cause;throw new AccountError("We couldn’t confirm this action. Check your connection and try again.",503,"SERVICE_UNAVAILABLE");});
  // Gate auth using the HTTP status even when a proxy returns HTML or an empty body.
  if (response.status===401 && !["auth/sign-in","auth/sign-up"].includes(path) && typeof window!=="undefined") window.dispatchEvent(new Event("account-session-expired"));
  const result = response.status===204 ? null : await response.json().catch(()=>null);
  if (!response.ok) {
    const safe = ErrorEnvelopeSchema.safeParse(result);
    throw new AccountError(safe.success ? safe.data.error.message : "This action couldn’t be completed. Please try again.",response.status,safe.success ? safe.data.error.code : "SERVICE_UNAVAILABLE");
  }
  if(response.status!==204 && (result===null || typeof result!=="object" || !("data" in result))) throw new AccountError("The server response could not be read. Please try again.",502,"SERVICE_UNAVAILABLE");
  return result?.data;
}
