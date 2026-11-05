import {z} from "zod";
import {DraftInputSchema,type DraftInput} from "./inputs.ts";
import {boundedText,DraftPreferencesSchema,IdSchema,IsoTimeSchema,LIMITS,ModeSchema,PreferencesSchema,TitleSchema,VersionSchema,type Preferences} from "./common.ts";
export const INITIAL_VIDEO_PREFERENCES:Preferences={targetSeconds:60,orientation:"landscape",voiceProfileId:"Kore"};
const draftPreferences=DraftPreferencesSchema.refine(value=>value.voiceProfileId===undefined || value.voiceProfileId==="Kore",{message:"This voice is not available."});
export const ProjectCreateRequestSchema=z.strictObject({mode:ModeSchema,title:boundedText(LIMITS.title).optional(),draftInput:DraftInputSchema.optional(),preferences:draftPreferences.optional()}).superRefine((value,ctx)=>{
 if(value.draftInput && value.draftInput.mode!==value.mode)ctx.addIssue({code:"custom",path:["draftInput"],message:"Project and draft modes must match."});
});
export const ProjectPatchRequestSchema=z.strictObject({expectedDraftVersion:VersionSchema,title:boundedText(LIMITS.title).optional(),draftInput:DraftInputSchema.optional(),preferences:draftPreferences.optional()}).refine(value=>value.title!==undefined || value.draftInput!==undefined || value.preferences!==undefined,{message:"Supply a draft change."});
export const ProjectDtoSchema=z.strictObject({id:IdSchema,title:TitleSchema,mode:ModeSchema,draftInput:DraftInputSchema,preferences:PreferencesSchema,draftVersion:VersionSchema,draftState:z.literal("active"),updatedAt:IsoTimeSchema,modeLocked:z.boolean()}).superRefine((value,ctx)=>{
 if(value.draftInput.mode!==value.mode || value.draftInput.title!==value.title)ctx.addIssue({code:"custom",path:["draftInput"],message:"Inconsistent project metadata."});
});
export type ProjectDto=z.infer<typeof ProjectDtoSchema>;
export function canonicalDraft(mode:ProjectDto["mode"],title:string|undefined,input:DraftInput|undefined,preferences:Partial<Preferences>|undefined) {
 const names={education:"education video",software:"software showcase",branding:"product branding video"};
 const savedTitle=title?.trim() || `Untitled ${names[mode]}`;
 return {mode,title:savedTitle,draftInput:DraftInputSchema.parse({...input,mode,title:savedTitle,sources:input?.sources??[]}),preferences:PreferencesSchema.parse({...INITIAL_VIDEO_PREFERENCES,...preferences})};
}
export function safeProjectReturn(value:unknown):string {
 if(value==="/settings" || value==="/dashboard" || value==="/projects/new")return value;
 if(typeof value==="string" && value.startsWith("/projects/") && IdSchema.safeParse(value.slice(10)).success)return value;
 return "/dashboard";
}
