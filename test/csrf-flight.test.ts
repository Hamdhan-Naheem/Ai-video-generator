import {test} from 'node:test';import assert from 'node:assert/strict';import {accountRequest,AccountError} from '../apps/web/src/lib/auth-browser.ts';
test('concurrent mutations share one token read without caching it across sessions',async()=>{
 const old=globalThis.fetch;let reads=0,posts=0;let release!:()=>void;const waiting=new Promise<void>(r=>{release=r;});
 globalThis.fetch=async(input,init)=>{if(String(input)==='/api/v1/auth/csrf'){reads++;if(reads===1)await waiting;return Response.json({data:{csrfToken:`nonce-${reads}`}});}posts++;assert.equal((init?.headers as Record<string,string>)['X-CSRF-Token'],posts<=3?'nonce-1':'nonce-2');return Response.json({data:{ok:true}});};
 try{const requests=[0,1,2].map(n=>accountRequest(`fixture/${n}`,{method:'POST',body:{}}));assert.equal(reads,1);release();await Promise.all(requests);assert.equal(posts,3);await accountRequest('fixture/next',{method:'POST',body:{}});assert.equal(reads,2);assert.equal(posts,4);}finally{globalThis.fetch=old;}
});
test('aborting one caller does not cancel another caller sharing the token fetch',async()=>{
 const old=globalThis.fetch;let posts=0,release!:()=>void;const waiting=new Promise<void>(r=>{release=r;});const cancelled=new AbortController();
 globalThis.fetch=async(input,init)=>{if(String(input)==='/api/v1/auth/csrf'){assert.notEqual(init?.signal,cancelled.signal);await waiting;return Response.json({data:{csrfToken:'nonce'}});}posts++;return Response.json({data:{ok:true}});};
 try{const first=accountRequest('fixture/cancelled',{method:'POST',body:{}},cancelled.signal),other=accountRequest('fixture/active',{method:'POST',body:{}});cancelled.abort();release();await assert.rejects(first,{name:'AbortError'});await other;assert.equal(posts,1);}finally{globalThis.fetch=old;}
});
test('a rejected mutation is reported without automatic replay',async()=>{
 const old=globalThis.fetch;let posts=0;globalThis.fetch=async input=>String(input)==='/api/v1/auth/csrf'?Response.json({data:{csrfToken:'nonce'}}):(posts++,Response.json({error:{code:'CSRF_REJECTED',message:'Security check expired.',retryable:false,requestId:'c2000000-0000-4000-8000-000000000001',retryAt:null,fieldErrors:[]}},{status:403}));
 try{await assert.rejects(()=>accountRequest('fixture/reject',{method:'POST',body:{}}),e=>e instanceof AccountError&&e.status===403);assert.equal(posts,1);}finally{globalThis.fetch=old;}
});
