import {z} from 'zod';
import {IdSchema,DecimalStringSchema,IsoTimeSchema} from './common.ts';
import {WorkerHealthSchema,LeaseTokenSchema} from './worker.ts';
import {JobStatusSchema} from './responses.ts';
import {StoryboardSchema} from '../../src/contracts.ts';
const hash=z.string().regex(/^[a-f0-9]{64}$/),key=z.string().regex(/^[a-zA-Z0-9:_-]{1,100}$/);
export const EducationVerificationSchema=z.strictObject({version:z.literal(1),orientation:z.enum(['landscape','portrait']),durationMs:z.number().int().min(60000).max(90000),width:z.number().int(),height:z.number().int(),fps:z.literal(30),fullDecode:z.literal(true),audio:z.literal(true),sceneCount:z.number().int().min(4).max(6),captionCount:z.number().int().positive(),mouthCueCount:z.number().int().positive(),coverage:z.number().min(.85).max(1),provider:z.enum(['gemini','elevenlabs']),voice:z.string().min(1).max(100)}).superRefine((v,c)=>{if(v.width!==(v.orientation==='landscape'?1280:720)||v.height!==(v.orientation==='landscape'?720:1280))c.addIssue({code:'custom',message:'Invalid output dimensions'});});
export const WorkerOperationSchema=z.discriminatedUnion('type',[
 z.strictObject({type:z.literal('state')}),
 z.strictObject({type:z.literal('progress'),stage:z.enum(['understand','story','voice','render']),completedScenes:z.number().int().min(0).max(6).optional(),totalScenes:z.number().int().min(4).max(6).optional()}).superRefine((v,c)=>{if((v.completedScenes===undefined)!==(v.totalScenes===undefined)||(v.completedScenes!==undefined&&(v.stage!=='voice'||v.completedScenes>v.totalScenes!)))c.addIssue({code:'custom',message:'Invalid narration scene counts'});}),
 z.strictObject({type:z.literal('attempt'),nonce:IdSchema,operationKey:key,provider:z.enum(['Gemini','Gemini TTS','ElevenLabs']),modelId:z.string().regex(/^[a-zA-Z0-9._-]{1,100}$/),voiceId:z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).optional(),requestHash:hash}),
 z.strictObject({type:z.literal('attempt_result'),attemptId:IdSchema,status:z.enum(['succeeded','failed','outcome_unknown','not_sent'])}),
 z.strictObject({type:z.literal('repair'),key,stage:z.enum(['story','voice']),reason:z.enum(['PLAN_INVALID','DURATION_INVALID'])}),
 z.strictObject({type:z.literal('plan'),dependencyHash:hash,modelId:z.string().max(100),plan:StoryboardSchema}),
 z.strictObject({type:z.literal('allocate'),key,kind:z.enum(['audio','alignment','mouth_cues','timeline','thumbnail','video','report','captions_srt','captions_vtt']),bytes:z.number().int().min(1).max(52428800),checksum:hash}),
 z.strictObject({type:z.literal('confirm'),assetId:IdSchema}),
 z.strictObject({type:z.literal('read'),assetId:IdSchema}),
 z.strictObject({type:z.literal('checkpoint'),stage:z.enum(['understand','story','voice','render']),key,dependencyHash:hash,manifest:z.record(z.string(),z.json()),assetIds:z.array(IdSchema).max(24)}),
 z.strictObject({type:z.literal('complete'),key,video:IdSchema,thumbnail:IdSchema,srt:IdSchema,vtt:IdSchema,report:IdSchema}),
 z.strictObject({type:z.literal('fail'),code:z.enum(['PIPELINE_FAILED','PROVIDER_UNAVAILABLE','PROVIDER_OUTCOME_UNKNOWN','INPUT_INVALID','BUDGET_EXHAUSTED','MEDIA_PROCESSING_FAILED','STORAGE_UNAVAILABLE'])}),
]);
export const WorkerExecutionRequestSchema=z.strictObject({instanceId:IdSchema,jobId:IdSchema,leaseToken:LeaseTokenSchema,health:WorkerHealthSchema,operation:WorkerOperationSchema});
export const WorkerExecutionReplySchema=z.strictObject({serverTime:IsoTimeSchema,leaseExpiresAt:IsoTimeSchema.nullable(),value:z.record(z.string(),z.json())});
export type WorkerOperation=z.infer<typeof WorkerOperationSchema>;
export const EducationRunSchema=z.strictObject({jobId:IdSchema,status:z.enum([...JobStatusSchema.options,'expired']),stage:z.enum(['understand','story','voice','render']),activeMs:DecimalStringSchema,revisionId:IdSchema,expiresAt:IsoTimeSchema.nullable(),startedAt:IsoTimeSchema.nullable(),serverTime:IsoTimeSchema,retryAt:IsoTimeSchema.nullable(),workerStatus:z.enum(['online','offline','not_configured']),claimsPaused:z.boolean(),progress:z.strictObject({completedScenes:z.number().int().min(0).max(6),totalScenes:z.number().int().min(4).max(6).nullable()})}).superRefine((v,c)=>{if(v.progress.completedScenes>(v.progress.totalScenes??0))c.addIssue({code:'custom',message:'Invalid scene counts'});if(v.status!=='waiting_quota'&&v.retryAt!==null)c.addIssue({code:'custom',message:'Unexpected retry time'});});
export type EducationRun=z.infer<typeof EducationRunSchema>;
