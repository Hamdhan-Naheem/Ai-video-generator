import {test} from "node:test";
import assert from "node:assert/strict";
import {QueuedResultSchema,GenerationRequestSchema} from "../shared/contracts/index.ts";
test("queue receipt is bounded and cannot redirect to unrelated jobs or private paths",()=>{
 const id="b1400000-0000-4000-8000-000000000001",rev="b1400000-0000-4000-8000-000000000002";
 const receipt={jobId:id,revisionId:rev,status:"waiting_worker",stage:"understand",statusUrl:`/api/v1/jobs/${id}`,reused:false};assert.equal(QueuedResultSchema.safeParse(receipt).success,true);
 for(const value of [{...receipt,statusUrl:"https://example.invalid/private"},{...receipt,statusUrl:`/api/v1/jobs/${rev}`},{...receipt,workerToken:"private"},{...receipt,objectKey:"sources/private"}])assert.equal(QueuedResultSchema.safeParse(value).success,false);
});
test("generation submissions do not accept content or client-selected resource ownership",()=>{
 const body={draftVersion:1,preferences:{targetSeconds:60,orientation:"landscape",voiceProfileId:"Kore"},acknowledgments:{sourceRights:true,externalAiProcessing:true,policyVersion:"v1"}};assert.equal(GenerationRequestSchema.safeParse(body).success,true);
 for(const extra of [{ownerId:"spoof"},{input:{}},{sources:[]},{jobId:"spoof"}])assert.equal(GenerationRequestSchema.safeParse({...body,...extra}).success,false);
});
