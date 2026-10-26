import {z} from 'zod';
const text=(max:number)=>z.string().trim().min(1).max(max).refine(s=>!/[<>\u0000]/.test(s),'Plain text required');
export const sections={
  hero:{y:160,height:1220,quote:'Plan your whole wedding, together. Create Your Wedding. Bring events, tasks, budgets, expenses, vendors, guests, invitations, RSVP, and documents into one calm workspace for couples and families.'},
  planning:{y:4580,height:1760,quote:'Multi-event planning. Create custom celebrations, dates, locations, budgets, and side assignments. Tasks and responsibilities. Budgets and expenses. Set wedding and event budgets, then record expenses and payments made outside the app.'},
  guests:{y:6920,height:1120,quote:'Guests, invitations, and RSVP. Manage households, event guest lists, invitation links, and responses without guest accounts. Wedding documents. Keep quotations, contracts, invoices, and receipts with the wedding, event, vendor, or expense.'},
  collaboration:{y:8360,height:1780,quote:'Start on one side. Plan jointly when you are ready. A wedding can begin as Bride Side or Groom Side. The same workspace can later become Joint when both families are invited. Two separately created wedding workspaces are never merged in the MVP.'},
} as const;
export const evidenceQuotes={hero:'Plan your whole wedding, together.',planning:'Multi-event planning',guests:'Guests, invitations, and RSVP',collaboration:'Start on one side. Plan jointly when you are ready.'} as const;
export const ShowcasePlan=z.object({product:z.literal('Make My Marriage'),scenes:z.array(z.object({section:z.enum(['hero','planning','guests','collaboration']),headline:text(65),narration:text(500),sourceQuote:z.enum(['Plan your whole wedding, together.','Multi-event planning','Guests, invitations, and RSVP','Start on one side. Plan jointly when you are ready.'])}).strict()).length(5)}).strict();
export type ShowcasePlanType=z.infer<typeof ShowcasePlan>;
export function validateShowcasePlan(value:unknown):ShowcasePlanType{
  const p=ShowcasePlan.parse(value);
  const expected=['hero','planning','guests','collaboration','hero'];
  const norm=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  p.scenes.forEach((s,i)=>{
    if(s.section!==expected[i])throw new Error('Unsupported screenshot scene order');
    if(!norm(sections[s.section].quote).includes(norm(s.sourceQuote)))throw new Error('Claim reference must quote its observed screenshot section');
  });
  const words=p.scenes.map(s=>s.narration).join(' ').split(/\s+/).length;
  if(words<66||words>84)throw new Error('Showcase narration must contain 66–84 words; received '+words);
  return p;
}
export interface ShowcaseProps extends Record<string,unknown>{plan:ShowcasePlanType;scenes:{startFrame:number;durationFrames:number}[];durationFrames:number;captions:{text:string;startMs:number;endMs:number}[]}
export function validateShowcaseProps(value:ShowcaseProps){
  validateShowcasePlan(value.plan);
  if(!Number.isInteger(value.durationFrames)||value.durationFrames<900||value.durationFrames>1200||value.scenes.length!==5)throw new Error('Showcase must cover 30–40 seconds in five scenes');
  let end=0;for(const s of value.scenes){if(s.startFrame!==end||!Number.isInteger(s.durationFrames)||s.durationFrames<15)throw new Error('Invalid showcase timing');end+=s.durationFrames;}
  if(end!==value.durationFrames)throw new Error('Showcase timeline does not cover output');
  let last=0;for(const c of value.captions){if(!c.text.trim()||c.startMs<last-25||c.endMs<=c.startMs||c.endMs>value.durationFrames/30*1000)throw new Error('Invalid showcase caption');last=c.endMs;}
  return value;
}
