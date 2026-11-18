import { z } from "zod";

export const CONTRACT_VERSION = 1;
export const POLICY_VERSION = "v1";
export const LIMITS = {
  displayName: 80, title: 120, name: 120, topic: 300, objective: 500, notes: 10000,
  brief: 4000, benefits: 8, benefit: 200, colors: 4, callToAction: 160, intendedAudience: 200,
  email: 254, passwordMin: 12, passwordMax: 128,
  images: 8, imageBytes: 5000000, recordings: 1, recordingBytes: 45000000,
  recordingSeconds: 120, uploadBytes: 60000000,
} as const;
export const DURATIONS = [60, 75, 90] as const;
export const MODES = ["education", "software", "branding"] as const;
export const ORIENTATIONS = ["landscape", "portrait"] as const;
export const AUDIENCES = ["beginner", "school", "adult"] as const;
export const INTENDED_USES = ["personal-learning", "promotional"] as const;
export const ModeSchema = z.enum(MODES);
export const OrientationSchema = z.enum(ORIENTATIONS);
export const IntendedUseSchema = z.enum(INTENDED_USES);
export const AudienceSchema = z.enum(AUDIENCES);
export const IdSchema = z.uuid();
export const IsoTimeSchema = z.iso.datetime({ offset: false });
export const DecimalStringSchema = z.string().regex(/^(0|[1-9][0-9]*)$/);
export const VersionSchema = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
// Source-content budgets match existing browser maxlength/counters (UTF-16 units).
export const countCharacters = (value: string) => value.length;

/** Native content limits match existing form controls; display names use Unicode code points. */
export function boundedText(max: number, required = false, trim = false) {
  const text = trim ? z.string().trim() : z.string();
  return text.max(max).refine(value => !required || value.trim().length > 0, {
    message: required ? "Enter nonblank text within the character limit." : "Text exceeds the character limit.",
  }).meta({ maxLength: max, "x-character-count": "utf16-code-units", ...(required ? { minLength: 1 } : {}) });
}
export const DisplayNameSchema = z.string().trim().refine(value => [...value].length >= 1 && [...value].length <= LIMITS.displayName).meta({ minLength: 1, maxLength: LIMITS.displayName, "x-character-count": "unicode-code-points" });
export const TitleSchema = boundedText(LIMITS.title, true, true);
export const NameSchema = boundedText(LIMITS.name, true, true);
export const TopicSchema = boundedText(LIMITS.topic, true, true);
export const BriefSchema = boundedText(LIMITS.brief);
export const RequiredBriefSchema = boundedText(LIMITS.brief, true);
export const VoiceProfileIdSchema = z.string().min(1).max(80).regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/);
export const PreferencesSchema = z.strictObject({
  targetSeconds: z.union([z.literal(60), z.literal(75), z.literal(90)]),
  orientation: OrientationSchema, voiceProfileId: VoiceProfileIdSchema,
});
export const DraftPreferencesSchema = PreferencesSchema.partial();
export const AcknowledgmentsSchema = z.strictObject({
  sourceRights: z.literal(true), externalAiProcessing: z.literal(true), policyVersion: z.literal(POLICY_VERSION),
});
export type Mode = z.infer<typeof ModeSchema>;
export type Preferences = z.infer<typeof PreferencesSchema>;
export type Acknowledgments = z.infer<typeof AcknowledgmentsSchema>;
