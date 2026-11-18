import {randomBytes} from 'node:crypto';
import {NextResponse,type NextRequest} from 'next/server';
import {browserHeaders,browserPolicy} from './lib/browser-security';
export function proxy(request:NextRequest){
 const nonce=randomBytes(18).toString('base64');
 const policy=browserPolicy(nonce,process.env.SUPABASE_URL,process.env.NODE_ENV!=='production');
 const headers=new Headers(request.headers);
 // Next reads the request policy to nonce its own bootstrap/hydration scripts.
 headers.set('x-nonce',nonce);headers.set('Content-Security-Policy',policy);
 const response=NextResponse.next({request:{headers}});
 response.headers.set('Content-Security-Policy',policy);
 for(const [name,value] of Object.entries(browserHeaders))response.headers.set(name,value);
 if(process.env.APP_ORIGIN?.startsWith('https://'))response.headers.set('Strict-Transport-Security','max-age=31536000');
 return response;
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
