import { ErrorEnvelopeSchema } from "@contracts";

export class AccountError extends Error {
  constructor(message:string, public status:number, public code:string) { super(message); }
}
export async function accountRequest(path:string, options?: {method:"POST"|"PATCH";body:unknown}) {
  const headers: Record<string,string> = {};
  if (options) {
    const csrf = await fetch("/api/v1/auth/csrf",{credentials:"same-origin",cache:"no-store"});
    if (!csrf.ok) throw new AccountError("Account services are unavailable. Please try again.",csrf.status,"SERVICE_UNAVAILABLE");
    headers["X-CSRF-Token"] = (await csrf.json()).data.csrfToken;
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(`/api/v1/${path}`,{method:options?.method ?? "GET",headers,body:options ? JSON.stringify(options.body) : undefined,credentials:"same-origin",cache:"no-store"});
  const result = await response.json();
  if (!response.ok) {
    const safe = ErrorEnvelopeSchema.safeParse(result);
    throw new AccountError(safe.success ? safe.data.error.message : "This action couldn’t be completed. Please try again.",response.status,safe.success ? safe.data.error.code : "SERVICE_UNAVAILABLE");
  }
  return result.data;
}
