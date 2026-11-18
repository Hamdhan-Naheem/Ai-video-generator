import {z} from 'zod';
import {IdSchema,IsoTimeSchema,DecimalStringSchema} from './common.ts';
export const OperatorReasonSchema=z.enum(['maintenance','provider_outage','storage_review','release_check']);
export const OperatorStatusSchema=z.enum(['queued','waiting_worker','running','waiting_quota','needs_input','cancel_requested','cancelled','failed','succeeded']);
const version=z.number().int().min(1).max(999999999);
export const OperatorControlsRequestSchema=z.strictObject({requestId:IdSchema,reason:OperatorReasonSchema,expectedVersion:version,generationPaused:z.boolean().optional(),claimsPaused:z.boolean().optional()}).refine(v=>v.generationPaused!==undefined||v.claimsPaused!==undefined);
export const OperatorReconcileRequestSchema=z.strictObject({requestId:IdSchema,reason:OperatorReasonSchema,expectedLeaseToken:z.string().regex(/^[1-9][0-9]{0,18}$/).refine(v=>/^[1-9][0-9]{0,18}$/.test(v)&&BigInt(v)<=9223372036854775807n)});
export const OperatorPageRequestSchema=z.strictObject({before:IdSchema.optional(),status:OperatorStatusSchema.optional()});
export const OperatorControlsSchema=z.strictObject({version,generationPaused:z.boolean(),claimsPaused:z.boolean()});
export const OperatorJobSchema=z.strictObject({id:IdSchema,projectId:IdSchema,ownerId:IdSchema,status:OperatorStatusSchema,stage:z.enum(['understand','story','voice','render']),leaseToken:DecimalStringSchema.max(19),leaseExpiresAt:IsoTimeSchema.nullable(),createdAt:IsoTimeSchema,attempts:z.number().int().nonnegative(),providerAttempts:z.number().int().nonnegative(),repairs:z.number().int().min(0).max(2),activeMs:DecimalStringSchema.max(20),checkpointCount:z.number().int().nonnegative()});
export const OperatorJobPageSchema=z.strictObject({items:z.array(OperatorJobSchema).max(25),nextCursor:IdSchema.nullable()});
export const OperatorAuditPageSchema=z.strictObject({items:z.array(z.strictObject({id:IdSchema,actorId:IdSchema.nullable(),action:z.enum(['operator.controls','operator.reconcile']),resourceId:IdSchema.nullable(),createdAt:IsoTimeSchema})).max(25),nextCursor:IdSchema.nullable()});
const counts=z.partialRecord(OperatorStatusSchema,DecimalStringSchema.max(20));
const worker=z.strictObject({id:IdSchema,enabled:z.boolean(),online:z.boolean(),lastSeenAt:IsoTimeSchema.nullable(),executionReady:z.boolean(),credentialExpiresAt:IsoTimeSchema.nullable()});
export const OperatorHealthSchema=z.strictObject({serverTime:IsoTimeSchema,controls:OperatorControlsSchema,queueCounts:counts,
 storage:z.strictObject({usedBytes:DecimalStringSchema.max(20),reservedBytes:DecimalStringSchema.max(20),limitBytes:DecimalStringSchema.max(20),retainedOutputs:z.number().int().nonnegative(),reservedOutputs:z.number().int().nonnegative(),accountingMatches:z.boolean()}),
 dailyBudget:z.strictObject({day:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),globalUsed:z.number().int().nonnegative(),globalLimit:z.literal(24),globalRemaining:z.number().int().min(0).max(24),perAccountLimit:z.literal(12),providerBalance:z.literal('unknown'),accounts:z.array(z.strictObject({ownerId:IdSchema,used:z.number().int().nonnegative(),remaining:z.number().int().min(0).max(12)})).max(50)}),
 workers:z.array(worker).max(50),cleanupCounts:z.partialRecord(z.enum(['pending','running','retry','done','blocked']),DecimalStringSchema.max(20)),expiredAssignments:DecimalStringSchema.max(20),uncertainProviderRequests:DecimalStringSchema.max(20),providerStates:z.array(z.strictObject({provider:z.enum(['gemini','elevenlabs']),state:z.enum(['available','quota_wait','config_error','unavailable','unknown'])})).max(10)});
export const OperatorRateLimitSchema=z.strictObject({rateLimited:z.literal(true),retryAfterSeconds:z.number().int().min(1).max(60)});
export const OperatorFailureSchema=z.strictObject({operatorError:z.enum(['VERSION_CONFLICT','STATE_CONFLICT','VALIDATION_FAILED'])});
