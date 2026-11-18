import {test} from "node:test";
import assert from "node:assert/strict";
import {EducationRunSchema,WorkerOperationSchema,type EducationRun} from "../shared/contracts/execution.ts";
import {educationStepStates,educationPollDelay,educationStatus} from "../apps/web/src/lib/education-progress.ts";
const run:EducationRun={jobId:"c1700000-0000-4000-8000-000000000001",revisionId:"c1700000-0000-4000-8000-000000000002",status:"waiting_worker",stage:"understand",activeMs:"0",expiresAt:null,startedAt:null,serverTime:"2026-11-07T00:00:00Z",retryAt:null,workerStatus:"offline",claimsPaused:false,progress:{completedScenes:0,totalScenes:null}};
test("progress respects unstarted jobs, lost worker leases and stage corrections",()=>{
 assert.deepEqual(educationStepStates(run),["upcoming","upcoming","upcoming","upcoming"]);
 const voice={...run,status:"running" as const,stage:"voice" as const,startedAt:run.serverTime,workerStatus:"online" as const};
 assert.deepEqual(educationStepStates(voice),["complete","complete","current","upcoming"]);
 assert.deepEqual(educationStepStates({...voice,workerStatus:"offline"}),["complete","complete","waiting","upcoming"]);
 assert.deepEqual(educationStepStates({...voice,stage:"story"}),["complete","current","upcoming","upcoming"]);
 assert.deepEqual(educationStepStates({...voice,status:"failed"}),["complete","complete","stopped","upcoming"]);
 assert.deepEqual(educationStepStates({...run,status:"succeeded"}),["complete","complete","complete","complete"]);
});
test("waiting never invents a retry time or treats live unrelated capacity as an active job",()=>{
 assert.equal(educationStatus({...run,workerStatus:"online"}),"Waiting for a processing computer.");
 assert.match(educationStatus({...run,status:"waiting_quota"}),/provider availability/);
 assert.match(educationStatus({...run,status:"queued",claimsPaused:true}),/temporarily paused/);
 assert.equal(educationPollDelay({...run,status:"running",workerStatus:"online"}),5000);
 assert.equal(educationPollDelay({...run,status:"running",workerStatus:"offline"}),15000);
 assert.equal(educationPollDelay({...run,status:"waiting_quota"}),15000);
 for(const status of ["succeeded","failed","cancelled","needs_input","expired"] as const)assert.equal(educationPollDelay({...run,status}),null);
});
test("scene telemetry rejects impossible counts and unknown status without loosening old stage reports",()=>{
 assert.equal(WorkerOperationSchema.safeParse({type:"progress",stage:"voice"}).success,true);
 assert.equal(WorkerOperationSchema.safeParse({type:"progress",stage:"voice",completedScenes:2,totalScenes:4}).success,true);
 for(const invalid of [{stage:"voice",completedScenes:5,totalScenes:4},{stage:"voice",completedScenes:2},{stage:"render",completedScenes:1,totalScenes:4},{stage:"voice",completedScenes:-1,totalScenes:4},{stage:"voice",completedScenes:1,totalScenes:100}])assert.equal(WorkerOperationSchema.safeParse({type:"progress",...invalid}).success,false);
 assert.equal(EducationRunSchema.safeParse(run).success,true);
 assert.equal(EducationRunSchema.safeParse({...run,status:"probably_done"}).success,false);
 assert.equal(EducationRunSchema.safeParse({...run,progress:{completedScenes:1,totalScenes:null}}).success,false);
 assert.equal(EducationRunSchema.safeParse({...run,retryAt:run.serverTime}).success,false);
});
