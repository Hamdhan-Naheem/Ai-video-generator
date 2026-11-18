export function browserPolicy(nonce:string,storageUrl:string|undefined,development:boolean){
 if(!/^[A-Za-z0-9+/]{20,}={0,2}$/.test(nonce))throw Error('Invalid policy nonce');
 let storage='';
 if(storageUrl){const u=new URL(storageUrl);if(u.username||u.password||!['https:','http:'].includes(u.protocol)||(u.protocol==='http:'&&!['127.0.0.1','localhost'].includes(u.hostname)))throw Error('Invalid storage origin');storage=u.origin;}
 return ["default-src 'self'",`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development?" 'unsafe-eval'":''}`,"style-src 'self' 'unsafe-inline'",`img-src 'self' data: blob: ${storage}`,`media-src 'self' blob: ${storage}`,`connect-src 'self' ${storage}${development?' ws: wss:':''}`,"font-src 'self'","worker-src 'self' blob:","object-src 'none'","base-uri 'none'","form-action 'self'","frame-ancestors 'none'"].join('; ');
}
export const browserHeaders={
 'X-Frame-Options':'DENY',
 'X-Content-Type-Options':'nosniff',
 'Referrer-Policy':'no-referrer',
 'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=()',
};
