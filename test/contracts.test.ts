import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { AcknowledgmentsSchema, AuthSessionDtoSchema, DisplayNameSchema, DraftInputSchema, DraftPreferencesSchema, ErrorEnvelopeSchema, GenerationInputSchema, GenerationRequestSchema, GoogleSignInRequestSchema, JobDtoSchema, LIMITS, NewPasswordSchema, PasswordChangeRequestSchema, PreferencesSchema, SignInRequestSchema, SignUpRequestSchema, SoftwareTextSchema, UserDtoSchema, makeValidationError } from "../shared/contracts/index.js";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const source = (n: number, role: "image" | "logo" | "recording" = "image") => ({ assetId: id(n), role });
const common = { title: "Example video", brief: "", intendedUse: "personal-learning", sources: [] };
const education = { ...common, mode: "education", topic: "How solar panels work", audience: "beginner" };
const software = { ...common, mode: "software", softwareName: "Task planner", brief: "Plans team tasks", sources: [source(1)] };
const branding = { ...common, mode: "branding", productName: "Desk lamp", sources: [source(1)] };
const preferences = { targetSeconds: 60, orientation: "landscape", voiceProfileId: "gemini-kore" };
const acknowledgments = { sourceRights: true, externalAiProcessing: true, policyVersion: "v1" };

