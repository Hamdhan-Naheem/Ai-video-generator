import {z} from 'zod';
import {AuthResultDtoSchema,SignInRequestSchema,SignOutRequestSchema,OperatorHealthSchema,OperatorJobSchema,OperatorJobPageSchema,OperatorAuditPageSchema,OperatorControlsSchema} from '../../shared/contracts/index.ts';
export const OperatorConfigSchema=z.strictObject({APP_ORIGIN:z.string().url().max(2048),OPERATOR_EMAIL:SignInRequestSchema.shape.email,OPERATOR_PASSWORD:SignInRequestSchema.shape.password});
export class OperatorClientError extends Error{constructor(readonly code:string){super(code);}}
export class OperatorClient{
 private jar=new Map<string,string>();
 constructor(readonly origin:string,private fetcher:typeof fetch=fetch){const u=new URL(origin);if(u.origin!==origin||u.username||u.password||(u.protocol!=='https:'&&origin!=='http://127.0.0.1:3000'))throw new OperatorClientError('INVALID_OPERATOR_ORIGIN');}
 private async request(path:string,method='GET',body?:unknown,csrf?:string):Promise<unknown>{
  let response:Response;
  try{response=await this.fetcher(this.origin+'/api/v1/'+path,{method,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(30000),headers:{Origin:this.origin,...(this.jar.size?{Cookie:[...this.jar].map(([k,v])=>k+'='+v).join('; ')}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...(csrf?{'X-CSRF-Token':csrf}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});}
  catch{throw new OperatorClientError(method==='GET'?'OPERATOR_READ_UNAVAILABLE':'OPERATOR_REQUEST_UNCERTAIN');}
  for(const cookie of response.headers.getSetCookie()){const first=cookie.split(';',1)[0],i=first.indexOf('=');if(i<=0)continue;const name=first.slice(0,i),value=first.slice(i+1);if(!/^[A-Za-z0-9_.-]{1,128}$/.test(name)||value.length>8192||this.jar.size>=32&&!this.jar.has(name))throw new OperatorClientError('INVALID_OPERATOR_SESSION');if(value)this.jar.set(name,value);else this.jar.delete(name);}
  if(response.status===204)return null;
  const reader=response.body?.getReader();let size=0;const parts:Uint8Array[]=[];
  try{if(!reader)throw Error();for(;;){const p=await reader.read();if(p.done)break;size+=p.value.length;if(size>65536){await reader.cancel();throw Error();}parts.push(p.value);}const value=JSON.parse(Buffer.concat(parts).toString('utf8'));
   if(!response.ok){const code=response.status===401?'OPERATOR_AUTH_REQUIRED':response.status===403?'OPERATOR_ACCESS_DENIED':response.status===409?'OPERATOR_STATE_CONFLICT':response.status===429?'OPERATOR_RATE_LIMITED':'OPERATOR_SERVICE_UNAVAILABLE';throw new OperatorClientError(code);}
   return z.strictObject({data:z.unknown()}).parse(value).data;
  }catch(cause){if(cause instanceof OperatorClientError)throw cause;throw new OperatorClientError(method==='GET'?'INVALID_OPERATOR_RESPONSE':'OPERATOR_REQUEST_UNCERTAIN');}
 }
 private async mutation(path:string,method:string,body:unknown){const csrf=z.strictObject({csrfToken:z.string().min(16).max(4096),expiresAt:z.string()}).parse(await this.request('auth/csrf'));return this.request(path,method,body,csrf.csrfToken);}
 async signIn(email:string,password:string){const credentials=SignInRequestSchema.parse({email,password});const result=AuthResultDtoSchema.parse(await this.mutation('auth/sign-in','POST',credentials));if(result.user.role!=='operator')throw new OperatorClientError('OPERATOR_ACCESS_DENIED');}
 async signOut(){try{if([...this.jar.keys()].some(k=>/^sb-.+-auth-token(?:\.\d+)?$/.test(k)))await this.mutation('auth/sign-out','POST',SignOutRequestSchema.parse({scope:'local'}));}finally{this.jar.clear();}}
 async read(command:'health'|'jobs'|'audit'|'workers',query=new URLSearchParams()){
  const data=await this.request('operator/'+command+(query.size?'?'+query.toString():''));
  if(command==='jobs')return OperatorJobPageSchema.parse(data);if(command==='audit')return OperatorAuditPageSchema.parse(data);
  if(command==='workers')return z.strictObject({workers:OperatorHealthSchema.shape.workers}).parse(data);return OperatorHealthSchema.parse(data);
 }
 async controls(body:unknown){return OperatorControlsSchema.parse(await this.mutation('operator/controls','PATCH',body));}
 async reconcile(job:string,body:unknown){return OperatorJobSchema.parse(await this.mutation('operator/jobs/'+z.uuid().parse(job)+'/reconcile','POST',body));}
}
