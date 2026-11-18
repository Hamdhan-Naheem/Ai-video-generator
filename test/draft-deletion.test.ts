import {test} from "node:test";
import assert from "node:assert/strict";
import {DeleteDraftRequestSchema,DeleteDraftResultSchema} from "../shared/contracts/index.ts";
test("draft deletion requires a fresh explicit integer version and rejects ownership overrides",()=>{
 assert.equal(DeleteDraftRequestSchema.safeParse({expectedDraftVersion:3}).success,true);
 for(const input of [{},{expectedDraftVersion:0},{expectedDraftVersion:1.5},{expectedDraftVersion:"1"},{expectedDraftVersion:1,ownerId:"other"}])assert.equal(DeleteDraftRequestSchema.safeParse(input).success,false);
 assert.deepEqual(DeleteDraftResultSchema.parse({deleted:true,cleanupState:"pending"}),{deleted:true,cleanupState:"pending"});
 assert.equal(DeleteDraftResultSchema.safeParse({deleted:true,cleanupState:"done"}).success,false);
});
