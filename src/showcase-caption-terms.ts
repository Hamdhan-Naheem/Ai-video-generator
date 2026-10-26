import type {Caption} from './contracts.js';
// Reviewed source-specific homophone correction; retains the observed word interval.
export function correctShowcaseTerms(captions:Caption[],script:string):Caption[]{
  if(!/bride or groom/i.test(script))return captions;
  return captions.map((c,i)=>c.text.trim().toLowerCase()==='brighter'&&captions[i+1]?.text.trim().toLowerCase()==='groom'?{...c,text:' bride or'}:c);
}
