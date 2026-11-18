import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GenerationCancelRequestSchema,GenerationCancelResultSchema,WorkerAssignmentSchema,type EducationRun} from '../shared/contracts/index.ts';
import {educationStepStates,isEducationActive} from '../apps/web/src/lib/education-progress.ts';
import {startEducationChild} from '../src/worker/child.ts';
import {LeaseGuard} from '../src/worker/transport.ts';
import {randomUUID} from 'node:crypto';
test('cancel commands are strict and cannot pretend a request is acknowledged',()=>{
 assert(GenerationCancelRequestSchema.safeParse({}).success);assert(!GenerationCancelRequestSchema.safeParse({force:true}).success);
 for(const status of ['cancel_requested','cancelled'])assert(GenerationCancelResultSchema.safeParse({jobId:randomUUID(),status}).success);
 assert(!GenerationCancelResultSchema.safeParse({jobId:randomUUID(),status:'succeeded'}).success);
});
test('stopping retains active slot UI while cancelled stages preserve prior completion',()=>{
 const run={status:'cancel_requested',stage:'voice',startedAt:'2026-11-07T00:00:00Z'} as EducationRun;
 assert.deepEqual(educationStepStates(run),['complete','complete','stopping','upcoming']);assert(isEducationActive(run));
 assert.deepEqual(educationStepStates({...run,status:'cancelled'}),['complete','complete','cancelled','upcoming']);assert(!isEducationActive({...run,status:'cancelled'}));
});
test('revoked authority stops its real executor child without a provider request',async()=>{
 const stamp='2026-11-07T00:00:00Z',assignment=WorkerAssignmentSchema.parse({jobId:randomUUID(),revisionId:randomUUID(),projectId:randomUUID(),kind:'generation',stage:'understand',leaseToken:'1',serverTime:stamp,leaseExpiresAt:'2026-11-07T00:01:30Z',heartbeatIntervalSeconds:20,input:{schemaVersion:1,inputHash:'a'.repeat(64),inputAssetIds:[],manifest:{input:{mode:'education',title:'Fixture',topic:'Turbines',audience:'beginner',intendedUse:'personal-learning',sources:[]},preferences:{targetSeconds:60,orientation:'landscape',voiceProfileId:'Kore'},acknowledgments:{sourceRights:true,externalAiProcessing:true,policyVersion:'v1',acceptedAt:stamp},draftVersion:1}},budgets:{maxExternalAttempts:24,usedExternalAttempts:0,maxRepairs:2,usedRepairs:0,maxActiveMs:'1800000',usedActiveMs:'0'},checkpoints:[]});
 const guard=new LeaseGuard(stamp,assignment.leaseExpiresAt,0,()=>1);const child=startEducationChild(assignment,randomUUID(),guard,'.cache/nonexistent-cancellation-test-config.json',{providerCalls:false});guard.stop();
 await assert.rejects(child.done,/EDUCATION_EXECUTOR_FAILED/);assert(guard.controller.signal.aborted);
});
