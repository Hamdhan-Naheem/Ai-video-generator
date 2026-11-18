import {executeWorker} from '@/lib/worker-execution';
import {WorkerExecutionRequestSchema} from '@contracts';
import {createHash,randomUUID} from "node:crypto";
import {NextResponse,type NextRequest} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {WorkerClaimRequestSchema,WorkerHeartbeatRequestSchema,WorkerReleaseRequestSchema,WorkerAssignmentSchema,WorkerHeartbeatSchema,WorkerReleaseSchema} from "@contracts";
import {authConfig} from "@/lib/auth-server";
import type {Database} from "../../../../../../../../shared/database/database.types";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:NextRequest,context:{params:Promise<{action:string}>}){
 const headers={"Cache-Control":"private, no-store","Vary":"Authorization","X-Content-Type-Options":"nosniff","X-Request-Id":randomUUID()};
 const fail=(status:number,code:string,message:string)=>NextResponse.json({error:{code,message}},{status,headers});
 try{
  const {action}=await context.params;
  if(!["claim","heartbeat","release","execute"].includes(action))return fail(404,"INVALID_WORKER_REQUEST","This worker action is unavailable.");
  const auth=request.headers.get("authorization");
  if(request.headers.has("origin") || !auth || !/^Bearer wkr_[a-zA-Z0-9_-]{43}$/.test(auth))return fail(401,"WORKER_AUTH_REQUIRED","Worker authentication is required.");
  if(request.headers.get("x-worker-protocol")!=="1")return fail(503,"WORKER_VERSION_UNSUPPORTED","Worker protocol 1 is required.");
  if([...request.nextUrl.searchParams].length || request.headers.get("content-type")?.split(";")[0].trim().toLowerCase()!=="application/json")return fail(422,"INVALID_WORKER_REQUEST","Use the supported worker JSON request.");
  const reader=request.body?.getReader();if(!reader)return fail(400,"INVALID_WORKER_REQUEST","Send a worker request.");
  let size=0;const chunks:Uint8Array[]=[];
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>(action==="execute"?262144:16384)){await reader.cancel();return fail(413,"WORKER_REQUEST_TOO_LARGE","Worker request is too large.");}chunks.push(value);}
  let body:unknown;try{body=JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{return fail(400,"INVALID_WORKER_REQUEST","Send valid JSON.");}
  const parsed=(action==="execute"?WorkerExecutionRequestSchema:action==="claim"?WorkerClaimRequestSchema:action==="heartbeat"?WorkerHeartbeatRequestSchema:WorkerReleaseRequestSchema).safeParse(body);
  if(!parsed.success)return fail(422,"INVALID_WORKER_REQUEST","Check the supported worker fields.");
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)return fail(503,"WORKER_UNAVAILABLE","Worker services are unavailable.");
  const client=createClient<Database>(authConfig().url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:"no-store",signal:AbortSignal.timeout(10000)})}});
  const hash=createHash("sha256").update(auth.slice(7)).digest("hex");
  if(action==="execute"){try{return NextResponse.json({data:await executeWorker(client,hash,parsed.data)},{headers});}catch(cause){const code=cause && typeof cause==="object" && "code" in cause?cause.code:null;return fail(code==="P1501"?401:code==="P1503"?409:code==="P1602"?409:code==="P1603"?409:code==="P1605"?409:code==="P1604"?409:code==="P1601"?422:503,code==="P1501"?"WORKER_AUTH_REQUIRED":code==="P1503"?"LEASE_LOST":code==="P1605"?"ARTIFACT_UPLOAD_INCOMPLETE":code==="P1604"?"PROVIDER_DAILY_LIMIT":code==="P1603"?"WORKER_BUDGET_OR_RECONCILIATION":"WORKER_EXECUTION_UNAVAILABLE","This processing operation could not be authorized or verified.");}}
  const result=await client.rpc("worker_control",{credential_hash:hash,protocol:1,action,payload:parsed.data});
  if(result.error?.code==="P1501")return fail(401,"WORKER_AUTH_REQUIRED","Worker authentication is unavailable or expired.");
  if(result.error?.code==="P1502")return fail(503,"WORKER_VERSION_UNSUPPORTED","Worker protocol 1 is required.");
  if(result.error?.code==="P1503")return fail(409,"LEASE_LOST","This worker assignment is no longer valid.");
  if(result.error?.code==="P1504")return fail(422,"INVALID_WORKER_REQUEST","Check the supported worker fields and capabilities.");
  if(result.error)return fail(503,"WORKER_UNAVAILABLE","Worker services are temporarily unavailable.");
  if(action==="claim" && result.data && typeof result.data==="object"&&!Array.isArray(result.data)&&result.data.idle===true)return new NextResponse(null,{status:204,headers:{...headers,"Retry-After":"15"}});
  const value=(action==="claim"?WorkerAssignmentSchema:action==="heartbeat"?WorkerHeartbeatSchema:WorkerReleaseSchema).safeParse(result.data);
  if(!value.success)return fail(503,"WORKER_UNAVAILABLE","The worker assignment could not be verified.");
  return NextResponse.json({data:value.data},{headers});
 }catch{return fail(503,"WORKER_UNAVAILABLE","Worker services are temporarily unavailable.");}
}
