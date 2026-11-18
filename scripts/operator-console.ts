import {readFileSync,statSync} from 'node:fs';
import {parseArgs,parseEnv} from 'node:util';
import {OperatorClient,OperatorClientError,OperatorConfigSchema} from '../src/operator/client.ts';
import {OperatorControlsRequestSchema,OperatorReconcileRequestSchema,OperatorPageRequestSchema} from '../shared/contracts/index.ts';
async function main(){
 const p=parseArgs({strict:true,options:{config:{type:'string'},command:{type:'string'},'allow-hosted':{type:'boolean'},before:{type:'string'},status:{type:'string'},'expected-version':{type:'string'},'generation-paused':{type:'string'},'claims-paused':{type:'string'},job:{type:'string'},'expected-lease':{type:'string'},'request-id':{type:'string'},reason:{type:'string'},help:{type:'boolean'}}}).values;
 if(p.help){console.log('operator --config <private env file> --command health|workers|jobs|audit|controls|reconcile [--allow-hosted]. Controls/reconcile require --request-id UUID --reason maintenance|provider_outage|storage_review|release_check, and the displayed --expected-version / --expected-lease. See doc/OPERATOR-CONTROLS.md.');return;}
 const command=p.command??'health',allowed=['config','command','allow-hosted',...(command==='jobs'?['before','status']:command==='audit'?['before']:command==='controls'?['request-id','reason','expected-version','generation-paused','claims-paused']:command==='reconcile'?['request-id','reason','job','expected-lease']:[])];
 if(!['health','workers','jobs','audit','controls','reconcile'].includes(command)||Object.keys(p).some(k=>!allowed.includes(k)))throw new OperatorClientError('INVALID_OPERATOR_OPTIONS');
 const configFile=p.config??'.cache/operator.env',info=statSync(configFile);if(!info.isFile()||info.size>8192||process.platform!=='win32'&&(info.mode&0o077)!==0)throw new OperatorClientError('INVALID_OPERATOR_CONFIG');
 const raw=readFileSync(configFile,'utf8');if(Buffer.byteLength(raw)>8192)throw new OperatorClientError('INVALID_OPERATOR_CONFIG');const config=OperatorConfigSchema.parse(parseEnv(raw));
 if(config.APP_ORIGIN!=='http://127.0.0.1:3000'&&!p['allow-hosted'])throw new OperatorClientError('EXPLICIT_HOSTED_TARGET_REQUIRED');
 const client=new OperatorClient(config.APP_ORIGIN);
 const flag=(key:'generation-paused'|'claims-paused')=>{if(p[key]===undefined)return undefined;if(!['true','false'].includes(p[key]!))throw new OperatorClientError('INVALID_OPERATOR_OPTIONS');return p[key]==='true';};
 const input=command==='controls'?OperatorControlsRequestSchema.parse({requestId:p['request-id'],reason:p.reason,expectedVersion:Number(p['expected-version']),generationPaused:flag('generation-paused'),claimsPaused:flag('claims-paused')}):command==='reconcile'?OperatorReconcileRequestSchema.parse({requestId:p['request-id'],reason:p.reason,expectedLeaseToken:p['expected-lease']}):OperatorPageRequestSchema.parse({...p.before?{before:p.before}:{},...p.status?{status:p.status}:{}});
 try{await client.signIn(config.OPERATOR_EMAIL,config.OPERATOR_PASSWORD);
  const value=command==='controls'?await client.controls(input):command==='reconcile'?await client.reconcile(p.job??'',input):await client.read(command as 'health'|'jobs'|'audit'|'workers',new URLSearchParams(input as Record<string,string>));
  console.log(JSON.stringify(value,null,2));
 }finally{try{await client.signOut();}catch{console.error('OPERATOR_SIGNOUT_UNCONFIRMED: local cookies were discarded; server-side sign-out was not confirmed.');process.exitCode=1;}}
}
main().catch(cause=>{console.error(cause instanceof OperatorClientError?cause.code:'INVALID_OPERATOR_CONFIGURATION_OR_RESPONSE');console.error('Do not share private config, passwords or cookie headers. For an uncertain mutation, reuse the same request ID and exact arguments; no automatic mutation retry was attempted.');process.exitCode=1;});
