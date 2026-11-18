import {z} from "zod";
import {IdSchema,IsoTimeSchema,VersionSchema} from "./common.ts";
import {ProjectDtoSchema} from "./projects.ts";
export const UploadRequestSchema=z.strictObject({expectedDraftVersion:VersionSchema,filename:z.string().min(1).max(255).regex(/^[^\x00-\x1f\x7f/\\]+$/),mimeType:z.enum(["image/png","image/jpeg","image/webp","video/mp4"]),byteSize:z.string().regex(/^[1-9][0-9]{0,7}$/),role:z.enum(["image","recording","logo"])}).superRefine((v,c)=>{if(Number(v.byteSize)>(v.role==="recording"?45000000:5000000)||(v.role==="recording")!==(v.mimeType==="video/mp4"))c.addIssue({code:"custom",message:"Unsupported file type or size"});});
export const UploadDtoSchema=z.strictObject({uploadId:IdSchema,assetId:IdSchema,filename:z.string().max(255),mimeType:z.enum(["image/png","image/jpeg","image/webp","video/mp4"]),byteSize:z.string().regex(/^[1-9][0-9]{0,7}$/),role:z.enum(["image","recording","logo"]),protocol:z.enum(["standard","tus"]),state:z.enum(["allocated","received","rejected","abandoned"]),expiresAt:IsoTimeSchema,bucket:z.literal("sources"),objectKey:z.string().regex(/^[a-f0-9-]{36}\/[a-f0-9-]{36}\/[a-f0-9-]{36}\/source\.(png|jpg|webp|mp4)$/)});
export const UploadSnapshotSchema=z.strictObject({project:ProjectDtoSchema,items:z.array(UploadDtoSchema).max(9)});
export const UploadAllocationSchema=z.strictObject({uploadId:IdSchema,snapshot:UploadSnapshotSchema});
export type UploadDto=z.infer<typeof UploadDtoSchema>;
