import {ProjectDtoSchema,type ProjectDto,type ProjectCreateRequestSchema} from "../../../../shared/contracts/index.ts";
import type {z} from "zod";
type Create=z.infer<typeof ProjectCreateRequestSchema>;
export type CreateAttempt={key:string;body:Create;receipt?:ProjectDto};
type Send=(path:string,options:{method:"POST"|"PATCH";body:unknown;idempotencyKey?:string})=>Promise<unknown>;
export async function saveDraftAttempt(project:ProjectDto|null,attempt:CreateAttempt,latest:Create,send:Send):Promise<ProjectDto>{
 let base=project;
 if(!base){
  // Replay the exact original payload/key before applying any newer form edits.
  attempt.receipt??=ProjectDtoSchema.parse(await send("projects",{method:"POST",idempotencyKey:attempt.key,body:attempt.body}));
  base=attempt.receipt;
  if(JSON.stringify(latest)===JSON.stringify(attempt.body))return base;
 }
  return ProjectDtoSchema.parse(await send("projects/"+base.id,{method:"PATCH",body:{expectedDraftVersion:base.draftVersion,title:latest.title,draftInput:latest.draftInput,preferences:latest.preferences}}));
}
