import {test} from 'node:test';import assert from 'node:assert/strict';
import {SavedVideoSchema,SavedVideoPageSchema,VideoCursorSchema,safeProjectReturn} from '../shared/contracts/index.ts';
const project='a2300000-0000-4000-8000-000000000001',revision='a2300000-0000-4000-8000-000000000002';
const item={projectId:project,revisionId:revision,canEditDraft:false,title:'Frozen title',version:2,status:'expired',orientation:'portrait',targetSeconds:75,durationMs:null,completedAt:'2026-10-01T00:00:00.123456Z',expiresAt:'2026-10-08T00:00:00.123456Z',serverTime:'2026-11-07T00:00:00Z',narration:{provider:'unknown',voice:null}};
test('library summaries retain removed-draft results but reject source/path leakage and incomplete Ready states',()=>{
 assert(SavedVideoSchema.safeParse(item).success);for(const extra of [{objectKey:'private'},{input:{notes:'private'}},{ownerId:project}])assert(!SavedVideoSchema.safeParse({...item,...extra}).success);
 assert(!SavedVideoSchema.safeParse({...item,status:'ready'}).success);assert(!SavedVideoSchema.safeParse({...item,completedAt:null}).success);
 const usage={retainedOutputs:0,reservedOutputs:0,maxOutputs:3,usedBytes:'0',reservedBytes:'0',byteLimit:'200000000',accountingConfigured:true};
 assert(SavedVideoPageSchema.safeParse({items:[item],usage,asOf:item.serverTime,nextCursor:null}).success);assert(!SavedVideoPageSchema.safeParse({items:Array(21).fill(item),usage,asOf:item.serverTime,nextCursor:null}).success);
 assert(VideoCursorSchema.safeParse({completedAt:item.completedAt,id:revision}).success);assert(!VideoCursorSchema.safeParse({completedAt:item.completedAt,id:revision,ownerId:project}).success);
});
test('only exact library and pinned-result GET destinations survive authentication',()=>{
 const target=`/projects/${project}/results/${revision}`;assert.equal(safeProjectReturn('/videos'),'/videos');assert.equal(safeProjectReturn(target),target);
 for(const value of [target+'?download=true',target+'/access',target+'#file','//evil.invalid/videos',`https:/projects/${project}/results/${revision}`,`evil/projects/${project}/results/${revision}`,'/videos?ownerId=other',`/projects/${project}/results/bad`])assert.equal(safeProjectReturn(value),'/dashboard');
});
