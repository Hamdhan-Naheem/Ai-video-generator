import {operatorRequest} from '@/lib/operator-api';
import {VideoCursorSchema,VideoListSnapshotSchema,SavedVideoPageSchema} from '@contracts';
import {EducationResultSchema,EducationMediaRequestSchema,EducationMediaGrantSchema} from '@contracts';
import {createClient} from '@supabase/supabase-js';
import {GenerationCancelRequestSchema,GenerationCancelResultSchema,GenerationRetryRequestSchema,GenerationRecoverySchema,EducationRunSchema} from '@contracts';
import type {Database} from '../../../../../../../shared/database/database.types';
import { createHash,randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { after, NextResponse, type NextRequest } from "next/server";
import { DeleteVideoRequestSchema, DeleteVideoResultSchema, DeleteDraftRequestSchema, DeleteDraftResultSchema, SavedDraftSchema, SavedDraftPageSchema, DraftCursorSchema, GenerationRequestSchema, QueuedResultSchema, JobDtoSchema, SignInRequestSchema, SignUpRequestSchema, SignOutRequestSchema, DisplayNamePatchSchema, DashboardDtoSchema, ProjectCreateRequestSchema, ProjectPatchRequestSchema, ProjectDtoSchema, IdSchema, canonicalDraft, makeValidationError } from "@contracts";
import {authorizeLegacyMedia} from '@/lib/legacy-media';
import { authClient, authConfig, ownedProfile } from "@/lib/auth-server";
import { authNetwork,authThrottleHashes } from "@/lib/auth-throttle";
import { CSRF_LIFETIME, csrfCookieName, issueCsrf, sessionFingerprint, validCsrf } from "@/lib/auth-security";

import {UploadRequestSchema,UploadSnapshotSchema,UploadAllocationSchema} from "@contracts";
import {cleanupRemovedDraftSources,cleanupRemovedSource} from "@/lib/source-cleanup";
import {videoCatalog,koreSample} from "@/lib/video-catalog";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = {params: Promise<{path:string[]}>};
async function handle(request: NextRequest, context: Context) {
  const requestId = randomUUID();
  const headers:Record<string,string> = {"Cache-Control":"private, no-store", "X-Request-Id":requestId, "Vary":"Cookie", "X-Content-Type-Options":"nosniff"};
  const reply = (data:unknown,status=200) => NextResponse.json({data},{status,headers});
  const fail = (status:number,code:string,message:string,retryable=false) => NextResponse.json({error:{code,message,retryable,requestId,retryAt:null,fieldErrors:[]}},{status,headers});
  try {
    const segments=(await context.params).path;
    const path = segments.join("/");
    const projectId=segments.length===2 && segments[0]==="projects" && IdSchema.safeParse(segments[1]).success ? segments[1] : null;
    const draftDelete=segments.length===3 && segments[0]==="projects" && IdSchema.safeParse(segments[1]).success && segments[2]==="draft"?segments[1]:null;
    const generationProject=segments.length===3 && segments[0]==="projects" && IdSchema.safeParse(segments[1]).success && segments[2]==="generations"?segments[1]:null;
    const resultProject=segments[0]==="projects"&&IdSchema.safeParse(segments[1]).success&&segments[2]==="results"&&IdSchema.safeParse(segments[3]).success&&(segments.length===4||segments.length===5&&["access","deletion"].includes(segments[4]))?segments[1]:null;
    const educationProject=segments[0]==="projects" && IdSchema.safeParse(segments[1]).success && ((segments.length===3 && segments[2]==="generation") || (segments.length===4 && segments[2]==="result" && ["video","srt","vtt"].includes(segments[3])))?segments[1]:null;
    const cancelJob=segments.length===3&&segments[0]==="jobs"&&IdSchema.safeParse(segments[1]).success&&segments[2]==="cancel"?segments[1]:null;
    const recoveryJob=segments.length===3&&segments[0]==="jobs"&&IdSchema.safeParse(segments[1]).success&&["retry","recovery"].includes(segments[2])?segments[1]:null;
    const generationJob=segments.length===2 && segments[0]==="jobs" && IdSchema.safeParse(segments[1]).success?segments[1]:null;
    const uploadProject=segments.length===3 && segments[0]==="projects" && IdSchema.safeParse(segments[1]).success && segments[2]==="uploads"?segments[1]:null;
    const uploadId=segments[0]==="uploads" && IdSchema.safeParse(segments[1]).success && (segments.length===2 || (segments.length===3 && segments[2]==="complete"))?segments[1]:null;
    const operatorReconcile=segments.length===4&&segments[0]==="operator"&&segments[1]==="jobs"&&IdSchema.safeParse(segments[2]).success&&segments[3]==="reconcile";
    const allowed: Record<string,string> = {"operator/health":"GET","operator/workers":"GET","operator/jobs":"GET","operator/audit":"GET","operator/controls":"PATCH",...(operatorReconcile?{[path]:"POST"}:{}),"auth/csrf":"GET","auth/sign-up":"POST","auth/sign-in":"POST","auth/sign-out":"POST","auth/refresh":"POST","auth/session":"GET","me/settings":"GET,PATCH","dashboard":"GET","drafts":"GET","videos":"GET","capabilities":"GET","voices":"GET","voices/Kore/preview":"GET","projects":"POST","upload-config":"GET",...(educationProject?{[path]:"GET"}:{}),...(resultProject?{[path]:segments.length===4?"GET,DELETE":segments[4]==="deletion"?"GET":"POST"}:{}),...(generationProject?{[path]:"POST"}:{}),...(generationJob?{[path]:"GET"}:{}),...(cancelJob?{[path]:"POST"}:{}),...(recoveryJob?{[path]:segments[2]==="retry"?"POST":"GET"}:{}),...(uploadProject?{[path]:"GET,POST"}:{}),...(uploadId?{[path]:segments.length===3?"POST":"GET,DELETE"}:{}),...(projectId?{[path]:"GET,PATCH"}:{}),...(draftDelete?{[path]:"DELETE"}:{})};
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
      const throttleKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
      if(!throttleKey)return fail(503,"SERVICE_UNAVAILABLE","Sign-in protection is temporarily unavailable. Try again shortly.",true);
      const throttleClient=createClient<Database>(config.url,throttleKey,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:"no-store",signal:AbortSignal.timeout(5000)})}});
      const limit=await throttleClient.rpc("consume_auth_attempt",authThrottleHashes(parsed.data.email,authNetwork(request.headers,config.origin,process.env.VERCEL==="1"),throttleKey));
      const window=limit.data;
      if(limit.error||!window||typeof window!=="object"||Array.isArray(window)||typeof window.allowed!=="boolean"||typeof window.retryAfterSeconds!=="number"||!Number.isInteger(window.retryAfterSeconds)||window.retryAfterSeconds<0||window.retryAfterSeconds>60)return fail(503,"SERVICE_UNAVAILABLE","Sign-in protection is temporarily unavailable. Try again shortly.",true);
      if(!window.allowed){headers["Retry-After"]=String(Math.max(1,window.retryAfterSeconds));return fail(429,"RATE_LIMITED","Too many attempts. Wait a minute before trying again.",true);}
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
    if(segments[0]==="operator"){
      if(profile.user.role!=="operator")return fail(403,"OPERATOR_REQUIRED","An active operator account is required.");
      const outcome=await operatorRequest(client,path,request.method,request.nextUrl.searchParams,body);
      if("retryAfterSeconds" in outcome)headers["Retry-After"]=String(outcome.retryAfterSeconds);
      if("error" in outcome&&outcome.error)return fail(outcome.status,outcome.error.code,outcome.error.message,outcome.error.retryable);
      return reply("data" in outcome?outcome.data:null,outcome.status);
    }
    if(resultProject){
      if([...request.nextUrl.searchParams].length)return fail(400,"INVALID_QUERY","Result parameters aren’t supported.");
      const revision=segments[3];
      if(request.method==='DELETE'){
        const parsed=DeleteVideoRequestSchema.safeParse(body);if(!parsed.success)return fail(422,'VALIDATION_FAILED','Use the displayed video version.');
        const result=await client.rpc('delete_education_video',{project:resultProject,revision,expected_version:parsed.data.expectedVersion});
        if(result.error?.code==='42501')return fail(404,'NOT_FOUND','This video is not available.');
        if(result.error?.code==='40001')return fail(409,'VERSION_CONFLICT','The video version changed. Refresh before deleting.');
        if(result.error?.code==='P1401')return fail(409,'GENERATION_ACTIVE','Finish or cancel this project’s active generation before deleting a video.');
        if(result.error?.code==='P2404')return fail(409,'RESULT_UNAVAILABLE','Only completed video results can be deleted.');
        const value=DeleteVideoResultSchema.safeParse(result.data);if(result.error||!value.success)return fail(503,'SERVICE_UNAVAILABLE','Deletion could not be confirmed. Retry to safely check this same video.',true);
        return reply(value.data,value.data.cleanupState==='complete'?200:202);
      }
      if(segments[4]==='deletion'){
        const result=await client.rpc('get_video_deletion',{project:resultProject,revision});if(result.error?.code==='42501')return fail(404,'NOT_FOUND','Deleted video is not available.');
        const value=DeleteVideoResultSchema.safeParse(result.data);if(result.error||!value.success)return fail(503,'SERVICE_UNAVAILABLE','Cleanup status could not be checked.',true);return reply(value.data);
      }
      if(segments.length===4){
        const result=await client.rpc("get_education_result",{project:resultProject,revision});
        if(result.error?.code==="42501")return fail(404,"NOT_FOUND","This result isn’t available.");
        const value=EducationResultSchema.safeParse(result.data);
        if(result.error||!value.success)return fail(503,"SERVICE_UNAVAILABLE","Result details are temporarily unavailable.",true);
        return reply(value.data);
      }
      const parsed=EducationMediaRequestSchema.safeParse(body);
      if(!parsed.success)return fail(422,"VALIDATION_FAILED","Choose a supported media action.");
      const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!secret)return fail(503,"SERVICE_UNAVAILABLE","Private media services are unavailable.",true);
      const admin=createClient<Database>(config.url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
      const result=await admin.rpc("describe_education_revision_media",{actor:profile.user.id,project:resultProject,revision,kind:parsed.data.kind});
      if(result.error?.code==="42501")return fail(404,"NOT_FOUND","This result isn’t available.");
      if(result.error?.code==="P2001")return fail(410,"RESULT_UNAVAILABLE","This result expired or its files are unavailable.");
      if(result.error||!result.data||typeof result.data!=="object"||Array.isArray(result.data))return fail(503,"SERVICE_UNAVAILABLE","Private media is temporarily unavailable.",true);
      const deadline=Date.parse(String(result.data.expiresAt)),before=Date.now(),seconds=Math.min(60,Math.floor((deadline-before)/1000)-2);
      if(!Number.isFinite(seconds)||seconds<1)return fail(410,"RESULT_UNAVAILABLE","This result expired.");
      const kind=parsed.data.kind,filename=`education-${revision}.${kind==="video"?"mp4":kind}`;
      const permit=await admin.storage.from(String(result.data.bucket)).createSignedUrl(String(result.data.objectKey),seconds,{download:parsed.data.download?filename:false});
      if(permit.error||!permit.data)return fail(503,"SERVICE_UNAVAILABLE","Private media is temporarily unavailable.",true);
      const confirmed=await admin.rpc("describe_education_revision_media",{actor:profile.user.id,project:resultProject,revision,kind});
      if(confirmed.error?.code==="42501")return fail(404,"NOT_FOUND","This result isn’t available.");
      if(confirmed.error?.code==="P2001")return fail(410,"RESULT_UNAVAILABLE","This result expired or became unavailable.");
      if(confirmed.error||!confirmed.data||typeof confirmed.data!=="object"||Array.isArray(confirmed.data)||confirmed.data.objectKey!==result.data.objectKey||confirmed.data.bucket!==result.data.bucket)return fail(503,"SERVICE_UNAVAILABLE","Media authorization changed. Check the result again.",true);
      if(new URL(permit.data.signedUrl).origin!==new URL(config.url).origin)return fail(503,"SERVICE_UNAVAILABLE","Private media configuration is unavailable.",true);
      const now=Date.now(),expires=Math.min(deadline,Date.parse(String(confirmed.data.expiresAt)),before+seconds*1000);
      if(expires<=now)return fail(410,"RESULT_UNAVAILABLE","This media link expired. Check the result again.");
      const grant=EducationMediaGrantSchema.safeParse({revisionId:revision,kind,download:parsed.data.download,url:permit.data.signedUrl,serverTime:new Date(now).toISOString(),expiresAt:new Date(expires).toISOString()});
      if(!grant.success)return fail(503,"SERVICE_UNAVAILABLE","Private media could not be authorized.",true);
      return reply(grant.data);
    }
    if(educationProject){
      if([...request.nextUrl.searchParams].length)return fail(400,"INVALID_QUERY","Result parameters are not supported.");
      if(segments[2]==="generation"){
        const result=await client.rpc("get_education_run",{project:educationProject});
        if(result.error?.code==="42501")return fail(404,"NOT_FOUND","This project is not available.");
        const parsed=EducationRunSchema.nullable().safeParse(result.data);
        if(result.error||!parsed.success)return fail(503,"SERVICE_UNAVAILABLE","Processing status is temporarily unavailable. Your draft is preserved.",true);
        return reply(parsed.data);
      }
      const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!secret)return fail(503,"SERVICE_UNAVAILABLE","Media services are unavailable.",true);
      const admin=createClient<Database>(config.url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
      const grant=await authorizeLegacyMedia({
        describe:()=>admin.rpc("describe_education_result",{actor:profile.user.id,project:educationProject,variant:segments[3]}),
        sign:(bucket,objectKey,seconds)=>admin.storage.from(bucket).createSignedUrl(objectKey,seconds,{download:segments[3]!=="video"}),
        storageOrigin:config.url,
      });
      if(grant.status!==307)return fail(grant.status,grant.code,grant.message,grant.status===503);
      return NextResponse.redirect(grant.url,{status:307,headers});
    }
    if (["capabilities","voices","voices/Kore/preview"].includes(path)) {
      if([...request.nextUrl.searchParams].length)return fail(400,"INVALID_QUERY","Catalog parameters are not supported.");
      if(path==="voices/Kore/preview") {const sample=koreSample();if(!sample)return fail(404,"NOT_FOUND","A reviewed voice sample is not available yet.");return new NextResponse(new Uint8Array(sample),{headers:{...headers,"Content-Type":"audio/wav","Content-Length":String(sample.length),"Content-Disposition":'inline; filename="Kore.wav"',"Cross-Origin-Resource-Policy":"same-origin"}});}
      const availability=path==="capabilities"?await client.rpc("education_execution_available"):null;if(availability?.error)return fail(503,"SERVICE_UNAVAILABLE","Generation availability could not be checked.",true);const catalog=videoCatalog(availability?.data===true);return reply(path==="voices"?catalog.voices:catalog.capabilities);
    }
    if(path==="upload-config") {if([...request.nextUrl.searchParams].length)return fail(400,"INVALID_QUERY","Parameters are not supported.");return reply({url:config.url,anonKey:config.key});}
    if(uploadProject || uploadId) {
      if([...request.nextUrl.searchParams].length)return fail(400,"INVALID_QUERY","Upload parameters are not supported.");
      let result;
      if(uploadProject && request.method==="POST") {
        const parsed=UploadRequestSchema.safeParse(body);const key=request.headers.get("idempotency-key");
        if(!parsed.success)return NextResponse.json(makeValidationError(parsed.error,requestId),{status:422,headers});
        if(!key || !/^[a-zA-Z0-9_-]{1,128}$/.test(key))return fail(422,"VALIDATION_FAILED","An upload request key is required.");
        const input=parsed.data;
        result=await client.rpc("reserve_source_upload",{project:uploadProject,expected_version:input.expectedDraftVersion,request_key:key,request_hash:createHash("sha256").update(JSON.stringify(input)).digest("hex"),filename:input.filename,mime:input.mimeType,bytes:Number(input.byteSize),role:input.role});
      } else {
        if(request.method!=="GET" && (!body || typeof body!=="object" || Array.isArray(body) || Object.keys(body).length))return fail(422,"VALIDATION_FAILED","Send an empty object.");
        result=uploadProject?await client.rpc("get_draft_uploads",{project:uploadProject}):await client.rpc("change_source_upload",{upload:uploadId!,action:request.method==="GET"?"read":request.method==="DELETE"?"remove":"complete"});
      }
      const code=result.error?.code;
      if(code==="P2102")return fail(409,"STATE_CONFLICT","Your stored generation history reached its capacity. Existing results and eligible retries remain available; contact the creator for help.");
      if(code==="P2103")return fail(429,"RATE_LIMITED","The daily new-generation allowance has been reached. It resets at 00:00 UTC. Eligible retries use the existing request.",true);
      if(code==="P1604")return fail(429,"RATE_LIMITED","The daily AI allowance has been reached. It resets at 00:00 UTC; your draft is preserved.",true);
      if(code==="42501")return fail(404,"NOT_FOUND","This draft or upload is not available.");
      if(code==="40001")return fail(409,"DRAFT_VERSION_CONFLICT","This draft changed in another tab. Reload the saved draft before uploading.");
      if(code==="23505")return fail(409,"STATE_CONFLICT","This upload request key was used with different details.");
      if(code==="23514")return fail(409,"STATE_CONFLICT","The upload is incomplete, removed or referenced by a saved revision.");
      if(code==="P0002")return fail(410,"MEDIA_EXPIRED","This upload allocation expired. Remove it and choose the file again.");
      if(code==="22023" && uploadId && segments.length===3){const removed=await client.rpc("change_source_upload",{upload:uploadId,action:"remove"});if(!removed.error)await cleanupRemovedSource(uploadId,profile.user.id);}
      if(code==="22023")return fail(422,"VALIDATION_FAILED","Check file size, type, count and upload metadata.");
      if(code==="P0001")return fail(409,"STORAGE_CAPACITY","Storage is not configured or has reached its limit. Your draft is preserved.");
      const parsed=(uploadProject && request.method==="POST"?UploadAllocationSchema:UploadSnapshotSchema).safeParse(result.data);
      if(result.error || !parsed.success)return fail(503,"SERVICE_UNAVAILABLE","We could not confirm this upload action. Retry to reconcile it.",true);
      if(uploadId && request.method==="GET") {const item=UploadSnapshotSchema.parse(parsed.data).items.find(item=>item.uploadId===uploadId);if(!item)return fail(404,"NOT_FOUND","This upload is not available.");if(item.state==="allocated"&&Date.parse(item.expiresAt)<=Date.now())return fail(410,"MEDIA_EXPIRED","This upload allocation expired. Remove it and choose the file again.");}
      if(uploadId && request.method==="DELETE")await cleanupRemovedSource(uploadId,profile.user.id);
      return reply(parsed.data,uploadProject && request.method==="POST"?201:request.method==="DELETE"?202:200);
    }
    if(path==="videos"){
      const query=request.nextUrl.searchParams;
      if([...query.keys()].some(key=>key!=="cursor")||query.getAll("cursor").length>1)return fail(400,"INVALID_QUERY","Only one video cursor is supported.");
      let before:{completedAt:string;id:string}|null=null;
      if(query.has("cursor")){
        const cursor=query.get("cursor")!;
        try{if(cursor.length>256||!/^[a-zA-Z0-9_-]+$/.test(cursor))throw Error();const bytes=Buffer.from(cursor,"base64url");if(bytes.toString("base64url")!==cursor)throw Error();before=VideoCursorSchema.parse(JSON.parse(bytes.toString("utf8")));}
        catch{return fail(400,"INVALID_CURSOR","This video cursor is invalid. Refresh My videos.");}
      }
      const result=await client.rpc("list_education_videos",{before_time:before?.completedAt??undefined,before_id:before?.id??undefined});
      if(result.error?.code==="42501")return fail(403,"ACCOUNT_DISABLED","This account isn’t available.");
      const value=VideoListSnapshotSchema.safeParse(result.data);
      if(result.error||!value.success)return fail(503,"SERVICE_UNAVAILABLE","We couldn’t load your videos. Try again.",true);
      const items=value.data.items.slice(0,20),last=items.at(-1);
      const nextCursor=value.data.items.length>20&&last?Buffer.from(JSON.stringify({completedAt:last.completedAt,id:last.revisionId})).toString("base64url"):null;
      return reply(SavedVideoPageSchema.parse({...value.data,items,nextCursor}));
    }
    if(path==="drafts"){
      const query=request.nextUrl.searchParams;
      if([...query.keys()].some(key=>key!=="cursor") || query.getAll("cursor").length>1)return fail(400,"INVALID_QUERY","Only one draft cursor is supported.");
      let before:{updatedAt:string;id:string}|null=null;
      if(query.has("cursor")){
        const cursor=query.get("cursor")!;
        try{
          if(cursor.length>256 || !/^[a-zA-Z0-9_-]+$/.test(cursor))throw Error();
          const bytes=Buffer.from(cursor,"base64url");if(bytes.toString("base64url")!==cursor)throw Error();
          before=DraftCursorSchema.parse(JSON.parse(bytes.toString("utf8")));
        }catch{return fail(400,"INVALID_CURSOR","This draft cursor is invalid. Refresh the draft list.");}
      }
      const result=await client.rpc("list_saved_drafts",{before_time:before?.updatedAt??undefined,before_id:before?.id??undefined});
      if(result.error?.code==="42501")return fail(403,"ACCOUNT_DISABLED","This account isn’t available.");
      const rows=SavedDraftSchema.array().max(21).safeParse(result.data);
      if(result.error || !rows.success)return fail(503,"SERVICE_UNAVAILABLE","We couldn’t load saved drafts. Try again.",true);
      const items=rows.data.slice(0,20),last=items.at(-1);
      const nextCursor=rows.data.length>20&&last?Buffer.from(JSON.stringify({updatedAt:last.updatedAt,id:last.id})).toString("base64url"):null;
      return reply(SavedDraftPageSchema.parse({items,nextCursor}));
    }

    if(draftDelete){
      if([...request.nextUrl.searchParams].length)return fail(400,"INVALID_QUERY","Draft deletion parameters aren’t supported.");
      const parsed=DeleteDraftRequestSchema.safeParse(body);
      if(!parsed.success)return NextResponse.json(makeValidationError(parsed.error,requestId),{status:422,headers});
      const result=await client.rpc("delete_saved_draft",{project:draftDelete,expected_version:parsed.data.expectedDraftVersion});
      if(result.error?.code==="42501")return fail(404,"NOT_FOUND","This draft isn’t available.");
      if(result.error?.code==="40001")return fail(409,"DRAFT_VERSION_CONFLICT","This draft changed in another tab. Close this dialog and refresh the list before deleting.");
      if(result.error?.code==="P1401")return fail(409,"ACTIVE_JOB_EXISTS","This draft has an active generation. Wait for it to finish or cancel it before deleting.");
      if(result.error?.code==="22023")return fail(422,"VALIDATION_FAILED","Refresh the list and select the draft again.");
      const deleted=DeleteDraftResultSchema.safeParse(result.data);
      if(result.error||!deleted.success)return fail(503,"SERVICE_UNAVAILABLE","We couldn’t confirm deletion. Retry the same draft to safely check its status.",true);
      after(()=>cleanupRemovedDraftSources(draftDelete,profile.user.id));
      return reply(deleted.data,202);
    }

    if(cancelJob){
      if([...request.nextUrl.searchParams].length)return fail(400,"INVALID_QUERY","Cancellation parameters aren’t supported.");
      if(!GenerationCancelRequestSchema.safeParse(body).success)return fail(422,"VALIDATION_FAILED","Cancellation requires an empty JSON object.");
      let result=await client.rpc("cancel_generation",{job:cancelJob});
      for(let attempt=1;attempt<3&&["40P01","55P03"].includes(result.error?.code??"");attempt++)result=await client.rpc("cancel_generation",{job:cancelJob});
      if(result.error?.code==="42501")return fail(404,"NOT_FOUND","This generation isn’t available.");
      if(result.error?.code==="P1901")return fail(409,"STATE_CONFLICT","This generation already completed or stopped. Check its latest status.");
      const value=GenerationCancelResultSchema.safeParse(result.data);
      if(result.error||!value.success)return fail(503,"SERVICE_UNAVAILABLE","Cancellation could not be confirmed. Check the same request again.",true);
      return reply(value.data,value.data.status==="cancelled"?200:202);
    }

    if(recoveryJob){
      if([...request.nextUrl.searchParams].length)return fail(400,"INVALID_QUERY","Recovery parameters aren’t supported.");
      if(segments[2]==="recovery"){
        const result=await client.rpc("get_generation_recovery",{job:recoveryJob});
        if(result.error?.code==="42501")return fail(404,"NOT_FOUND","This generation isn’t available.");
        const value=GenerationRecoverySchema.safeParse(result.data);
        if(result.error||!value.success)return fail(503,"SERVICE_UNAVAILABLE","We couldn’t check recovery options. Try again.",true);
        return reply(value.data);
      }
      if(!GenerationRetryRequestSchema.safeParse(body).success)return fail(422,"VALIDATION_FAILED","Retry requires an empty JSON object.");
      const key=request.headers.get("idempotency-key");
      if(!key||!/^[a-zA-Z0-9_-]{1,128}$/.test(key))return fail(422,"VALIDATION_FAILED","A valid Idempotency-Key is required for retry.");
      let result=await client.rpc("retry_generation",{job:recoveryJob,request_key:key});
      for(let attempt=1;attempt<3&&["40P01","55P03"].includes(result.error?.code??"");attempt++)result=await client.rpc("retry_generation",{job:recoveryJob,request_key:key});
      const code=result.error?.code;
      if(code==="P2102")return fail(409,"STATE_CONFLICT","Your stored generation history reached its capacity. Existing results and eligible retries remain available; contact the creator for help.");
      if(code==="P2103")return fail(429,"RATE_LIMITED","The daily new-generation allowance has been reached. It resets at 00:00 UTC. Eligible retries use the existing request.",true);
      if(code==="P1604")return fail(429,"RATE_LIMITED","The daily AI allowance has been reached. It resets at 00:00 UTC; your draft is preserved.",true);
      if(code==="42501")return fail(404,"NOT_FOUND","This generation isn’t available.");
      if(code==="P1801")return fail(409,"STATE_CONFLICT","This request cannot be retried. Check its status and recovery guidance.");
      if(code==="P1802")return fail(409,"BUDGET_EXHAUSTED","This request reached its recovery limits. Retry cannot reset them.");
      if(code==="P1407")return fail(410,"INPUTS_EXPIRED","Required media expired. Review the draft before a new generation.");
      if(code==="P1401")return fail(409,"ACTIVE_JOB_EXISTS","Another video is already active. Check its progress before retrying.");
      if(code==="P1402")return fail(503,"GENERATION_PAUSED","Generation is paused. Your saved draft is preserved.");
      if(code==="P1403")return fail(409,"STORAGE_CAPACITY","Recovery storage capacity is unavailable. Your draft is preserved.");
      if(code==="P1404")return fail(409,"OUTPUT_LIMIT","Your retained videos and reserved output slots reached the limit.");
      const value=QueuedResultSchema.safeParse(result.data);
      if(result.error||!value.success)return fail(503,"SERVICE_UNAVAILABLE","We couldn’t confirm retry. Check the same request to recover its receipt.",true);
      return NextResponse.json({data:value.data},{status:202,headers:{...headers,Location:value.data.statusUrl}});
    }

    if(generationProject || generationJob){
      if([...request.nextUrl.searchParams].length)return fail(400,"INVALID_QUERY","Generation parameters aren’t supported.");
      if(generationJob){
        const result=await client.rpc("get_generation_job",{job:generationJob});
        if(result.error?.code==="42501")return fail(403,"ACCOUNT_DISABLED","This account isn’t available.");
        if(!result.error && !result.data)return fail(404,"NOT_FOUND","This generation isn’t available.");
        const value=JobDtoSchema.safeParse(result.data);
        if(result.error || !value.success)return fail(503,"SERVICE_UNAVAILABLE","We couldn’t load this generation. Try again.",true);
        return reply(value.data);
      }
      const parsed=GenerationRequestSchema.safeParse(body);
      if(!parsed.success)return NextResponse.json(makeValidationError(parsed.error,requestId),{status:422,headers});
      const key=request.headers.get("idempotency-key");
      if(!key || !/^[a-zA-Z0-9_-]{1,128}$/.test(key))return fail(422,"VALIDATION_FAILED","A valid Idempotency-Key is required for generation.");
      // Retries use exactly the same identity. The database checks the receipt
      // before draft freshness, pause/capacity or changed source state.
      let result=await client.rpc("enqueue_generation",{project:generationProject!,request_key:key,request:parsed.data});
      for(let attempt=1;attempt<3 && ["40P01","55P03"].includes(result.error?.code??"");attempt++)result=await client.rpc("enqueue_generation",{project:generationProject!,request_key:key,request:parsed.data});
      const code=result.error?.code;
      if(code==="P2102")return fail(409,"STATE_CONFLICT","Your stored generation history reached its capacity. Existing results and eligible retries remain available; contact the creator for help.");
      if(code==="P2103")return fail(429,"RATE_LIMITED","The daily new-generation allowance has been reached. It resets at 00:00 UTC. Eligible retries use the existing request.",true);
      if(code==="P1604")return fail(429,"RATE_LIMITED","The daily AI allowance has been reached. It resets at 00:00 UTC; your draft is preserved.",true);
      if(code==="42501")return fail(404,"NOT_FOUND","This draft isn’t available.");
      if(code==="22023")return fail(422,"VALIDATION_FAILED","Complete the required content, check the text limits, and select the required sources before submitting.");
      if(code==="23505")return fail(409,"IDEMPOTENCY_CONFLICT","This request key was used with different settings. Recover the original request before submitting another.");
      if(code==="40001"){
        const version=Number(result.error?.details);
        return NextResponse.json({error:{code:"DRAFT_VERSION_CONFLICT",message:"This draft changed. Reload the saved draft before submitting.",retryable:false,requestId,retryAt:null,fieldErrors:[],...(Number.isSafeInteger(version)&&version>0?{details:{currentDraftVersion:version}}:{})}},{status:409,headers});
      }
      if(code==="P1401"){
        const job=IdSchema.safeParse(result.error?.details);
        return NextResponse.json({error:{code:"ACTIVE_JOB_EXISTS",message:"You already have an active generation. Finish or cancel it before starting another.",retryable:false,requestId,retryAt:null,fieldErrors:[],...(job.success?{details:{jobId:job.data}}:{})}},{status:409,headers});
      }
      if(code==="P1402")return fail(503,"GENERATION_PAUSED","New generation requests are paused. Your draft is safe.");
      if(code==="P1403")return fail(409,"STORAGE_CAPACITY","Generation storage capacity is unavailable, full, or needs configuration. Your draft is safe.");
      if(code==="P1404")return fail(409,"OUTPUT_LIMIT","Your retained videos and reserved output slots have reached the configured limit.");
      if(code==="P1405")return fail(409,"UPLOAD_INCOMPLETE","Finish or replace the selected uploads before submitting.");
      if(code==="P1407")return fail(410,"INPUTS_EXPIRED","This generation or its inputs are no longer available. Reopen the draft and check its sources.");
      const value=QueuedResultSchema.safeParse(result.data);
      if(result.error || !value.success)return fail(503,"SERVICE_UNAVAILABLE","We couldn’t confirm the generation request. Retry the exact request with the same key to recover it.",true);
      return NextResponse.json({data:value.data},{status:202,headers:{...headers,Location:value.data.statusUrl}});
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
      if(JSON.stringify(replacement?.sources??[])!==JSON.stringify(current?.draftInput.sources??[]))return fail(422,"VALIDATION_FAILED","Use the upload controls to add or remove files.");
      const draft=canonicalDraft(mode,input?.title??change?.title??current?.title,replacement,input?.preferences??change?.preferences??current?.preferences);
      const key=request.headers.get("idempotency-key")??randomUUID();
      if(create && !/^[a-zA-Z0-9_-]{1,128}$/.test(key))return fail(422,"VALIDATION_FAILED","Use a valid request key.");
      const result=create ? await client.rpc("create_project_draft",{project:randomUUID(),request_key:key,request_hash:createHash("sha256").update(JSON.stringify(draft)).digest("hex"),new_title:draft.title,new_mode:mode,new_input:draft.draftInput,new_preferences:draft.preferences}) : await client.rpc("update_project_draft",{project:projectId!,expected_version:change!.expectedDraftVersion,new_title:draft.title,new_input:draft.draftInput,new_preferences:draft.preferences});
      if(result.error?.code==="P2101")return fail(409,"STATE_CONFLICT","Your account reached its saved-project capacity. Existing drafts remain available; contact the creator if you need help.");
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
export const DELETE = handle;
