import {availableParallelism,freemem} from 'node:os';
// Node accounts for the container's cgroup limit; os.freemem alone can report host RAM.
export function freeWorkerMemory(){return Math.min(freemem(),process.availableMemory());}
export function renderConcurrency(){
 const configured=process.env.WORKER_RENDER_CONCURRENCY;
 if(configured!==undefined&&!/^[1-4]$/.test(configured))throw Error('WORKER_RENDER_CONCURRENCY must be 1–4');
 return Math.max(1,Math.min(Number(configured??4),availableParallelism(),Math.floor(freeWorkerMemory()/800_000_000)));
}
