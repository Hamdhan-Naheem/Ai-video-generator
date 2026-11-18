import {withJobWorkspace} from '../maintenance/workspaces.ts';
import {root} from '../storage.js';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {checkpoint,safeRun,writeJson,hash} from '../storage.js';
import {WorkerAssignmentSchema,FrozenInputSchema,type WorkerAssignment} from '../../shared/contracts/worker.ts';
import {LeaseGuard} from './transport.js';
export async function prepareAssignment(raw:WorkerAssignment,guard:LeaseGuard,instanceId:string){
 const assignment=WorkerAssignmentSchema.parse(raw);guard.assertActive();
 const expected=assignment.input.manifest.input.sources.map(v=>v.assetId.toLowerCase()).sort(),actual=assignment.input.inputAssetIds.map(v=>v.toLowerCase()).sort();if(JSON.stringify(expected)!==JSON.stringify(actual))throw Error('WORKER_SOURCE_SCOPE_INVALID');
 return withJobWorkspace(root,assignment,async()=>{
 const run=safeRun(`web-${assignment.jobId}`),attempt=path.join(run,'attempts',assignment.leaseToken);
 // The shared checkpoint contains only immutable input. Existing atomic writes
 // and content validation make concurrent/restarted preparation harmless. Mutable
 // execution data belongs to its server-issued fence directory, never this cache.
 await mkdir(run,{recursive:true});guard.assertActive();
 const manifest=await checkpoint(run,'worker-assignment',{jobId:assignment.jobId,revisionId:assignment.revisionId,inputHash:assignment.input.inputHash,adapter:1},v=>{const cached=FrozenInputSchema.parse(v);if(hash(cached)!==hash(assignment.input.manifest))throw Error('WORKER_CACHE_INVALID');return cached;},async()=>assignment.input.manifest);
 guard.assertActive();await mkdir(attempt,{recursive:true});await writeJson(path.join(attempt,'assignment.json'),{jobId:assignment.jobId,revisionId:assignment.revisionId,instanceId,leaseToken:assignment.leaseToken,inputHash:assignment.input.inputHash,stage:assignment.stage});guard.assertActive();return {run,attempt,manifest};
 });
}
