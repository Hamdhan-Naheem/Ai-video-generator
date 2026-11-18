import {createHmac} from 'node:crypto';
import {isIP} from 'node:net';

/** Trust forwarded addresses only on the intended Vercel deployment boundary. */
export function authNetwork(headers:Headers,origin:string,onVercel:boolean){
 const url=new URL(origin);
 if(['127.0.0.1','localhost'].includes(url.hostname))return 'local-development';
 if(!onVercel)throw Error('TRUSTED_NETWORK_UNAVAILABLE');
 const value=headers.get('x-forwarded-for')?.trim();
 if(!value||!isIP(value))throw Error('TRUSTED_NETWORK_UNAVAILABLE');
 // Collapse equivalent IPv6 spellings before hashing. Do not accept address lists.
 return isIP(value)===6?new URL(`http://[${value}]/`).hostname.toLowerCase():value;
}
export function authThrottleHashes(email:string,network:string,key:string){
 if(!key)throw Error('THROTTLE_CONFIGURATION_MISSING');
 const hash=(scope:string,value:string)=>createHmac('sha256',key).update(`studio-auth-v1:${scope}:${value}`).digest('hex');
 return{subject_hash:hash('subject',email.trim().toLowerCase()),network_hash:hash('network',network)};
}
