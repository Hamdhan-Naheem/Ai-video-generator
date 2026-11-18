import type {Json} from '../../../../shared/database/database.types.ts';
import {IdSchema,OperatorControlsRequestSchema,OperatorReconcileRequestSchema,OperatorPageRequestSchema,OperatorHealthSchema,OperatorControlsSchema,OperatorJobSchema,OperatorJobPageSchema,OperatorAuditPageSchema,OperatorRateLimitSchema,OperatorFailureSchema} from '../../../../shared/contracts/index.ts';
type OperatorPort={rpc(name:'operator_console',args:{action:string;payload:Json}):PromiseLike<{data:unknown;error:{code:string}|null}>};
export async function operatorRequest(client:OperatorPort,path:string,method:string,query:URLSearchParams,body:unknown){
 const fail=(status:number,code:string,message:string,retryable=false)=>({status,error:{code,message,retryable}});
 let action:string,payload:Record<string,Json|undefined>,schema:typeof OperatorHealthSchema|typeof OperatorControlsSchema|typeof OperatorJobSchema|typeof OperatorJobPageSchema|typeof OperatorAuditPageSchema;
 const pieces=path.split('/');
 if(pieces.length===4&&pieces[1]==='jobs'&&IdSchema.safeParse(pieces[2]).success&&pieces[3]==='reconcile'&&method==='POST'){
  const parsed=OperatorReconcileRequestSchema.safeParse(body);if(!parsed.success||query.size)return fail(422,'VALIDATION_FAILED','Supply the displayed lease and an operator request ID.');
  action='reconcile';payload={...parsed.data,jobId:pieces[2]};schema=OperatorJobSchema;
 }else if(path==='operator/controls'&&method==='PATCH'){
  const parsed=OperatorControlsRequestSchema.safeParse(body);if(!parsed.success||query.size)return fail(422,'VALIDATION_FAILED','Supply the displayed control version and supported pause flags.');
  action='controls';payload=parsed.data;schema=OperatorControlsSchema;
 }else if(method==='GET'&&['operator/health','operator/workers','operator/jobs','operator/audit'].includes(path)){
  if([...query.keys()].some((key,i,keys)=>keys.indexOf(key)!==i))return fail(400,'INVALID_QUERY','Use one value per query parameter.');
  const parsed=OperatorPageRequestSchema.safeParse(Object.fromEntries(query));if(!parsed.success||['operator/health','operator/workers'].includes(path)&&query.size||path==='operator/audit'&&query.has('status'))return fail(400,'INVALID_QUERY','Use supported operator filters.');
  action=path.endsWith('/jobs')?'jobs':path.endsWith('/audit')?'audit':'health';payload=parsed.data;schema=action==='jobs'?OperatorJobPageSchema:action==='audit'?OperatorAuditPageSchema:OperatorHealthSchema;
 }else return fail(404,'NOT_FOUND','This operator action is unavailable.');
 const result=await client.rpc('operator_console',{action,payload});
 if(result.error){if(result.error.code==='42501')return fail(403,'OPERATOR_REQUIRED','An active operator account is required.');if(['22023','22P02','22003'].includes(result.error.code))return fail(422,'VALIDATION_FAILED','Invalid operator request.');return fail(503,'SERVICE_UNAVAILABLE','Operations are temporarily unavailable.',true);}
 const limit=OperatorRateLimitSchema.safeParse(result.data);if(limit.success)return{...fail(429,'RATE_LIMITED','Wait before checking operations again.',true),retryAfterSeconds:limit.data.retryAfterSeconds};
 const conflict=OperatorFailureSchema.safeParse(result.data);if(conflict.success)return fail(conflict.data.operatorError==='VALIDATION_FAILED'?422:409,conflict.data.operatorError==='VALIDATION_FAILED'?'VALIDATION_FAILED':'STATE_CONFLICT','Refresh health and the current assignment before retrying this action.');
 const parsed=schema.safeParse(result.data);if(!parsed.success)return fail(503,'SERVICE_UNAVAILABLE','Operational details could not be verified.',true);
 return{status:200,data:path==='operator/workers'&&'workers'in parsed.data?{workers:parsed.data.workers}:parsed.data};
}
