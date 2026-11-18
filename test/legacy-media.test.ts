import {test} from 'node:test';
import assert from 'node:assert/strict';
import {authorizeLegacyMedia} from '../apps/web/src/lib/legacy-media.ts';
const stamp=Date.parse('2026-11-13T12:00:00Z'),origin='http://127.0.0.1:55421';
const media={bucket:'artifacts',objectKey:'owner/project/video.mp4',expiresAt:new Date(stamp+120000).toISOString()};
const signed=origin+'/storage/v1/object/sign/artifacts/fixture?token=synthetic';

test('legacy link authorizes the exact object twice and keeps signing bounded',async()=>{
 let checks=0;
 const grant=await authorizeLegacyMedia({storageOrigin:origin,now:()=>stamp,describe:async()=>{checks++;return{data:media,error:null};},sign:async(bucket,key,seconds)=>{assert.equal(bucket,media.bucket);assert.equal(key,media.objectKey);assert.equal(seconds,60);return{data:{signedUrl:signed},error:null};}});
 assert.deepEqual(grant,{status:307,url:signed});assert.equal(checks,2);
});

test('deletion or account disablement committing during signing prevents a new link',async()=>{
 for(const transition of ['deleted','account-disabled']){
  let state='authorized',checks=0,release!:()=>void,started!:()=>void;
  const signing=new Promise<void>(resolve=>{release=resolve;}),entered=new Promise<void>(resolve=>{started=resolve;});
  const pending=authorizeLegacyMedia({storageOrigin:origin,now:()=>stamp,describe:async()=>{checks++;return state==='authorized'?{data:media,error:null}:{data:null,error:{code:'42501'}};},sign:async()=>{started();await signing;return{data:{signedUrl:signed},error:null};}});
  await entered;state=transition;release();const grant=await pending;
  assert.equal(grant.status,404);assert.equal('url' in grant,false);assert.equal(checks,2);
 }
});

test('latest-object changes, bucket changes and expiry during signing cannot redirect',async()=>{
 for(const change of [{...media,objectKey:'owner/project/new.mp4'},{...media,bucket:'other'},{...media,expiresAt:new Date(stamp-1).toISOString()}]){
  let checks=0;
  const grant=await authorizeLegacyMedia({storageOrigin:origin,now:()=>stamp,describe:async()=>({data:++checks===1?media:change,error:null}),sign:async()=>({data:{signedUrl:signed},error:null})});
  assert.notEqual(grant.status,307);assert.equal('url' in grant,false);
 }
 let checks=0,clock=stamp;
 const expired=await authorizeLegacyMedia({storageOrigin:origin,now:()=>clock,describe:async()=>{checks++;return{data:media,error:null};},sign:async()=>{clock+=61000;return{data:{signedUrl:signed},error:null};}});
 assert.equal(expired.status,404);assert.equal('url' in expired,false);assert.equal(checks,2);
});

test('failed or malformed post-sign authorization fails closed without exposing the signed URL',async()=>{
 for(const confirmed of [{data:null,error:{code:'50300'}},{data:null,error:null},{data:{...media,expiresAt:'invalid'},error:null}]){
  let checks=0;
  const grant=await authorizeLegacyMedia({storageOrigin:origin,now:()=>stamp,describe:async()=>++checks===1?{data:media,error:null}:confirmed,sign:async()=>({data:{signedUrl:signed},error:null})});
  assert.notEqual(grant.status,307);assert.equal('url' in grant,false);
 }
});

test('initial denial skips signing and unrelated signing origins are rejected',async()=>{
 const denied=await authorizeLegacyMedia({storageOrigin:origin,now:()=>stamp,describe:async()=>({data:null,error:{code:'42501'}}),sign:async()=>{assert.fail('Denied requests cannot sign');}});
 assert.equal(denied.status,404);
 for(const url of ['https://unrelated.invalid/private','not a URL']){
  const grant=await authorizeLegacyMedia({storageOrigin:origin,now:()=>stamp,describe:async()=>({data:media,error:null}),sign:async()=>({data:{signedUrl:url},error:null})});
  assert.equal(grant.status,503);assert.equal('url' in grant,false);
 }
});
