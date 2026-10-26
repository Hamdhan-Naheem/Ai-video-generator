import path from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {readJson,writeJson,hash,safeRun} from '../src/storage.js';
import {validateShowcasePlan} from '../src/showcase-contracts.js';
const run=safeRun('marriage-showcase');
const candidate=JSON.parse(await readFile(path.join(run,'plan-candidate-0.txt'),'utf8'));
const narration=[
  'Meet Make My Marriage, one calm wedding planning workspace designed for couples and their families.',
  'Organize celebrations, dates, locations, tasks, budgets, and expenses, keeping your wedding details connected in one place.',
  'Manage guest lists, invitation links, responses, and wedding documents, without requiring your guests to create accounts.',
  'Start with the bride or groom side, then invite both families into the same wedding workspace.',
  'Create your wedding, bring everyone together, and start planning with Make My Marriage.',
];
candidate.scenes.forEach((s:{narration:string},i:number)=>s.narration=narration[i]);
const plan=validateShowcasePlan(candidate);const source=await readJson<{sha256:string}>(path.join(run,'source.json'));
const key=hash({sourceHash:source.sha256,model:process.env.GEMINI_PLANNER_MODEL,version:2});
await writeJson(path.join(run,'showcase-plan.json'),{key,value:plan});
await writeFile(path.join(run,'script.txt'),narration.join('\n\n'));
await writeJson(path.join(run,'plan-review.json'),{origin:'Gemini screenshot analysis and storyboard',revision:'Locally shortened and qualified before speech to fit the requested 30–40 seconds. Original AI drafts are retained.',originalDraftWords:98,repairDraftWords:61,reviewedWords:narration.join(' ').split(/\s+/).length,additionalImageRequests:0,scope:'Specific reviewed source screenshot; not autonomous generic software understanding.'});
console.log('Reviewed screenshot-based plan validated: '+narration.join(' ').split(/\s+/).length+' words.');
