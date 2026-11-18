import {test} from 'node:test';
import assert from 'node:assert/strict';
import {accountRequest,AccountError} from '../apps/web/src/lib/auth-browser.ts';

test('non-JSON authentication failure tears down the session using status, without leaking the response',async()=>{
 const oldFetch=globalThis.fetch,oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
 const events=new EventTarget();let expired=0;events.addEventListener('account-session-expired',()=>expired++);
 Object.defineProperty(globalThis,'window',{value:events,configurable:true});
 globalThis.fetch=async()=>new Response('<html>PRIVATE_PROXY_DIAGNOSTICS</html>',{status:401});
 try{await assert.rejects(()=>accountRequest('me/settings'),e=>e instanceof AccountError&&e.status===401&&!e.message.includes('PRIVATE_PROXY'));assert.equal(expired,1);await assert.rejects(()=>accountRequest('auth/sign-in'));assert.equal(expired,1);}
 finally{globalThis.fetch=oldFetch;if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);else Reflect.deleteProperty(globalThis,'window');}
});

test('temporary non-JSON failures do not expire a session or replay a mutation',async()=>{
 const oldFetch=globalThis.fetch,oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window');const events=new EventTarget();let expired=0,posts=0;
 events.addEventListener('account-session-expired',()=>expired++);Object.defineProperty(globalThis,'window',{value:events,configurable:true});
 globalThis.fetch=async(input,init)=>{assert.ok(init?.signal);if(String(input).endsWith('/csrf'))return Response.json({data:{csrfToken:'fixture-only'}});posts++;return new Response('PRIVATE_PROXY_DIAGNOSTICS',{status:503});};
 try{await assert.rejects(()=>accountRequest('projects/fixture',{method:'PATCH',body:{}}),e=>e instanceof AccountError&&e.status===503&&!e.message.includes('PRIVATE_PROXY'));assert.equal(expired,0);assert.equal(posts,1);}
 finally{globalThis.fetch=oldFetch;if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);else Reflect.deleteProperty(globalThis,'window');}
});

test('unreadable successful/security responses are sanitized and never treated as a save receipt',async()=>{
 const old=globalThis.fetch;let posts=0;
 try{globalThis.fetch=async()=>new Response('PRIVATE_BAD_JSON');await assert.rejects(()=>accountRequest('projects/fixture'),e=>e instanceof AccountError&&e.status===502&&!e.message.includes('PRIVATE_BAD'));
 globalThis.fetch=async(input)=>{if(!String(input).endsWith('/csrf'))posts++;return new Response('PRIVATE_BAD_JSON');};
 await assert.rejects(()=>accountRequest('projects',{method:'POST',body:{}}),e=>e instanceof AccountError&&e.status===503&&!e.message.includes('PRIVATE_BAD'));assert.equal(posts,0);
 }finally{globalThis.fetch=old;}
});

test('caller cancellation still aborts an in-flight bounded request without replay',async()=>{
 const old=globalThis.fetch,controller=new AbortController();let started!:()=>void;const ready=new Promise<void>(resolve=>{started=resolve;});let calls=0;
 globalThis.fetch=async(_input,init)=>{calls++;started();return new Promise<Response>((_resolve,reject)=>{init!.signal!.addEventListener('abort',()=>reject(init!.signal!.reason),{once:true});});};
 try{const pending=accountRequest('projects/fixture',undefined,controller.signal);await ready;controller.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(calls,1);}finally{globalThis.fetch=old;}
});
