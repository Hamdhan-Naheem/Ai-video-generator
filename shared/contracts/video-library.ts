import {z} from 'zod';
import {IdSchema,IsoTimeSchema} from './common.ts';
import {EducationResultSchema} from './results.ts';
import {DashboardDtoSchema} from './dashboard.ts';
export const SavedVideoSchema=EducationResultSchema.safeExtend({projectId:IdSchema,canEditDraft:z.boolean(),completedAt:IsoTimeSchema,expiresAt:IsoTimeSchema});
export const VideoCursorSchema=z.strictObject({completedAt:IsoTimeSchema,id:IdSchema});
export const VideoListSnapshotSchema=z.strictObject({items:z.array(SavedVideoSchema).max(21),usage:DashboardDtoSchema.shape.usage,asOf:IsoTimeSchema});
export const SavedVideoPageSchema=z.strictObject({items:z.array(SavedVideoSchema).max(20),usage:DashboardDtoSchema.shape.usage,asOf:IsoTimeSchema,nextCursor:z.string().min(1).max(256).regex(/^[a-zA-Z0-9_-]+$/).nullable()});
export type SavedVideo=z.infer<typeof SavedVideoSchema>;
export type SavedVideoPage=z.infer<typeof SavedVideoPageSchema>;

export const DeleteVideoRequestSchema=z.strictObject({expectedVersion:z.number().int().min(1).max(2147483647)});
export const DeleteVideoResultSchema=z.strictObject({deleted:z.literal(true),revisionId:IdSchema,cleanupState:z.enum(['pending','complete'])});
export type DeleteVideoResult=z.infer<typeof DeleteVideoResultSchema>;
