import test from "node:test";
import assert from "node:assert/strict";
import {DashboardDtoSchema} from "../shared/contracts/index.ts";
const dto={asOf:"2026-11-04T00:00:00.000Z",projectCount:0,recentProjects:[],usage:{retainedOutputs:0,reservedOutputs:null,maxOutputs:3,usedBytes:"9007199254740993",reservedBytes:null,byteLimit:null,accountingConfigured:false},worker:{status:"not_configured",processingPaused:true}};
test("dashboard projection preserves bigint precision, unknown configuration and private boundary",()=>{
 assert.equal(DashboardDtoSchema.parse(dto).usage.usedBytes,"9007199254740993");
 assert.equal(DashboardDtoSchema.safeParse({...dto,worker:{...dto.worker,token:"private"}}).success,false);
 assert.equal(DashboardDtoSchema.safeParse({...dto,usage:{...dto.usage,usedBytes:9007199254740993}}).success,false);
 const project={canEditDraft:true,id:"e8100000-0000-4000-8000-000000000001",title:"Saved draft",mode:"education",updatedAt:dto.asOf,state:"draft"};
 assert.equal(DashboardDtoSchema.safeParse({...dto,projectCount:1,recentProjects:[project]}).success,true);
 assert.equal(DashboardDtoSchema.safeParse({...dto,recentProjects:[{...project,draft_input:{secret:"hidden"}}]}).success,false);
 assert.equal(DashboardDtoSchema.safeParse({...dto,recentProjects:Array(7).fill(project)}).success,false);
});
