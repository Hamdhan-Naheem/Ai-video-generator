import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GenerationRecoverySchema,GenerationRetryRequestSchema,WorkerOperationSchema} from '../shared/contracts/index.ts';
import {educationFailureCode} from '../src/worker/failure.ts';
import {ProviderError} from '../src/providers.ts';
test('recovery request forbids edited content and budget overrides',()=>{
 assert(GenerationRetryRequestSchema.safeParse({}).success);
 for(const body of [{topic:'changed'},{resetBudget:true},{revisionId:'new'},null])assert(!GenerationRetryRequestSchema.safeParse(body).success);
});
test('recovery projection is narrow and known',()=>{
 const value={jobId:'c1800000-0000-4000-8000-000000000001',revisionId:'c1800000-0000-4000-8000-000000000002',reason:'retry'};
 assert(GenerationRecoverySchema.safeParse(value).success);
 assert(!GenerationRecoverySchema.safeParse({...value,workerToken:'secret'}).success);
 assert(!GenerationRecoverySchema.safeParse({...value,reason:'ignore_limits'}).success);
});
test('provider refusals and unknown responses never become blind retry',()=>{
 for(const kind of ['authentication','request','refusal','invalid-response'])assert.equal(educationFailureCode(new ProviderError('Gemini',403,kind),'story'),'PIPELINE_FAILED');
 assert.equal(educationFailureCode(new ProviderError('Gemini',0,'connection'),'voice'),'PROVIDER_OUTCOME_UNKNOWN');
 assert.equal(educationFailureCode(new ProviderError('Gemini',503,'service'),'voice'),'PROVIDER_UNAVAILABLE');
 assert.equal(educationFailureCode(new Error('VIDEO_VERIFICATION_FAILED'),'render'),'PIPELINE_FAILED');
 assert.equal(educationFailureCode(new Error('Renderer exited unexpectedly'),'render'),'MEDIA_PROCESSING_FAILED');
 assert.equal(educationFailureCode(new Error('Invalid storyboard'),'story'),'PIPELINE_FAILED');
 for(const code of ['MEDIA_PROCESSING_FAILED','STORAGE_UNAVAILABLE'])assert(WorkerOperationSchema.safeParse({type:'fail',code}).success);
});
import {EducationSession} from '../src/worker/education.ts';
import {WorkerAssignmentSchema} from '../shared/contracts/worker.ts';
import {WorkerTransport} from '../src/worker/transport.ts';
import {randomUUID} from 'node:crypto';
test('same-job recovery restores matching checkpoints across leases without provider calls',async()=>{
 const stamp='2026-11-07T00:00:00Z',jobId=randomUUID(),checkpointId=randomUUID(),fingerprint='a'.repeat(64),instanceId=randomUUID();
 const claim=WorkerAssignmentSchema.parse({jobId,revisionId:randomUUID(),projectId:randomUUID(),kind:'generation',stage:'render',leaseToken:'3',serverTime:stamp,leaseExpiresAt:'2026-11-07T00:01:30Z',heartbeatIntervalSeconds:20,input:{schemaVersion:1,inputHash:'a'.repeat(64),inputAssetIds:[],manifest:{input:{mode:'education',title:'Fixture',topic:'Turbines',audience:'beginner',intendedUse:'personal-learning',sources:[]},preferences:{targetSeconds:60,orientation:'landscape',voiceProfileId:'Kore'},acknowledgments:{sourceRights:true,externalAiProcessing:true,policyVersion:'v1',acceptedAt:stamp},draftVersion:1}},budgets:{maxExternalAttempts:24,usedExternalAttempts:4,maxRepairs:2,usedRepairs:1,maxActiveMs:'1800000',usedActiveMs:'12000'},checkpoints:[]});
 let reads=0;const client=new WorkerTransport({origin:'http://127.0.0.1:3000',workerId:randomUUID(),credentialId:randomUUID(),token:'wkr_'+'a'.repeat(43),expiresAt:'2026-12-01T00:00:00Z'},async(_input,init)=>{
  assert.equal(JSON.parse(String(init?.body)).operation.type,'state');reads++;
  return Response.json({data:{serverTime:stamp,leaseExpiresAt:claim.leaseExpiresAt,value:{checkpoints:[{id:checkpointId,stage:'story',key:'story-0',dependencyHash:fingerprint,manifest:{plan:{retained:true}},assets:[]}]}}});
 });
 for(const leaseToken of ['3','5']){const controller=new AbortController(),session=new EducationSession(client,{...claim,leaseToken},instanceId,{controller,assertActive(){},stop(){controller.abort();}});await session.restore();assert.deepEqual(session.saved('story-0',fingerprint)?.manifest,{plan:{retained:true}});assert.equal(session.saved('story-0','b'.repeat(64)),undefined);assert.equal(session.assignment.budgets.usedExternalAttempts,4);assert.equal(session.assignment.budgets.usedRepairs,1);}
 assert.equal(reads,2);
});
