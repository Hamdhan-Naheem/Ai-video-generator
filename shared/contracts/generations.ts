import {z} from "zod";
import {IdSchema} from "./common.ts";
import {JobStatusSchema,StageSchema} from "./responses.ts";

/** No private source paths, worker tokens, raw errors or request content in receipts. */
export const QueuedResultSchema=z.strictObject({jobId:IdSchema,revisionId:IdSchema,status:JobStatusSchema,stage:StageSchema,statusUrl:z.string().regex(/^\/api\/v1\/jobs\/[0-9a-f-]{36}$/),reused:z.boolean()}).refine(value=>value.statusUrl===`/api/v1/jobs/${value.jobId}`,{message:"Inconsistent job destination."});
export type QueuedResult=z.infer<typeof QueuedResultSchema>;

export const GenerationRetryRequestSchema=z.strictObject({});
export const GenerationRecoverySchema=z.strictObject({jobId:IdSchema,revisionId:IdSchema,reason:z.enum(['retry','daily_limit','edit_input','inputs_expired','budget_exhausted','operator_required','state_conflict','unavailable'])});
export type GenerationRecovery=z.infer<typeof GenerationRecoverySchema>;

export const GenerationCancelRequestSchema=z.strictObject({});
export const GenerationCancelResultSchema=z.strictObject({jobId:IdSchema,status:z.enum(['cancel_requested','cancelled'])});