test("complete schemas accept all three modes and keep product description optional", () => {
  for (const value of [education, software, branding]) assert.equal(GenerationInputSchema.safeParse(value).success,true);
  const { brief: _brief, ...noDescription } = branding;
  assert.equal(GenerationInputSchema.parse(noDescription).brief, "");
});
test("incomplete drafts preserve blank content, while generation requires actual input and sources", () => {
  for (const mode of ["education","software","branding"]) assert.equal(DraftInputSchema.safeParse({mode}).success,true);
  assert.deepEqual(DraftInputSchema.parse({mode:"education",title:"",topic:"   ",referenceNotes:"  notes\n"}),{mode:"education",title:"",topic:"   ",referenceNotes:"  notes\n"});
  for (const value of [{...education,topic:"  "},{...education,title:""},{...education,intendedUse:undefined},{...software,brief:"  "},{...software,sources:[]},{...branding,sources:[source(2,"logo")]}]) assert.equal(GenerationInputSchema.safeParse(value).success,false);
  assert.equal(DraftInputSchema.safeParse({...software,softwareName:"",sources:[]}).success,true);
});
test("mode isolation and strict objects reject privilege fields, nulls and media paths", () => {
  for (const value of [{...education,softwareName:"app"},{...software,topic:"topic"},{...branding,referenceNotes:"notes"},{...education,ownerId:id(1)},{...education,sources:null},{...education,topic:null},{...software,sources:[{...source(1),objectKey:"private/key"}]},{...software,sources:[{...source(1),url:"https://example.test/file"}]}]) assert.equal(GenerationInputSchema.safeParse(value).success,false);
  assert.equal(DraftInputSchema.safeParse({mode:"education",productName:"product"}).success,false);
  assert.equal(DraftInputSchema.safeParse({mode:"software",intendedUse:""}).success,false);
});
test("source validation rejects duplicate IDs, wrong modes, count overflow and logo-only products", () => {
  for (const value of [{...software,sources:[source(1),source(1,"recording")]},{...education,sources:[source(1)]},{...software,sources:[source(1,"logo")]},{...branding,sources:[source(1,"recording")]},{...software,sources:Array.from({length:9},(_,i)=>source(i+1))},{...software,sources:[source(1,"recording"),source(2,"recording")]}]) assert.equal(GenerationInputSchema.safeParse(value).success,false);
  assert.equal(GenerationInputSchema.safeParse({...software,sources:[...Array.from({length:8},(_,i)=>source(i+1)),source(9,"recording")]}).success,true);
  assert.equal(DraftInputSchema.safeParse({mode:"branding",sources:[source(1,"recording")]}).success,false);
});
test("shared budgets apply to incomplete drafts and complete generation without dropping text", () => {
  const value={brief:"x".repeat(3999),featureHighlights:"ab"};
  assert.equal(SoftwareTextSchema.safeParse(value).success,false);
  for(const schema of [DraftInputSchema,GenerationInputSchema]) assert.equal(schema.safeParse({...software,...value}).success,false);
  assert.equal(SoftwareTextSchema.safeParse({brief:"x".repeat(3999),featureHighlights:"a"}).success,true);
  assert.equal(GenerationInputSchema.safeParse({...branding,brief:"x".repeat(3999),benefits:["ab"]}).success,false);
  assert.equal(GenerationInputSchema.safeParse({...education,referenceNotes:"x".repeat(10000)}).success,true);
  assert.equal(GenerationInputSchema.safeParse({...education,referenceNotes:"x".repeat(10001)}).success,false);
});
test("individual text and array limits reject overflow while keeping unmodified accepted notes", () => {
  for(const value of [{...software,softwareName:"x".repeat(121)},{...education,topic:"x".repeat(301)},{...education,learningObjective:"x".repeat(501)},{...branding,benefits:Array(9).fill("feature")},{...branding,benefits:["x".repeat(201)]},{...branding,brandColors:["red"]},{...branding,brandColors:Array(5).fill("#123456")},{...branding,callToAction:"x".repeat(161)}]) assert.equal(GenerationInputSchema.safeParse(value).success,false);
  assert.equal(GenerationInputSchema.parse({...education,referenceNotes:" \n source notes "}).mode,"education");
});
test("names preserve international characters and punctuation and count Unicode code points", () => {
  assert.equal(DisplayNameSchema.parse("  李 O’Connor-Silva  "),"李 O’Connor-Silva");
  assert.equal(DisplayNameSchema.safeParse(" ").success,false);
  assert.equal(DisplayNameSchema.safeParse("𠮷".repeat(80)).success,true);
  assert.equal(DisplayNameSchema.safeParse("𠮷".repeat(81)).success,false);
});
test("preferences reject unsupported/coerced durations and arbitrary fields; partial drafts remain valid", () => {
  for(const targetSeconds of [30,61,91,"60",null]) assert.equal(PreferencesSchema.safeParse({...preferences,targetSeconds}).success,false);
  assert.equal(PreferencesSchema.safeParse({...preferences,orientation:"square"}).success,false);
  assert.equal(PreferencesSchema.safeParse({...preferences,providerKey:"secret"}).success,false);
  assert.equal(DraftPreferencesSchema.safeParse({orientation:"portrait"}).success,true);
  for(const targetSeconds of [60,75,90]) assert.equal(PreferencesSchema.safeParse({...preferences,targetSeconds}).success,true);
});
test("generation requires exact acknowledgments/current policy and accepts no resubmitted input", () => {
  const request={draftVersion:1,preferences,acknowledgments};
  assert.equal(GenerationRequestSchema.safeParse(request).success,true);
  for(const override of [{sourceRights:false},{externalAiProcessing:"true"},{policyVersion:"old"},{sourceRights:undefined}]) assert.equal(AcknowledgmentsSchema.safeParse({...acknowledgments,...override}).success,false);
  for(const override of [{draftVersion:0},{draftVersion:1.5},{draftVersion:Number.MAX_SAFE_INTEGER+1},{input:education},{ownerId:id(1)}]) assert.equal(GenerationRequestSchema.safeParse({...request,...override}).success,false);
});
test("auth requests preserve passwords exactly, reject client roles and require display names", () => {
  const value={email:"alex@example.com",password:"  long password  ",displayName:"  Alex  "};
  assert.equal(SignUpRequestSchema.parse(value).password,value.password);
  assert.equal(SignUpRequestSchema.parse(value).displayName,"Alex");
  for(const override of [{role:"operator"},{email:"alex@"},{displayName:" "},{password:"short"},{password:"x".repeat(129)}]) assert.equal(SignUpRequestSchema.safeParse({...value,...override}).success,false);
  assert.equal(NewPasswordSchema.safeParse("x".repeat(12)).success,true);
  assert.equal(SignInRequestSchema.parse({email:value.email,password:" a "}).password," a ");
  assert.equal(PasswordChangeRequestSchema.parse({currentPassword:" old ",newPassword:value.password}).currentPassword," old ");
});
test("Google return paths exclude external URLs, protocol-relative redirects and query replay", () => {
  for(const nextPath of ["https://evil.test","//evil.test","/\\evil.test","/settings?token=secret","/projects/------------------------------------","/dashboard\n"]) assert.equal(GoogleSignInRequestSchema.safeParse({nextPath}).success,false);
  for(const nextPath of ["/dashboard","/settings","/projects/new",`/projects/${id(1)}`]) assert.equal(GoogleSignInRequestSchema.safeParse({nextPath}).success,true);
});
const user={id:id(1),displayName:"Alex",email:"alex@example.com",role:"tester",authMethods:["google"],emailOwnership:"provider_verified"};
test("safe auth responses exclude tokens, provider identities and duplicate auth methods", () => {
  assert.equal(AuthSessionDtoSchema.safeParse({user}).success,true);
  for(const value of [{...user,accessToken:"secret"},{...user,passwordHash:"secret"},{...user,identities:[]},{...user,authMethods:["google","google"]}]) assert.equal(UserDtoSchema.safeParse(value).success,false);
  assert.equal(AuthSessionDtoSchema.safeParse({user,refreshToken:"secret"}).success,false);
});
const job={id:id(1),projectId:id(2),revisionId:id(3),kind:"generation",status:"waiting_worker",stage:"understand",progress:{completedScenes:0,totalScenes:null,activeMs:"900719925474099312345"},lastEventSequence:"900719925474099312345",createdAt:"2026-10-26T01:00:00Z",startedAt:null,finishedAt:null,retryAt:null,error:null,canCancel:true,canRetry:false};
test("safe jobs preserve decimal precision, allow unknown totals and reject server-private data", () => {
  assert.equal(JobDtoSchema.parse(job).progress.activeMs,job.progress.activeMs);
  for(const override of [{workerToken:"secret"},{providerResponse:{secret:"value"}},{stage:"approve_script"},{lastEventSequence:123},{lastEventSequence:"01"},{progress:{...job.progress,totalScenes:1,completedScenes:2}},{error:{code:"FAILED",message:"Safe message",retryable:false,action:"none",stack:"private"}}]) assert.equal(JobDtoSchema.safeParse({...job,...override}).success,false);
});
test("job timestamp ordering uses time rather than lexical fractional formatting", () => {
  assert.equal(JobDtoSchema.safeParse({...job,status:"running",startedAt:"2026-10-26T01:00:00.500Z"}).success,true);
  assert.equal(JobDtoSchema.safeParse({...job,startedAt:"2026-10-25T01:00:00Z"}).success,false);
});
test("validation error envelopes never echo submitted secrets or attacker property names", () => {
  const result=SignUpRequestSchema.safeParse({email:"sensitive-invalid-email",password:"secret",displayName:"",PRIVATE_SECRET_NAME:"private-content"});
  assert.equal(result.success,false);
  if(result.success) return;
  const dto=makeValidationError(result.error,"req_test");
  for(const secret of ["sensitive-invalid-email","PRIVATE_SECRET_NAME","private-content","secret"]) assert.equal(JSON.stringify(dto).includes(secret),false);
  assert.equal(ErrorEnvelopeSchema.safeParse({...dto,error:{...dto.error,details:{stack:"secret"}}}).success,false);
  assert.equal(ErrorEnvelopeSchema.safeParse({error:{...dto.error,code:"ACTIVE_JOB_EXISTS",details:{jobId:id(1)}}}).success,true);
  assert.equal(ErrorEnvelopeSchema.safeParse({error:{...dto.error,code:"ACTIVE_JOB_EXISTS",details:{jobId:id(1),ownerId:id(2)}}}).success,false);
});
test("input JSON schemas are generated without accepting extra properties", () => {
  const schema=z.toJSONSchema(SignUpRequestSchema,{io:"input"});
  assert.equal(schema.additionalProperties,false);
  assert.equal(LIMITS.uploadBytes,60000000);
});
