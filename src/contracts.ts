import {z} from 'zod';

const plain = (max: number) => z.string().trim().min(1).max(max).refine(v => !/[<>\u0000]/.test(v), 'Use plain text, without markup');
export const InputSchema = z.object({
  topic: plain(300), audience: plain(100),
  durationSeconds: z.union([z.literal(60), z.literal(75), z.literal(90)]),
  format: z.enum(['landscape', 'portrait']), visualStyle: z.enum(['diagram','solar-energy']).optional(), referenceNotes: z.string().trim().max(10000).default(''),
}).strict();
export type EducationInput = z.infer<typeof InputSchema>;
export const SceneSchema = z.object({
  id: z.string().regex(/^scene-[1-9][0-9]?$/),
  title: plain(65), narration: plain(1200),
  layout: z.enum(['intro', 'explain', 'process', 'recap']),
  keyPoints: z.array(plain(75)).min(1).max(3),
  diagramNodes: z.array(plain(28)).min(2).max(4),
  teacherGesture: z.enum(['welcome', 'point', 'explain']),
  visual: z.enum(['sunlight','solar-cells','inverter','powered-home']).optional(),
}).strict();
export const StoryboardSchema = z.object({
  title: plain(90), learningObjective: plain(250),
  factualCautions: z.array(plain(250)).max(5),
  scenes: z.array(SceneSchema).min(4).max(6),
}).strict().superRefine((v, ctx) => {
  if (new Set(v.scenes.map(s => s.id)).size !== v.scenes.length) ctx.addIssue({code:'custom',message:'Scene IDs must be unique'});
  if (v.scenes[0]?.layout !== 'intro' || v.scenes.at(-1)?.layout !== 'recap') ctx.addIssue({code:'custom',message:'Begin with intro and finish with recap'});
});
export type Storyboard = z.infer<typeof StoryboardSchema>;
export interface Caption {text: string; startMs: number; endMs: number; timestampMs: number | null; confidence: number | null}
export interface MouthCue {start: number; end: number; value: string}
export interface VideoScene {plan: Storyboard['scenes'][number]; startFrame: number; durationFrames: number}
export interface VideoProps extends Record<string, unknown> {title: string; visualStyle?: EducationInput['visualStyle']; format: EducationInput['format']; durationFrames: number; audioFile: string; scenes: VideoScene[]; captions: Caption[]; mouthCues: MouthCue[]; burnedCaptions: boolean}
const VideoSchema=z.object({visualStyle:z.enum(['diagram','solar-energy']).optional(),title:plain(90),format:z.enum(['landscape','portrait']),durationFrames:z.number().int().min(1800).max(2700),audioFile:z.literal('narration.wav'),
  scenes:z.array(z.object({plan:SceneSchema,startFrame:z.number().int().nonnegative(),durationFrames:z.number().int().positive()})).min(1).max(6),
  captions:z.array(z.object({text:plain(250),startMs:z.number().nonnegative(),endMs:z.number().positive(),timestampMs:z.number().nullable(),confidence:z.number().nullable()})).max(1000),
  mouthCues:z.array(z.object({start:z.number().nonnegative(),end:z.number().positive(),value:z.enum(['A','B','C','D','E','F','G','H','X'])})).max(10000),burnedCaptions:z.boolean(),
}).strict();
export function validateVideoProps(value:unknown):VideoProps{
  const parsed=VideoSchema.parse(value);validateSceneVisuals(parsed.scenes.map(s=>s.plan),parsed.visualStyle);let end=0;
  for(const scene of parsed.scenes){if(scene.startFrame!==end)throw new Error('Timeline scenes must be consecutive');end+=scene.durationFrames;}
  if(end!==parsed.durationFrames)throw new Error('Timeline scenes must cover the full video');
  const milliseconds=parsed.durationFrames/30*1000;
  for(const caption of parsed.captions)if(caption.endMs<=caption.startMs||caption.endMs>milliseconds)throw new Error('Render caption outside timeline');
  for(const cue of parsed.mouthCues)if(cue.end<=cue.start||cue.end*1000>milliseconds+150)throw new Error('Render mouth cue outside timeline');
  return parsed;
}
export const words = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().split(/\s+/).filter(Boolean);
export function validateWordBudget(plan: Storyboard, target: number) {
  const count = words(plan.scenes.map(s=>s.narration).join(' ')).length;
  if(count < target*1.75 || count > target*2.5) throw new Error(`Narration word count ${count} is outside the allowed ${Math.ceil(target*1.75)}–${Math.floor(target*2.5)} range`);
  return count;
}

export const solarVisuals = ['sunlight','solar-cells','inverter','powered-home'] as const;
export function validateSceneVisuals(scenes:Storyboard['scenes'],style?:EducationInput['visualStyle']) {
  if(style==='solar-energy' && (scenes.length!==4 || scenes.some((s,i)=>s.visual!==solarVisuals[i])))throw new Error('Solar scenes must follow sunlight, solar cells, inverter, powered home');
  if(style!=='solar-energy' && scenes.some(s=>s.visual!==undefined))throw new Error('Solar visuals require the explicit solar-energy style');
}
