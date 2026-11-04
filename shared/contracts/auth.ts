import { z } from "zod";
import { DisplayNameSchema, IdSchema, LIMITS } from "./common.ts";

export const EmailSchema = z.email().max(LIMITS.email);
export const NewPasswordSchema = z.string().min(LIMITS.passwordMin).max(LIMITS.passwordMax);
// Current passwords are verified as entered, including spaces and legacy shorter passwords.
export const CurrentPasswordSchema = z.string().min(1).max(LIMITS.passwordMax);
export const SignUpRequestSchema = z.strictObject({ email: EmailSchema, password: NewPasswordSchema, displayName: DisplayNameSchema });
export const SignInRequestSchema = z.strictObject({ email: EmailSchema, password: CurrentPasswordSchema });
export const PasswordChangeRequestSchema = z.strictObject({ currentPassword: CurrentPasswordSchema, newPassword: NewPasswordSchema });
export const AuthMethodSchema = z.enum(["password", "google"]);
export const UserDtoSchema = z.strictObject({ id: IdSchema, displayName: DisplayNameSchema, email: EmailSchema,
  role: z.enum(["tester", "operator"]), authMethods: z.array(AuthMethodSchema).min(1).max(2).refine(items => new Set(items).size === items.length),
  emailOwnership: z.enum(["unknown", "provider_verified"]) });
export const AuthSessionDtoSchema = z.strictObject({ user: UserDtoSchema });
export const AuthResultDtoSchema = z.strictObject({ user: UserDtoSchema, nextPath: z.literal("/dashboard") });
export const DisplayNamePatchSchema = z.strictObject({ expectedVersion: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER), displayName: DisplayNameSchema });
export const SignOutRequestSchema = z.strictObject({ scope: z.literal("local") });
const allowedReturnPath = z.string().max(256).refine(value => ["/dashboard","/videos","/settings","/projects/new"].includes(value) || (value.startsWith("/projects/") && IdSchema.safeParse(value.slice("/projects/".length)).success));
export const GoogleSignInRequestSchema = z.strictObject({ nextPath: allowedReturnPath.optional() });
export const ReauthenticateRequestSchema = z.discriminatedUnion("method", [
  z.strictObject({ method: z.literal("password"), password: CurrentPasswordSchema, action: z.literal("delete_account") }),
  z.strictObject({ method: z.literal("google"), action: z.literal("delete_account") }),
]);
export const ProfileNameInputSchema = DisplayNameSchema;
export type UserDto = z.infer<typeof UserDtoSchema>;
export type SignUpRequest = z.infer<typeof SignUpRequestSchema>;
