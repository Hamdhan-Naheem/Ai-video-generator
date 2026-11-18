import { z } from "zod";
import { AcknowledgmentsSchema, AudienceSchema, boundedText, BriefSchema, countCharacters, IdSchema, IntendedUseSchema, LIMITS, NameSchema, PreferencesSchema, RequiredBriefSchema, TitleSchema, TopicSchema, VersionSchema } from "./common.ts";

export const SourceSelectionSchema = z.strictObject({ assetId: IdSchema, role: z.enum(["image", "recording", "logo"]) });
const sources = z.array(SourceSelectionSchema).max(LIMITS.images + LIMITS.recordings);
const common = { title: TitleSchema, brief: BriefSchema.default(""), sources, intendedUse: IntendedUseSchema };
const education = z.strictObject({ ...common, mode: z.literal("education"), topic: TopicSchema, audience: AudienceSchema,
  learningObjective: boundedText(LIMITS.objective).optional(), referenceNotes: boundedText(LIMITS.notes).optional() });
const software = z.strictObject({ ...common, mode: z.literal("software"), softwareName: NameSchema, brief: RequiredBriefSchema,
  featureHighlights: boundedText(LIMITS.brief).optional() });
const branding = z.strictObject({ ...common, mode: z.literal("branding"), productName: NameSchema,
  benefits: z.array(boundedText(LIMITS.benefit, true)).max(LIMITS.benefits).optional(),
  brandDetails: boundedText(LIMITS.brief).optional(), brandColors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).max(LIMITS.colors).optional(),
  callToAction: boundedText(LIMITS.callToAction).optional(), intendedAudience: boundedText(LIMITS.intendedAudience).optional() });

const draftCommon = { title: boundedText(LIMITS.title).optional(), brief: BriefSchema.optional(), sources: sources.optional(), intendedUse: IntendedUseSchema.optional() };
const educationDraft = z.strictObject({ ...draftCommon, mode: z.literal("education"), topic: boundedText(LIMITS.topic).optional(), audience: AudienceSchema.optional(),
  learningObjective: boundedText(LIMITS.objective).optional(), referenceNotes: boundedText(LIMITS.notes).optional() });
const softwareDraft = z.strictObject({ ...draftCommon, mode: z.literal("software"), softwareName: boundedText(LIMITS.name).optional(), featureHighlights: boundedText(LIMITS.brief).optional() });
const brandingDraft = z.strictObject({ ...draftCommon, mode: z.literal("branding"), productName: boundedText(LIMITS.name).optional(),
  benefits: z.array(boundedText(LIMITS.benefit)).max(LIMITS.benefits).optional(), brandDetails: branding.shape.brandDetails,
  brandColors: branding.shape.brandColors, callToAction: branding.shape.callToAction, intendedAudience: branding.shape.intendedAudience });
type CheckedInput = z.infer<typeof educationDraft> | z.infer<typeof softwareDraft> | z.infer<typeof brandingDraft>;
function checkInput(input: CheckedInput, ctx: z.RefinementCtx, complete: boolean) {
  const add = (path: string, code: string) => ctx.addIssue({ code: "custom", path: [path], message: code, params: { contractCode: code } });
  const selected = input.sources ?? [];
  const imageCount = selected.filter(source => source.role !== "recording").length;
  const recordingCount = selected.filter(source => source.role === "recording").length;
  if (new Set(selected.map(source => source.assetId.toLowerCase())).size !== selected.length) add("sources", "duplicate_source");
  if (imageCount > LIMITS.images || recordingCount > LIMITS.recordings) add("sources", "source_limit");
  if (input.mode === "education" && selected.length) add("sources", "mode_source");
  if (input.mode === "software" && selected.some(source => source.role === "logo")) add("sources", "mode_source");
  if (input.mode === "branding" && recordingCount) add("sources", "mode_source");
  if (complete && input.mode === "software" && !selected.length) add("sources", "source_required");
  if (complete && input.mode === "branding" && !selected.some(source => source.role === "image")) add("sources", "source_required");
  const supplemental = input.mode === "education" ? [input.learningObjective] : input.mode === "software" ? [input.featureHighlights] : [input.brandDetails, input.callToAction, input.intendedAudience, ...(input.benefits ?? [])];
  const budget = [input.brief, ...supplemental].reduce<number>((sum, text) => sum + countCharacters(text ?? ""), 0);
  if (budget > LIMITS.brief) add("brief", "text_budget");
}
export const GenerationInputSchema = z.discriminatedUnion("mode", [education, software, branding]).superRefine((value, ctx) => checkInput(value, ctx, true));
export const DraftInputSchema = z.discriminatedUnion("mode", [educationDraft, softwareDraft, brandingDraft]).superRefine((value, ctx) => checkInput(value, ctx, false));
/** Both fields stay editable when the aggregate budget is exceeded; never silently discard text. */
export const SoftwareTextSchema = z.strictObject({ brief: BriefSchema, featureHighlights: boundedText(LIMITS.brief) }).superRefine((value, ctx) => {
  if (countCharacters(value.brief) + countCharacters(value.featureHighlights) > LIMITS.brief) ctx.addIssue({ code: "custom", path: ["featureHighlights"], message: "text_budget", params: { contractCode: "text_budget" } });
});
/** Source content comes from the owned draft on the server, never from this request. */
export const GenerationRequestSchema = z.strictObject({ draftVersion: VersionSchema, preferences: PreferencesSchema, acknowledgments: AcknowledgmentsSchema });
export type DraftInput = z.infer<typeof DraftInputSchema>;
export type GenerationInput = z.infer<typeof GenerationInputSchema>;
export type GenerationRequest = z.infer<typeof GenerationRequestSchema>;
