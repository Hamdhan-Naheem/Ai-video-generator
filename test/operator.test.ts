import test from 'node:test';
import assert from 'node:assert/strict';
import {OperatorClient,OperatorClientError} from '../src/operator/client.ts';
import {OperatorControlsRequestSchema,OperatorReconcileRequestSchema,ErrorEnvelopeSchema,SignOutRequestSchema} from '../shared/contracts/index.ts';
import {operatorRequest} from '../apps/web/src/lib/operator-api.ts';
const id='d3300000-0000-4000-8000-000000000001';
test('operator mutations reject caller identity, spending overrides and noncanonical lease values',()=>{
 const base={requestId:id,reason:'maintenance',expectedVersion:1,claimsPaused:true};
 assert(OperatorControlsRequestSchema.safeParse(base).success);
 for(const extra of [{actor:id},{limits:{}},{claimsPaused:null},{reason:null},{expectedVersion:'1'}])assert(!OperatorControlsRequestSchema.safeParse({...base,...extra}).success);
 assert(!OperatorControlsRequestSchema.safeParse({requestId:id,reason:'maintenance',expectedVersion:1}).success);
 for(const lease of ['0','01','-1','9223372036854775808','1; delete'])assert(!OperatorReconcileRequestSchema.safeParse({requestId:id,reason:'maintenance',expectedLeaseToken:lease}).success);
});
test('operator API rejects arbitrary filters before invoking RPC',async()=>{
 const client={rpc:async()=>{throw Error('Must not dispatch');}} as never;
 for(const query of ['actor='+id,'status=running&status=failed','before=bad'])assert.equal((await operatorRequest(client,'operator/jobs','GET',new URLSearchParams(query),undefined)).status,400);
 assert.equal((await operatorRequest(client,'operator/controls','PATCH',new URLSearchParams(),{limits:{}})).status,422);
});
test('operator API sanitizes upstream errors and validates every projection',async()=>{
 const run=async(result:unknown)=>operatorRequest({rpc:async()=>result} as never,'operator/jobs','GET',new URLSearchParams(),undefined);
 const denied=await run({error:{code:'42501',message:'private service key'}});assert.equal(denied.status,403);assert(!JSON.stringify(denied).includes('private service key'));
 const bad=await run({data:{items:[{secret:'private source'}],nextCursor:null}});assert.equal(bad.status,503);assert(!JSON.stringify(bad).includes('private source'));
 const limit=await run({data:{rateLimited:true,retryAfterSeconds:60}});assert.equal(limit.status,429);
 const conflict=await run({data:{operatorError:'VERSION_CONFLICT'}});assert.equal(conflict.status,409);assert('error'in conflict);ErrorEnvelopeSchema.parse({error:{...conflict.error,requestId:id,retryAt:null,fieldErrors:[]}});
});
test('operator client pins origin and never follows redirects or retries ambiguous mutations',async()=>{
 assert.throws(()=>new OperatorClient('http://example.com'),OperatorClientError);assert.throws(()=>new OperatorClient('https://example.com/path'),OperatorClientError);
 let posts=0;const client=new OperatorClient('http://127.0.0.1:3000',async(input,init)=>{
  assert.equal(init?.redirect,'error');assert.equal(new URL(String(input)).origin,'http://127.0.0.1:3000');
  if(String(input).endsWith('/auth/csrf'))return Response.json({data:{csrfToken:'a'.repeat(32),expiresAt:'2026-11-13T00:00:00Z'}});
  posts++;throw Error('private upstream detail');
 });
 await assert.rejects(client.controls({}),e=>e instanceof OperatorClientError&&e.code==='OPERATOR_REQUEST_UNCERTAIN');assert.equal(posts,1);
});
test('operator CLI client carries HttpOnly cookies, refreshes CSRF and discards its session after logout',async()=>{
 const calls:{path:string;cookie:string;csrf:string}[]=[];
 const client=new OperatorClient('http://127.0.0.1:3000',async(input,init)=>{
  const path=new URL(String(input)).pathname,headers=new Headers(init?.headers);calls.push({path,cookie:headers.get('cookie')??'',csrf:headers.get('x-csrf-token')??''});
  if(path.endsWith('/auth/csrf'))return Response.json({data:{csrfToken:'a'.repeat(32),expiresAt:'2026-11-13T00:00:00Z'}});
  if(path.endsWith('/auth/sign-in'))return Response.json({data:{user:{id,displayName:'Operator',email:'operator@example.invalid',role:'operator',authMethods:['password'],emailOwnership:'unknown'},nextPath:'/dashboard'}},{headers:{'Set-Cookie':'sb-test-auth-token=fixture-private-cookie; HttpOnly; Path=/'}});
  if(path.endsWith('/auth/sign-out')){assert.deepEqual(SignOutRequestSchema.parse(JSON.parse(String(init?.body))),{scope:'local'});return new Response(null,{status:204});}
  return Response.json({data:{items:[],nextCursor:null}});
 });
 await client.signIn('operator@example.invalid','Fixture-password-2026!');await client.read('jobs');await client.signOut();await client.read('jobs');
 const reads=calls.filter(c=>c.path.endsWith('/operator/jobs'));assert(reads[0].cookie.includes('fixture-private-cookie'));assert.equal(reads[1].cookie,'');
 assert(calls.find(c=>c.path.endsWith('/auth/sign-in'))?.csrf);assert(calls.find(c=>c.path.endsWith('/auth/sign-out'))?.csrf);
});
test('failed operator signout still discards local authentication cookies',async()=>{
 let lastCookie='';const client=new OperatorClient('http://127.0.0.1:3000',async(input,init)=>{
  const path=new URL(String(input)).pathname;
  if(path.endsWith('/auth/csrf'))return Response.json({data:{csrfToken:'a'.repeat(32),expiresAt:'2026-11-13T00:00:00Z'}});
  if(path.endsWith('/auth/sign-in'))return Response.json({data:{user:{id,displayName:'Operator',email:'operator@example.invalid',role:'operator',authMethods:['password'],emailOwnership:'unknown'},nextPath:'/dashboard'}},{headers:{'Set-Cookie':'sb-test-auth-token=fixture-private-cookie; HttpOnly; Path=/'}});
  if(path.endsWith('/auth/sign-out'))throw Error('private network detail');
  lastCookie=new Headers(init?.headers).get('cookie')??'';return Response.json({data:{items:[],nextCursor:null}});
 });
 await client.signIn('operator@example.invalid','Fixture-password-2026!');await assert.rejects(client.signOut(),OperatorClientError);await client.read('jobs');assert.equal(lastCookie,'');
});
