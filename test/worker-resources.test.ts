import test from 'node:test';
import assert from 'node:assert/strict';
import {freemem} from 'node:os';
import {freeWorkerMemory,renderConcurrency} from '../src/worker/resources.ts';

test('worker reports available memory within host and cgroup bounds',()=>{
 const before=process.availableMemory(),actual=freeWorkerMemory(),after=process.availableMemory();
 assert(actual>0&&actual<=freemem()+16_000_000);
 assert(actual<=Math.max(before,after)+16_000_000);
});
test('operator render cap is conservative and invalid values fail closed',()=>{
 const old=process.env.WORKER_RENDER_CONCURRENCY;
 try{
  process.env.WORKER_RENDER_CONCURRENCY='1';assert.equal(renderConcurrency(),1);
  process.env.WORKER_RENDER_CONCURRENCY='2';assert(renderConcurrency()<=2);
  for(const value of ['0','5','-1','NaN','2.5','100']){process.env.WORKER_RENDER_CONCURRENCY=value;assert.throws(()=>renderConcurrency(),/must be/);}
 }finally{if(old===undefined)delete process.env.WORKER_RENDER_CONCURRENCY;else process.env.WORKER_RENDER_CONCURRENCY=old;}
});
