import {test} from 'node:test';
import assert from 'node:assert/strict';
import {allowAuthAttempt,csrfCookieName,issueCsrf,sessionFingerprint,validCsrf,CSRF_LIFETIME} from '../apps/web/src/lib/auth-security.ts';

test('CSRF token requires matching cookie/header, current session binding and finite lifetime',()=>{
  const now=1800000000000;
  const binding=sessionFingerprint([{name:'sb-local-auth-token',value:'first'}]);
  const token=issueCsrf(binding,now);
  assert.equal(validCsrf(token,token,binding,now),true);
  assert.equal(validCsrf(undefined,token,binding,now),false);
  assert.equal(validCsrf(token,null,binding,now),false);
  assert.equal(validCsrf(token,token.replace(/.$/,'x'),binding,now),false);
  assert.equal(validCsrf(token,token,sessionFingerprint([{name:'sb-local-auth-token',value:'second'}]),now),false);
  assert.equal(validCsrf(token,token,binding,now+CSRF_LIFETIME*1000),false);
  assert.equal(validCsrf(token,token,binding,now-1),false);
  assert.equal(validCsrf(token,token+'é',binding,now),false);
  assert.equal(csrfCookieName(true),'__Host-studio-csrf');
});
test('session binding ignores unrelated cookies, includes chunks and is order-independent',()=>{
  const a={name:'sb-local-auth-token.0',value:'a'},b={name:'sb-local-auth-token.1',value:'b'};
  assert.equal(sessionFingerprint([a,b]),sessionFingerprint([b,{name:'other',value:'unused'},a]));
  assert.notEqual(sessionFingerprint([a,b]),sessionFingerprint([a]));
});
test('auth attempt limit applies across casing and expires without unbounded entries',()=>{
  const now=1800000000000;
  for(let i=0;i<8;i++) assert.equal(allowAuthAttempt('rate-test@example.invalid',now),true);
  assert.equal(allowAuthAttempt('RATE-TEST@EXAMPLE.INVALID',now),false);
  assert.equal(allowAuthAttempt('rate-test@example.invalid',now+60000),true);
});
