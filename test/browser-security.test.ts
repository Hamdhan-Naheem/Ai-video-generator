import {test} from 'node:test';import assert from 'node:assert/strict';
import {browserPolicy,browserHeaders} from '../apps/web/src/lib/browser-security.ts';
test('browser policy pins production scripts and media origins without broad HTTPS or eval permissions',()=>{
 const p=browserPolicy('a'.repeat(24),'https://storage.example',false);
 assert.match(p,/script-src 'self' 'nonce-a+' 'strict-dynamic';/);assert.doesNotMatch(p,/unsafe-eval|connect-src[^;]*https: /);
 assert.match(p,/media-src 'self' blob: https:\/\/storage.example/);assert.match(p,/frame-ancestors 'none'/);assert.equal(browserHeaders['Referrer-Policy'],'no-referrer');
 assert.throws(()=>browserPolicy('bad','https://storage.example',false));assert.throws(()=>browserPolicy('a'.repeat(24),'https://user:password@storage.example',false));assert.throws(()=>browserPolicy('a'.repeat(24),'http://remote.example',false));
 assert.match(browserPolicy('a'.repeat(24),'http://127.0.0.1:55421',true),/unsafe-eval/);
});
