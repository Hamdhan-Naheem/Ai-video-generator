import {z} from "zod";
import {IdSchema,IsoTimeSchema,ModeSchema,TitleSchema,VersionSchema} from "./common.ts";
export const SavedDraftSchema=z.strictObject({id:IdSchema,title:TitleSchema,mode:ModeSchema,draftVersion:VersionSchema,updatedAt:IsoTimeSchema});
export const DraftCursorSchema=z.strictObject({updatedAt:IsoTimeSchema,id:IdSchema});
export const SavedDraftPageSchema=z.strictObject({items:z.array(SavedDraftSchema).max(20),nextCursor:z.string().min(1).max(256).regex(/^[a-zA-Z0-9_-]+$/).nullable()});
export type SavedDraftPage=z.infer<typeof SavedDraftPageSchema>;

export const DeleteDraftRequestSchema=z.strictObject({expectedDraftVersion:VersionSchema});
export const DeleteDraftResultSchema=z.strictObject({deleted:z.literal(true),cleanupState:z.literal("pending")});
