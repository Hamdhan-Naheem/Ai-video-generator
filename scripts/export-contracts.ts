import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { CapabilitiesDtoSchema, VoicesDtoSchema, CONTRACT_VERSION, ProjectCreateRequestSchema, ProjectPatchRequestSchema, ProjectDtoSchema, DashboardDtoSchema, AcknowledgmentsSchema, AuthResultDtoSchema, AuthSessionDtoSchema, DraftInputSchema, DraftPreferencesSchema, ErrorEnvelopeSchema, GenerationInputSchema, GenerationRequestSchema, GoogleSignInRequestSchema, JobDtoSchema, PasswordChangeRequestSchema, PreferencesSchema, ReauthenticateRequestSchema, SignInRequestSchema, SignOutRequestSchema, SignUpRequestSchema, SourceSelectionSchema, UserDtoSchema } from "../shared/contracts/index.js";

const catalog={Capabilities:CapabilitiesDtoSchema,Voices:VoicesDtoSchema,Project:ProjectDtoSchema,ProjectCreateRequest:ProjectCreateRequestSchema,ProjectPatchRequest:ProjectPatchRequestSchema,Dashboard:DashboardDtoSchema,Acknowledgments:AcknowledgmentsSchema,Preferences:PreferencesSchema,DraftPreferences:DraftPreferencesSchema,SourceSelection:SourceSelectionSchema,DraftInput:DraftInputSchema,GenerationInput:GenerationInputSchema,GenerationRequest:GenerationRequestSchema,SignUpRequest:SignUpRequestSchema,SignInRequest:SignInRequestSchema,GoogleSignInRequest:GoogleSignInRequestSchema,SignOutRequest:SignOutRequestSchema,PasswordChangeRequest:PasswordChangeRequestSchema,ReauthenticateRequest:ReauthenticateRequestSchema,User:UserDtoSchema,AuthSession:AuthSessionDtoSchema,AuthResult:AuthResultDtoSchema,Job:JobDtoSchema,ErrorEnvelope:ErrorEnvelopeSchema};
const schemas=Object.fromEntries(Object.entries(catalog).map(([name,schema])=>{
  const { $schema: _dialect, ...json }=z.toJSONSchema(schema,{io:"input"});
  return [name,json];
}));
const content=JSON.stringify({openapi:"3.1.0",info:{title:"AI Video Studio shared contract catalog",version:`${CONTRACT_VERSION}.0.0`,description:"W-03 component schemas only; paths are intentionally empty because endpoints are not implemented. Runtime Zod validation additionally enforces cross-field budgets, source roles, uniqueness, whitespace/Unicode constraints and timestamp ordering. Server ownership, catalog eligibility, media decoding and sanitization remain mandatory."},paths:{},components:{schemas}},null,2)+"\n";
const path=fileURLToPath(new URL("../shared/contracts/openapi.json",import.meta.url));
if(process.argv.includes("--check")) {
  if(readFileSync(path,"utf8")!==content) throw new Error("Contract catalog is stale. Run npm run contracts:generate.");
  console.log("Shared contract catalog matches runtime schemas.");
} else { writeFileSync(path,content); console.log("Generated shared OpenAPI 3.1 component catalog."); }
