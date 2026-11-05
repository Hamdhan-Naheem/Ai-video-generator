import {test} from "node:test";
import assert from "node:assert/strict";
import {saveDraftAttempt,type CreateAttempt} from "../apps/web/src/lib/draft-save.ts";
const original={mode:"education" as const,title:"Original"};
const receipt={id:"11111111-1111-4111-8111-111111111111",title:"Original",mode:"education",draftInput:{mode:"education",title:"Original",sources:[]},preferences:{targetSeconds:60,orientation:"landscape",voiceProfileId:"Kore"},draftVersion:1,draftState:"active",updatedAt:"2026-11-05T00:00:00.000Z",modeLocked:false};
test("lost create response replays original receipt then PATCHes edited details",async()=>{
 const attempt:CreateAttempt={key:"stable-key",body:original};let calls=0;
 const send=async(path:string,options:{method:string;body:unknown;idempotencyKey?:string})=>{calls++;if(calls<=2){assert.equal(path,"projects");assert.equal(options.idempotencyKey,"stable-key");assert.deepEqual(options.body,original);if(calls===1)throw Error("Response lost after commit");return receipt;}assert.equal(path,"projects/"+receipt.id);assert.equal(options.method,"PATCH");assert.deepEqual(options.body,{expectedDraftVersion:1,title:"Edited",draftInput:undefined,preferences:undefined});return {...receipt,title:"Edited",draftInput:{...receipt.draftInput,title:"Edited"},draftVersion:2};};
 await assert.rejects(saveDraftAttempt(null,attempt,original,send));const saved=await saveDraftAttempt(null,attempt,{...original,title:"Edited"},send);assert.equal(saved.title,"Edited");assert.equal(calls,3);
});
test("failed PATCH retains reconciled identity and does not create again",async()=>{
 const attempt:CreateAttempt={key:"stable",body:original};let posts=0;
 const send=async(_path:string,options:{method:string})=>{if(options.method==="POST"){posts++;return receipt;}throw Error("Conflict");};
 await assert.rejects(saveDraftAttempt(null,attempt,{...original,title:"Edited"},send));assert.equal(attempt.receipt?.id,receipt.id);await assert.rejects(saveDraftAttempt(null,attempt,{...original,title:"Edited again"},send));assert.equal(posts,1);
});
