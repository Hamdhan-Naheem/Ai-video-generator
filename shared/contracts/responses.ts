import { z } from "zod";
import { DecimalStringSchema, IdSchema, IsoTimeSchema } from "./common.ts";

export const StageSchema = z.enum(["understand", "story", "voice", "render"]);
export const JobStatusSchema = z.enum(["queued", "waiting_worker", "running", "waiting_quota", "needs_input", "cancel_requested", "cancelled", "failed", "succeeded"]);
export const SafeJobErrorSchema = z.strictObject({ code: z.string().regex(/^[A-Z][A-Z0-9_]{0,79}$/), message: z.string().min(1).max(500), retryable: z.boolean(), action: z.enum(["retry", "wait", "edit_input", "reupload", "contact_operator", "none"]) });
export const JobDtoSchema = z.strictObject({
  id: IdSchema, projectId: IdSchema, revisionId: IdSchema, kind: z.enum(["generation", "caption_export"]), status: JobStatusSchema, stage: StageSchema,
  progress: z.strictObject({ completedScenes: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER), totalScenes: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).nullable(), activeMs: DecimalStringSchema }),
  lastEventSequence: DecimalStringSchema, createdAt: IsoTimeSchema, startedAt: IsoTimeSchema.nullable(), finishedAt: IsoTimeSchema.nullable(), retryAt: IsoTimeSchema.nullable(), error: SafeJobErrorSchema.nullable(), canCancel: z.boolean(), canRetry: z.boolean(),
}).superRefine((job, ctx) => {
  if (job.progress.totalScenes !== null && job.progress.completedScenes > job.progress.totalScenes) ctx.addIssue({ code: "custom", path: ["progress", "completedScenes"], message: "Invalid scene counts." });
  if ((job.startedAt && Date.parse(job.startedAt) < Date.parse(job.createdAt)) || (job.finishedAt && Date.parse(job.finishedAt) < Date.parse(job.startedAt ?? job.createdAt))) ctx.addIssue({ code: "custom", path: ["finishedAt"], message: "Invalid timestamp order." });
});
export const ERROR_CODES = ["INVALID_JSON", "INVALID_QUERY", "INVALID_CURSOR", "AUTH_REQUIRED", "SESSION_EXPIRED", "INVALID_CREDENTIALS", "ACCOUNT_DISABLED", "OPERATOR_REQUIRED", "CSRF_REJECTED", "REAUTH_REQUIRED", "NOT_FOUND", "DRAFT_VERSION_CONFLICT", "IDEMPOTENCY_CONFLICT", "ACTIVE_JOB_EXISTS", "STATE_CONFLICT", "BUDGET_EXHAUSTED", "OUTPUT_LIMIT", "GENERATION_PAUSED", "MEDIA_EXPIRED", "INPUTS_EXPIRED", "ACTION_GRANT_EXPIRED", "BODY_TOO_LARGE", "UPLOAD_TOO_LARGE", "UNSUPPORTED_MEDIA_TYPE", "VALIDATION_FAILED", "INVALID_MEDIA", "INSUFFICIENT_SOURCE", "UNSUPPORTED_TOPIC", "RATE_LIMITED", "PROVIDER_QUOTA", "SERVICE_UNAVAILABLE", "STORAGE_UNAVAILABLE", "OAUTH_UNAVAILABLE", "STORAGE_CAPACITY", "ASSET_IN_USE", "UPLOAD_INCOMPLETE"] as const;
export const FieldErrorSchema = z.strictObject({ path: z.string().max(200), code: z.string().max(80), message: z.string().max(300) });
const errorCommon = { message: z.string().min(1).max(500), retryable: z.boolean(), requestId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/), retryAt: IsoTimeSchema.nullable(), fieldErrors: z.array(FieldErrorSchema).max(100) };
const errorVariants = ERROR_CODES.map(code => z.strictObject({ ...errorCommon, code: z.literal(code), details: code === "ACTIVE_JOB_EXISTS" ? z.strictObject({ jobId: IdSchema }).optional() : code === "DRAFT_VERSION_CONFLICT" ? z.strictObject({ currentDraftVersion: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER) }).optional() : z.strictObject({}).optional() }));
export const ErrorEnvelopeSchema = z.strictObject({ error: z.union(errorVariants) });
const messages: Record<string, string> = {
  text_budget: "Combined text exceeds the 4,000-character limit.", source_required: "Select the required source media.", mode_source: "This media role is not supported for this video type.", duplicate_source: "A source may only be selected once.", source_limit: "Too many source files selected.",
};
const safePathParts = new Set(["mode", "title", "brief", "sources", "assetId", "role", "intendedUse", "topic", "audience", "learningObjective", "referenceNotes", "softwareName", "featureHighlights", "productName", "benefits", "brandDetails", "brandColors", "callToAction", "intendedAudience", "email", "password", "displayName", "currentPassword", "newPassword", "draftVersion", "preferences", "targetSeconds", "orientation", "voiceProfileId", "acknowledgments", "sourceRights", "externalAiProcessing", "policyVersion"]);
/** Never return Zod's raw input, unexpected property names or interpolated issue messages. */
export function validationFieldErrors(error: z.ZodError): z.infer<typeof FieldErrorSchema>[] {
  return error.issues.slice(0,100).map(issue => {
    const custom = issue.code === "custom" && typeof issue.params?.contractCode === "string" ? issue.params.contractCode : "";
    const code = Object.hasOwn(messages, custom) ? custom : issue.code;
    return { path: issue.path.map(part => typeof part === "number" ? String(part) : safePathParts.has(String(part)) ? String(part) : "field").join("."), code, message: messages[code] ?? "Check this field's value, type and allowed length." };
  });
}
export function makeValidationError(error: z.ZodError, requestId: string) {
  return ErrorEnvelopeSchema.parse({ error: { code: "VALIDATION_FAILED", message: "Check the highlighted fields.", retryable: false, requestId, retryAt: null, fieldErrors: validationFieldErrors(error) } });
}
export type JobDto = z.infer<typeof JobDtoSchema>;
export type SafeJobError = z.infer<typeof SafeJobErrorSchema>;
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
