import {z} from "zod";
import {ModeSchema,OrientationSchema,VoiceProfileIdSchema} from "./common.ts";
export const CapabilitiesDtoSchema=z.strictObject({
 modes:z.array(z.strictObject({id:ModeSchema,draftAvailable:z.boolean(),generationAvailable:z.boolean()})).length(3),
 durations:z.array(z.union([z.literal(60),z.literal(75),z.literal(90)])).min(1).max(3),
 orientations:z.array(OrientationSchema).min(1).max(2),
 uploadLimits:z.strictObject({enabled:z.boolean(),images:z.number().int().positive(),imageBytes:z.number().int().positive(),recordingBytes:z.number().int().positive(),recordingSeconds:z.number().int().positive(),combinedBytes:z.number().int().positive()}),
 educationCapabilities:z.strictObject({drafts:z.boolean(),generation:z.boolean(),voicePreview:z.boolean()}),limitsVersion:z.literal("v1")
});
export const VoiceDtoSchema=z.strictObject({id:VoiceProfileIdSchema,label:z.string().max(80),language:z.literal("en"),description:z.string().max(400),previewUrl:z.literal("/api/v1/voices/Kore/preview").nullable(),available:z.boolean()});
export const VoicesDtoSchema=z.strictObject({items:z.array(VoiceDtoSchema).max(20),nextCursor:z.null()});
export type CapabilitiesDto=z.infer<typeof CapabilitiesDtoSchema>;
export type VoicesDto=z.infer<typeof VoicesDtoSchema>;
