import { createHash,randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { SignInRequestSchema, SignUpRequestSchema, SignOutRequestSchema, DisplayNamePatchSchema, DashboardDtoSchema, ProjectCreateRequestSchema, ProjectPatchRequestSchema, ProjectDtoSchema, IdSchema, canonicalDraft, makeValidationError } from "@contracts";
import { authClient, authConfig, ownedProfile } from "@/lib/auth-server";
import { allowAuthAttempt, CSRF_LIFETIME, csrfCookieName, issueCsrf, sessionFingerprint, validCsrf } from "@/lib/auth-security";

import {videoCatalog,koreSample} from "@/lib/video-catalog";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = {params: Promise<{path:string[]}>};
async function handle(request: NextRequest, context: Context) {
  const requestId = randomUUID();
  const headers = {"Cache-Control":"private, no-store", "X-Request-Id":requestId, "Vary":"Cookie", "X-Content-Type-Options":"nosniff"};
  const reply = (data:unknown,status=200) => NextResponse.json({data},{status,headers});
  const fail = (status:number,code:string,message:string,retryable=false) => NextResponse.json({error:{code,message,retryable,requestId,retryAt:null,fieldErrors:[]}},{status,headers});
  try {
    const segments=(await context.params).path;
    const path = segments.join("/");
    const projectId=segments.length===2 && segments[0]==="projects" && IdSchema.safeParse(segments[1]).success ? segments[1] : null;
    const allowed: Record<string,string> = {"auth/csrf":"GET","auth/sign-up":"POST","auth/sign-in":"POST","auth/sign-out":"POST","auth/refresh":"POST","auth/session":"GET","me/settings":"GET,PATCH","dashboard":"GET","capabilities":"GET","voices":"GET","voices/Kore/preview":"GET","projects":"POST",...(projectId?{[path]:"GET,PATCH"}:{})};
    if (!allowed[path]) return fail(404,"NOT_FOUND","This action isn’t available.");
    if (!allowed[path].split(",").includes(request.method)) return fail(405,"NOT_FOUND","This method isn’t available.");
    const config = authConfig();
    const jar = await cookies();
    const cookieName = csrfCookieName(config.secure);
    const fingerprint = sessionFingerprint(jar.getAll());
    const origin = request.headers.get("origin");
    if ((origin && origin !== config.origin) || request.headers.get("sec-fetch-site") === "cross-site") return fail(403,"CSRF_REJECTED",`Open the app at ${config.origin} in a regular browser window and try again.`);
    if (path === "auth/csrf") {
      // Concurrent tabs must not rotate a still-valid token out from under a form.
      const existing=jar.get(cookieName)?.value;
      const token = validCsrf(existing,existing ?? null,fingerprint) ? existing! : issueCsrf(fingerprint);
      const expiresAt=Number(token.split(".")[0])+CSRF_LIFETIME*1000;
      jar.set(cookieName,token,{path:"/",httpOnly:true,sameSite:"strict",secure:config.secure,maxAge:Math.max(1,Math.ceil((expiresAt-Date.now())/1000))});
      return reply({csrfToken:token,expiresAt:new Date(expiresAt).toISOString()});
    }
    let body: unknown;
    if (request.method !== "GET") {
      if (origin !== config.origin) return fail(403,"CSRF_REJECTED",`Open the app at ${config.origin} and try again.`);
      if (!validCsrf(jar.get(cookieName)?.value,request.headers.get("x-csrf-token"),fingerprint)) return fail(403,"CSRF_REJECTED",jar.get(cookieName)?.value ? "Your session changed or the security check expired. Please try again." : `Your browser didn’t send the security cookie. Open ${config.origin} in a regular browser window with cookies enabled.`);
      if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return fail(415,"UNSUPPORTED_MEDIA_TYPE","Send JSON for this action.");
      // Count the stream, not only the untrusted Content-Length header.
      const reader = request.body?.getReader();
      if (!reader) return fail(400,"INVALID_JSON","Send a valid request.");
      const chunks: Uint8Array[] = []; let bytes=0;
      try {
        for (;;) { const {done,value} = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > 65536) { await reader.cancel(); return fail(413,"BODY_TOO_LARGE","This request is too large."); } chunks.push(value); }
        body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch { return fail(400,"INVALID_JSON","Send a valid request."); }
    }
    const client = await authClient();
    const clearSession = (preserveAnonymousCsrf=false) => {
      let hadAuthCookies=false;
      for (const cookie of jar.getAll()) if (/^sb-.+-auth-token(?:\.\d+)?$/.test(cookie.name)) {hadAuthCookies=true;jar.set(cookie.name,"",{path:"/",maxAge:0,secure:config.secure,sameSite:"lax"});}
      // An anonymous read in another tab must not invalidate signup/signin forms.
      if(hadAuthCookies || !preserveAnonymousCsrf) jar.delete(cookieName);
    };
    if (path === "auth/sign-out") {
      const parsed=SignOutRequestSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json(makeValidationError(parsed.error,requestId),{status:422,headers});
      const {error}=await client.auth.signOut({scope:"local"});
      if (error && ![401,403,404].includes(error.status ?? 0)) return fail(503,"SERVICE_UNAVAILABLE","Sign out couldn’t be completed. Try again.",true);
      clearSession();
      return new NextResponse(null,{status:204,headers});
    }
    if (path === "auth/refresh") {
      if (!body || typeof body!=="object" || Array.isArray(body) || Object.keys(body).length) return fail(422,"VALIDATION_FAILED","Send an empty object for this action.");
      const {error}=await client.auth.refreshSession();
      if (error) {
        if (error.status===0 || (error.status ?? 0)>=500) return fail(503,"SERVICE_UNAVAILABLE","Account services are temporarily unavailable. Try again.",true);
        clearSession(true); return fail(401,"AUTH_REQUIRED","Please sign in to continue.");
      }
    }
    if (path === "auth/sign-up" || path === "auth/sign-in") {
      const signup = path === "auth/sign-up";
      const parsed = (signup ? SignUpRequestSchema : SignInRequestSchema).safeParse(body);
      if (!parsed.success) return NextResponse.json(makeValidationError(parsed.error,requestId),{status:422,headers});
      if (!allowAuthAttempt(parsed.data.email)) return fail(429,"RATE_LIMITED","Too many attempts. Wait a minute before trying again.",true);
      const input = parsed.data;
      const result = signup
        ? await client.auth.signUp({email:input.email,password:input.password,options:{data:{display_name:SignUpRequestSchema.parse(input).displayName}}})
        : await client.auth.signInWithPassword(input);
      if (result.error || !result.data.user || !result.data.session) {
        if (result.error?.status === 429) return fail(429,"RATE_LIMITED","Too many attempts. Please wait before trying again.",true);
        if (result.error?.status === 0 || (result.error?.status ?? 0) >= 500) return fail(503,"SERVICE_UNAVAILABLE","Sign-in is temporarily unavailable. Try again shortly.",true);
        return fail(signup ? 400 : 401,"INVALID_CREDENTIALS",signup ? "We couldn’t create this account. Try again or sign in if you already have an account." : "Email or password is incorrect. Check your details and try again.");
      }
      const profile = await ownedProfile(client,result.data.user);
      if (!profile) { await client.auth.signOut({scope:"local"}); return fail(403,"ACCOUNT_DISABLED","This account isn’t available."); }
      jar.delete(cookieName); // Previous pre-auth nonce cannot authorize the new session.
      return reply({user:profile.user,nextPath:"/dashboard"},signup ? 201 : 200);
    }
    // getUser verifies against Auth; a client-controlled cookie is never identity proof.
    const {data:{user},error} = await client.auth.getUser();
    if (error || !user) {
      if (error && (error.status===0 || (error.status ?? 0)>=500)) return fail(503,"SERVICE_UNAVAILABLE","Account services are temporarily unavailable. Try again.",true);
      clearSession(true); return fail(401,"AUTH_REQUIRED","Please sign in to continue.");
    }
    const profile = await ownedProfile(client,user);
    if (!profile) return fail(403,"ACCOUNT_DISABLED","This account isn’t available.");
    if (path === "auth/refresh") {jar.delete(cookieName);return reply({authenticated:true});}
    if (path === "auth/session") return reply({user:profile.user});
    if (["capabilities","voices","voices/Kore/preview"].includes(path)) {
      if([...request.nextUrl.searchParams].length)return fail(400,"INVALID_QUERY","Catalog parameters are not supported.");
      if(path==="voices/Kore/preview") {const sample=koreSample();if(!sample)return fail(404,"NOT_FOUND","A reviewed voice sample is not available yet.");return new NextResponse(new Uint8Array(sample),{headers:{...headers,"Content-Type":"audio/wav","Content-Length":String(sample.length),"Content-Disposition":'inline; filename="Kore.wav"',"Cross-Origin-Resource-Policy":"same-origin"}});}
      const catalog=videoCatalog();return reply(path==="voices"?catalog.voices:catalog.capabilities);
    }
    if(path==="projects" || projectId) {
      if([...request.nextUrl.searchParams].length)return fail(400,"INVALID_QUERY","Project parameters aren’t supported.");
      let current=null;
      if(projectId) {
        const result=await client.rpc("get_project_draft",{project:projectId});
        if(result.error?.code==="42501")return fail(403,"ACCOUNT_DISABLED","This account isn’t available.");
        if(result.error)return fail(503,"SERVICE_UNAVAILABLE","We couldn’t load this draft. Try again.",true);
        if(!result.data)return fail(404,"NOT_FOUND","This draft isn’t available.");
        const parsed=ProjectDtoSchema.safeParse(result.data);
        if(!parsed.success)return fail(503,"SERVICE_UNAVAILABLE","We couldn’t load this draft. Try again.",true);
        current=parsed.data;
        if(request.method==="GET")return reply(current);
      }
      const create=path==="projects";
      const parsed=(create?ProjectCreateRequestSchema:ProjectPatchRequestSchema).safeParse(body);
      if(!parsed.success)return NextResponse.json(makeValidationError(parsed.error,requestId),{status:422,headers});
      const creation=ProjectCreateRequestSchema.safeParse(body),patch=ProjectPatchRequestSchema.safeParse(body);
      if(!create && (!patch.success || !current))return fail(422,"VALIDATION_FAILED","Check your draft details.");
      if(!create && patch.success && current && patch.data.expectedDraftVersion!==current.draftVersion)return fail(409,"DRAFT_VERSION_CONFLICT","This draft changed in another tab. Reload the saved draft before trying again.");
      const input=create && creation.success?creation.data:null;
      const change=patch.success?patch.data:null;
      const mode=input?.mode??current!.mode;
      const replacement=input?.draftInput??change?.draftInput??current?.draftInput;
      if(replacement && replacement.mode!==mode)return fail(422,"VALIDATION_FAILED","A saved project’s video type can’t be changed. Start a new project for another type.");
      if(JSON.stringify(replacement?.sources??[])!==JSON.stringify(current?.draftInput.sources??[]))return fail(422,"VALIDATION_FAILED","File selection and uploads are not connected yet.");
      const draft=canonicalDraft(mode,input?.title??change?.title??current?.title,replacement,input?.preferences??change?.preferences??current?.preferences);
      const key=request.headers.get("idempotency-key")??randomUUID();
      if(create && !/^[a-zA-Z0-9_-]{1,128}$/.test(key))return fail(422,"VALIDATION_FAILED","Use a valid request key.");
      const result=create ? await client.rpc("create_project_draft",{project:randomUUID(),request_key:key,request_hash:createHash("sha256").update(JSON.stringify(draft)).digest("hex"),new_title:draft.title,new_mode:mode,new_input:draft.draftInput,new_preferences:draft.preferences}) : await client.rpc("update_project_draft",{project:projectId!,expected_version:change!.expectedDraftVersion,new_title:draft.title,new_input:draft.draftInput,new_preferences:draft.preferences});
      if(result.error?.code==="40001")return fail(409,"DRAFT_VERSION_CONFLICT","This draft changed in another tab. Reload the saved draft before trying again.");
      if(result.error?.code==="23505")return fail(409,"STATE_CONFLICT","This save request was already used with different details. Check your dashboard for the saved project.");
      if(result.error?.code==="23514")return fail(409,"STATE_CONFLICT","This draft can’t be changed in its current state.");
      if(result.error?.code==="42501")return fail(404,"NOT_FOUND","This draft isn’t available.");
      if(result.error?.code==="22023")return fail(422,"VALIDATION_FAILED","Check your draft details.");
      const saved=ProjectDtoSchema.safeParse(result.data);
      if(result.error || !saved.success)return fail(503,"SERVICE_UNAVAILABLE","We couldn’t confirm the save. Retry the same details or check your dashboard.",true);
      return reply(saved.data,create?201:200);
    }
    if (path === "dashboard") {
      if ([...request.nextUrl.searchParams].length) return fail(400,"INVALID_QUERY","Dashboard parameters aren’t supported.");
      const result=await client.rpc("get_dashboard");
      const parsed=DashboardDtoSchema.safeParse(result.data);
      if (result.error?.code==="42501") return fail(403,"ACCOUNT_DISABLED","This account isn’t available.");
      if (result.error || !parsed.success) return fail(503,"SERVICE_UNAVAILABLE","We couldn’t load your dashboard. Try again.",true);
      return reply(parsed.data);
    }
    if (request.method === "GET") return reply({displayName:profile.user.displayName,email:profile.user.email,authMethods:profile.user.authMethods,settingsVersion:profile.settingsVersion});
    const parsed = DisplayNamePatchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json(makeValidationError(parsed.error,requestId),{status:422,headers});
    const result = await client.rpc("update_display_name",{expected_version:parsed.data.expectedVersion,new_name:parsed.data.displayName});
    if (result.error?.code === "40001") return fail(409,"STATE_CONFLICT","Your profile changed in another tab. Reload the saved profile before trying again.");
    if (result.error?.code === "42501") return fail(403,"ACCOUNT_DISABLED","This account isn’t available.");
    if (result.error || !result.data?.[0]) return fail(503,"SERVICE_UNAVAILABLE","Your changes couldn’t be saved. Try again shortly.",true);
    return reply({displayName:result.data[0].display_name,settingsVersion:result.data[0].settings_version});
  } catch {
    // Never serialize SDK errors, credentials, submitted passwords, or raw SQL.
    return fail(503,"SERVICE_UNAVAILABLE","Account services are temporarily unavailable. Please try again shortly.",true);
  }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
