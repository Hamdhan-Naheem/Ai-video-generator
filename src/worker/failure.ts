import {RecoverablePipelineError} from '../pipeline-errors.ts';
import {ZodError} from 'zod';
import {ProviderError} from '../providers.js';
import {WorkerTransportError} from './transport.js';
/** Allowlist safe infrastructure recovery. Unknown/content/config failures stay stopped. */
export function educationFailureCode(cause:unknown,stage:string){
 if(cause instanceof RecoverablePipelineError)return cause.code==='STORY_VALIDATION_FAILED'?'PROVIDER_UNAVAILABLE':'MEDIA_PROCESSING_FAILED';
 if(stage==='understand'&&(cause instanceof ZodError||cause instanceof Error&&cause.message==='EDUCATION_INPUT_INVALID'))return 'INPUT_INVALID';
 if(cause instanceof ProviderError)return cause.kind==='service'||cause.kind==='quota'?'PROVIDER_UNAVAILABLE':cause.kind==='connection'?'PROVIDER_OUTCOME_UNKNOWN':'PIPELINE_FAILED';
 if(cause instanceof WorkerTransportError)return cause.code==='PROVIDER_DAILY_LIMIT'?'PROVIDER_UNAVAILABLE':cause.code==='ARTIFACT_UPLOAD_INCOMPLETE'?'STORAGE_UNAVAILABLE':'PIPELINE_FAILED';
 const code=(cause as {code?:unknown})?.code;
 if(['ENOSPC','EBUSY','EMFILE','ENOMEM'].includes(String(code)))return 'MEDIA_PROCESSING_FAILED';
 if(cause instanceof Error&&['ARTIFACT_READ_FAILED','ARTIFACT_UPLOAD_FAILED'].includes(cause.message))return 'STORAGE_UNAVAILABLE';
 if(stage==='render'&&cause instanceof Error&&!/invalid|verification|verify|hash|configuration|cache|budget|reconcil|fence|duration|stream|dimension|coverage|schema|Zod/i.test(cause.message))return 'MEDIA_PROCESSING_FAILED';
 return 'PIPELINE_FAILED';
}

export function educationFailureDetail(cause:unknown){
 if(cause instanceof RecoverablePipelineError)return{code:cause.code,issues:[...cause.issues]};
 if(cause instanceof ProviderError)return{code:({authentication:'PROVIDER_AUTHENTICATION',quota:'PROVIDER_QUOTA',service:'PROVIDER_SERVICE',connection:'PROVIDER_OUTCOME_UNKNOWN','invalid-response':'PROVIDER_RESPONSE_INVALID'} as Record<string,string>)[cause.kind]??'PROVIDER_REQUEST_REJECTED',issues:[]};
 if(cause instanceof WorkerTransportError)return{code:cause.code,issues:[]};
 return{code:'PIPELINE_STEP_FAILED',issues:[]};
}
