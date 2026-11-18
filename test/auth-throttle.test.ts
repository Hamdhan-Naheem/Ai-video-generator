import {test} from 'node:test';
import assert from 'node:assert/strict';
import {authNetwork,authThrottleHashes} from '../apps/web/src/lib/auth-throttle.ts';
test('auth network attribution ignores spoofed local forwarding and fails closed outside Vercel',()=>{
 assert.equal(authNetwork(new Headers({'x-forwarded-for':'198.51.100.8'}),'http://127.0.0.1:3000',false),'local-development');
 assert.throws(()=>authNetwork(new Headers({'x-forwarded-for':'198.51.100.8'}),'https://studio.example',false));
 assert.throws(()=>authNetwork(new Headers({'x-forwarded-for':'198.51.100.8, 10.0.0.1'}),'https://studio.example',true));
 assert.equal(authNetwork(new Headers({'x-forwarded-for':'198.51.100.8'}),'https://studio.example',true),'198.51.100.8');
 assert.equal(authNetwork(new Headers({'x-forwarded-for':'2001:0db8:0:0::1'}),'https://studio.example',true),authNetwork(new Headers({'x-forwarded-for':'2001:db8::1'}),'https://studio.example',true));
});
test('shared throttle identifiers are stable across instances and scoped keyed hashes',()=>{
 const a=authThrottleHashes('Owner@Example.invalid','198.51.100.8','test-server-key');
 assert.deepEqual(a,authThrottleHashes(' owner@example.invalid ','198.51.100.8','test-server-key'));
 assert.notDeepEqual(a,authThrottleHashes('owner@example.invalid','198.51.100.8','another-key'));
 assert.match(a.subject_hash,/^[a-f0-9]{64}$/);assert.notEqual(a.subject_hash,a.network_hash);
});
