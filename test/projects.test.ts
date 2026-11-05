import test from "node:test";
import assert from "node:assert/strict";
import {ProjectCreateRequestSchema,ProjectPatchRequestSchema,ProjectDtoSchema,canonicalDraft,safeProjectReturn} from "../shared/contracts/index.ts";
test("project drafts allow incomplete modes, canonical titles and explicit supported settings",()=>{
 for(const mode of ["education","software","branding"] as const){
  assert.equal(ProjectCreateRequestSchema.safeParse({mode}).success,true);
  const draft=canonicalDraft(mode,"  ",{mode},{});
  assert.match(draft.title,/^Untitled /);assert.equal(draft.draftInput.title,draft.title);
  assert.deepEqual(draft.preferences,{targetSeconds:60,orientation:"landscape",voiceProfileId:"Kore"});
 }
 assert.equal(ProjectCreateRequestSchema.safeParse({mode:"education",draftInput:{mode:"software"}}).success,false);
 assert.equal(ProjectCreateRequestSchema.safeParse({mode:"education",ownerId:"forged"}).success,false);
 assert.equal(ProjectCreateRequestSchema.safeParse({mode:"software",draftInput:{mode:"software",brief:"x".repeat(2500),featureHighlights:"x".repeat(1501)}}).success,false);
 assert.equal(ProjectCreateRequestSchema.safeParse({mode:"education",preferences:{voiceProfileId:"unknown"}}).success,false);
 assert.equal(ProjectPatchRequestSchema.safeParse({expectedDraftVersion:1}).success,false);
 assert.equal(ProjectPatchRequestSchema.safeParse({expectedDraftVersion:1,title:""}).success,true);
 assert.equal(ProjectPatchRequestSchema.safeParse({expectedDraftVersion:1,title:"Draft",role:"operator"}).success,false);
});
test("saved draft DTO and return allowlist preserve project identity without mutation replay",()=>{
 const id="d9100000-0000-4000-8000-000000000001";
 const dto={...canonicalDraft("education","Owned",{mode:"education",topic:""},{}),id,draftVersion:1,draftState:"active",updatedAt:"2026-11-04T00:00:00.000Z",modeLocked:false};
 assert.equal(ProjectDtoSchema.safeParse(dto).success,true);
 assert.equal(ProjectDtoSchema.safeParse({...dto,owner_id:id}).success,false);
 assert.equal(ProjectDtoSchema.safeParse({...dto,draftInput:{mode:"software",title:"Owned"}}).success,false);
 assert.equal(safeProjectReturn(`/projects/${id}`),`/projects/${id}`);
 assert.equal(safeProjectReturn("/projects/new"),"/projects/new");
 for(const path of ["//evil.example","https://evil.example",`/projects/${id}?generate=1`,`/projects/${id}#fragment`,"/projects/new\n","/api/v1/projects","/projects/../../settings"]){assert.equal(safeProjectReturn(path),"/dashboard");}
});
