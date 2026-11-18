import { z } from "zod";
import { DecimalStringSchema, IdSchema, IsoTimeSchema, ModeSchema, boundedText, LIMITS } from "./common.ts";
export const DashboardProjectSchema=z.strictObject({
  canEditDraft:z.boolean(),id:IdSchema,title:boundedText(LIMITS.title,true),mode:ModeSchema,updatedAt:IsoTimeSchema,
  state:z.enum(["draft","ready","expired","queued","waiting_worker","running","waiting_quota","cancel_requested","needs_input","failed","cancelled","saved"]),
});
const count=z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const DashboardDtoSchema=z.strictObject({
  asOf:IsoTimeSchema,projectCount:count,recentProjects:z.array(DashboardProjectSchema).max(6),
  usage:z.strictObject({retainedOutputs:count,reservedOutputs:count.nullable(),maxOutputs:count.nullable(),usedBytes:DecimalStringSchema.nullable(),reservedBytes:DecimalStringSchema.nullable(),byteLimit:DecimalStringSchema.nullable(),accountingConfigured:z.boolean()}),
  worker:z.strictObject({status:z.enum(["not_configured","offline","online"]),processingPaused:z.boolean()}),
});
export type DashboardDto=z.infer<typeof DashboardDtoSchema>;
