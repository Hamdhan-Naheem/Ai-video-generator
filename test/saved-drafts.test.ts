import {test} from "node:test";
import assert from "node:assert/strict";
import {SavedDraftPageSchema,DraftCursorSchema,safeProjectReturn,GoogleSignInRequestSchema} from "../shared/contracts/index.ts";
test("draft summaries exclude input content and allow only safe cursor shapes",()=>{
 const item={id:"d1500000-0000-4000-8000-000000000001",title:"A draft",mode:"education",draftVersion:1,updatedAt:"2026-11-01T00:00:00.123456Z"};assert.equal(SavedDraftPageSchema.safeParse({items:[item],nextCursor:null}).success,true);
 assert.equal(SavedDraftPageSchema.safeParse({items:[{...item,draftInput:{private:"notes"}}],nextCursor:null}).success,false);assert.equal(SavedDraftPageSchema.safeParse({items:Array(21).fill(item),nextCursor:null}).success,false);assert.equal(DraftCursorSchema.safeParse({id:item.id,updatedAt:item.updatedAt,ownerId:item.id}).success,false);
});
test("only the exact live drafts destination is retained after authentication",()=>{
 assert.equal(safeProjectReturn("/drafts"),"/drafts");assert.equal(GoogleSignInRequestSchema.safeParse({nextPath:"/drafts"}).success,true);for(const value of ["/drafts?cursor=private","/drafts#other","https://example.invalid/drafts"]){assert.equal(safeProjectReturn(value),"/dashboard");assert.equal(GoogleSignInRequestSchema.safeParse({nextPath:value}).success,false);}
});
