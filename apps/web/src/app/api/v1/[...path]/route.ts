import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { SignInRequestSchema, SignUpRequestSchema, DisplayNamePatchSchema, makeValidationError } from "@contracts";
import { authClient, authConfig, ownedProfile } from "@/lib/auth-server";
import { allowAuthAttempt, CSRF_LIFETIME, csrfCookieName, issueCsrf, sessionFingerprint, validCsrf } from "@/lib/auth-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = {params: Promise<{path:string[]}>};
async function handle(request: NextRequest, context: Context) {
  const requestId = randomUUID();
  const headers = {"Cache-Control":"private, no-store", "X-Request-Id":requestId, "Vary":"Cookie", "X-Content-Type-Options":"nosniff"};
  const reply = (data:unknown,status=200) => NextResponse.json({data},{status,headers});
  const fail = (status:number,code:string,message:string,retryable=false) => NextResponse.json({error:{code,message,retryable,requestId,retryAt:null,fieldErrors:[]}},{status,headers});
  try {
    const path = (await context.params).path.join("/");
    const allowed: Record<string,string> = {"auth/csrf":"GET","auth/sign-up":"POST","auth/sign-in":"POST","auth/session":"GET","me/settings":"GET,PATCH"};
    if (!allowed[path]) return fail(404,"NOT_FOUND","This action isn’t available.");
    if (!allowed[path].split(",").includes(request.method)) return fail(405,"NOT_FOUND","This method isn’t available.");
    const config = authConfig();
    const jar = await cookies();
    const cookieName = csrfCookieName(config.secure);
    const fingerprint = sessionFingerprint(jar.getAll());
    const origin = request.headers.get("origin");
    if ((origin && origin !== config.origin) || request.headers.get("sec-fetch-site") === "cross-site") return fail(403,"CSRF_REJECTED","Reload this page and try again.");
    if (path === "auth/csrf") {
      const token = issueCsrf(fingerprint);
      jar.set(cookieName,token,{path:"/",httpOnly:true,sameSite:"strict",secure:config.secure,maxAge:CSRF_LIFETIME});
      return reply({csrfToken:token,expiresAt:new Date(Date.now()+CSRF_LIFETIME*1000).toISOString()});
    }
    let body: unknown;
    if (request.method !== "GET") {
      if (origin !== config.origin || !validCsrf(jar.get(cookieName)?.value,request.headers.get("x-csrf-token"),fingerprint)) return fail(403,"CSRF_REJECTED","Reload this page and try again.");
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
    if (error || !user) return fail(401,"AUTH_REQUIRED","Please sign in to continue.");
    const profile = await ownedProfile(client,user);
    if (!profile) return fail(403,"ACCOUNT_DISABLED","This account isn’t available.");
    if (path === "auth/session") return reply({user:profile.user});
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
