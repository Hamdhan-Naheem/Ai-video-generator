> Authentication revision approved on 24 October 2026: public email/password registration and Google sign-in; no invitations, SMTP, verification emails or password-reset emails in V1. Other product requirements remain unchanged.

# AI Video Studio — API design

**Version:** 1.3 · **Date:** 7 November 2026
**Status:** Contract baseline with local implementation slices through W-24D; not deployed. Supabase Storage is retained; hosted verification is pending and R2 adaptations are deferred.
**Authority:** [PRD](PRD.md), approved [system architecture](SYSTEM-ARCHITECTURE.md).  
**Companion:** [Database design](DATABASE-DESIGN.md), including exact ownership, transitions, transactions and indexes.

> **Storage decision — 7 November 2026:** The user selected private Supabase Storage for the first Education release, alongside Supabase Auth and PostgreSQL. This supersedes the 6 November R2 target. R-02 is Deferred for showcase, not Complete; no R2 integration is required for this release. Existing local Storage integration is retained, while hosted setup and release verification remain unfinished. The [project tracker](PROJECT-TRACKER.md) records the current implementation order.

### Supabase Storage first-release contract amendment

- Keep the existing user/worker endpoint boundaries, strict schemas, Supabase sessions, exact Origin/CSRF rules, ownership, disabled-mode admission, quotas, immutable snapshots and fenced worker operations. No new R2 route or credentials are needed for this release.
- Retain the locally implemented Supabase private upload/TUS/receipt protocols. Allocate exact paths after reservation, transfer bytes directly to Storage, and verify actual allocation metadata before accepting receipt. Preserve native media verification before publishing results. No media-byte proxy through Vercel API requests.
- Supabase JWT/RLS policies and scoped grants authorize exact files; privileged credentials stay server-side. Reauthorize active ownership, tombstones and expiry before issuing or renewing private reads, capped at 60 seconds and remaining result lifetime. Do not cache or persist signed URLs as permanent identities.
- DELETE /projects/:id/draft remains the implemented W-24D contract: strict expectedDraftVersion, owner/state checks, 409 stale/active-job conflicts, idempotent 202 pending-cleanup acknowledgment, safe retry and preserved immutable results/shared sources. Physical cleanup is distinct from removal from the list; current bounded source cleanup/retry bookkeeping stays in place.
- General expired-result cleanup, cancellation/recovery and hosted access/transfer verification remain release tasks; a storage-provider decision does not complete them. Check per-file upload ceilings and monthly cached/uncached egress in hosted acceptance while preserving application budgets.
- Education is the only enabled generation mode; other forms can prepare drafts but generation stays disabled in UI and API. Coming soon messaging is implemented locally; no next-release date is promised.

The 6 November R2 proposal is superseded. Existing local API evidence is retained in the implementation slices; no runtime endpoint, generated schema or database migration changed in this decision revision. See [release plan](EDUCATION-RELEASE.md) for the current sequence.

## 1. Purpose and API boundaries

The browser asks the application API to save drafts, upload sources, start jobs and retrieve results. The local Node.js worker asks a separate worker API for assignments, reports progress and submits verified artifacts. The API stores durable state in PostgreSQL; media moves directly to private Storage. It does not run Gemini, transcription or rendering inside a web request.

This document specifies authentication, authorization, validation, request/response shapes, status/error behavior and retry rules. Reusable DTO definitions below are the schemas referenced by endpoint tables; together they define contracts without repeating every field for each route. Implement strict Zod schemas and generate an OpenAPI description during implementation/reconciliation. The examples are illustrative, not live responses.

### 1.1 Routes and callers

| Surface | Base path | Caller / credential |
|---|---|---|
| User API | `/api/v1` | Browser with verified Supabase session cookies |
| Auth adapters | `/api/v1/auth` | Browser; credentials forwarded only to Supabase Auth |
| Operator API | `/api/v1/operator` | Verified active operator session; audit required |
| Worker API | `/api/worker/v1` | Dedicated revocable worker bearer token |
| Storage | Supabase HTTPS origin | User upload JWT or server-issued exact-object capability |

The local worker uses outbound HTTPS only. No public port on the computer. Browser and worker credentials are not interchangeable. Provider keys stay on the worker; privileged Supabase keys stay server-side. No provider key, service key, worker token or paid-tier selector appears in user DTOs.

## 2. Common protocol and conventions

- HTTPS in hosted environments; JSON UTF-8 for control messages. `Content-Type: application/json` required for JSON mutations; reject unknown fields and duplicate/ambiguous parameter encodings.
- UUID strings for entity IDs. Dates are ISO 8601 UTC strings. Counts within bounded ranges are JSON numbers; byte amounts, sequence numbers, lease tokens and bigint durations are decimal strings to avoid JavaScript precision loss.
- Success body `{ "data": ... }`; lists add `page: {nextCursor: string|null}`. `204` has no body. Error body is specified below. Responses include `X-Request-Id` generated or validated server-side.
- `Cache-Control: private, no-store` for auth/private data and signed URLs. No shared CDN caching of authenticated SSR or Set-Cookie responses.
- User body ceiling 64 KiB; worker checkpoint/completion body 256 KiB. Larger manifests are private uploaded artifacts referenced by ID/hash. Multipart media uploads through Next.js are rejected.
- Whitelist origin for browser mutations, require `X-CSRF-Token` bound to the session and verify it plus Origin. SameSite cookies are additional protection. Login/signup/OAuth initiation also use origin checks and a pre-auth CSRF nonce. Never reflect arbitrary credentialed CORS origins.
- Default list limit 20, maximum 100. Cursor encodes last sort tuple/filter version and is authenticated/validated, not SQL text. Each page independently authorizes ownership. GET is safe and does not trigger rendering, TTS or paid work.
- Unknown/foreign resource IDs return the same 404. An owned expired media asset returns 410. No owner_id, role, object key, lease or state from a user request is accepted as authority.
- `Idempotency-Key`: random UUID or 16–128 safe ASCII characters, required for job/revision/export/upload allocation/account-deletion creation. Scope by actor + operation + path. Replay same canonical body returns the original resource with `Idempotent-Replayed: true`; different body yields 409. Reauthorize before replay and never replay expired signed links or deleted data.
- Draft/settings updates carry expected version. Optimistic conflict returns 409 and current version, not an automatic overwrite. Full draft replacements are easier to validate than arbitrary JSON Patch.

### 2.1 Stable error envelope

```json
{
  "error": {
    "code": "ACTIVE_JOB_EXISTS",
    "message": "Finish or cancel your current job before starting another.",
    "retryable": false,
    "requestId": "req-example",
    "retryAt": null,
    "fieldErrors": [],
    "details": { "jobId": "00000000-0000-4000-8000-000000000001" }
  }
}
```

`details` is an allowlisted DTO per code, never raw provider output, SQL, stack trace, prompt, token or URL. `fieldErrors` entries are `{path,code,message}`. Omit sensitive details on foreign resources. `retryable` means the operation may succeed without changing content after its stated condition; it does not authorize uncontrolled automatic retries.

| HTTP | Codes / meaning |
|---|---|
| 400 | INVALID_JSON, INVALID_QUERY, INVALID_CURSOR |
| 401 | AUTH_REQUIRED, SESSION_EXPIRED, INVALID_CREDENTIALS, WORKER_UNAUTHORIZED |
| 403 | ACCOUNT_DISABLED, OPERATOR_REQUIRED, CSRF_REJECTED, REAUTH_REQUIRED |
| 404 | NOT_FOUND for absent/foreign resource |
| 409 | DRAFT_VERSION_CONFLICT, IDEMPOTENCY_CONFLICT, ACTIVE_JOB_EXISTS, STATE_CONFLICT, LEASE_LOST, BUDGET_EXHAUSTED, OUTPUT_LIMIT, GENERATION_PAUSED |
| 410 | MEDIA_EXPIRED, INPUTS_EXPIRED, ACTION_GRANT_EXPIRED |
| 413 | BODY_TOO_LARGE, UPLOAD_TOO_LARGE |
| 415 | UNSUPPORTED_MEDIA_TYPE |
| 422 | VALIDATION_FAILED, INVALID_MEDIA, INSUFFICIENT_SOURCE, UNSUPPORTED_TOPIC, MANIFEST_INVALID |
| 429 | RATE_LIMITED, PROVIDER_QUOTA; Retry-After only when supported by known timing |
| 503 | SERVICE_UNAVAILABLE, STORAGE_UNAVAILABLE, OAUTH_UNAVAILABLE, WORKER_VERSION_UNSUPPORTED |
| 507 | STORAGE_CAPACITY when configured application byte reservation cannot be satisfied |

An asynchronous provider/render failure is a job state returned by a successful GET, not HTTP 500 on every poll. A stopped provider configured incorrectly is `failed` with an actionable safe job error; it is not bypassed through another provider.

### 2.2 Rate/size policy

Initial tunable limits from architecture: 10 generation/revision requests/user/hour, 30 upload allocations/user/hour, 30 failed login/signup attempts/IP/hour; add 120 job polls/user/minute and 60 worker heartbeats/minute. Idempotent replay does not allocate new jobs, but still counts toward HTTP abuse limits. Enforce atomically in database, with provider-wide usage ceilings separately. Return a 429 with a real reset when known. No app code upgrades billing.

## 3. Authentication and authorization

### 3.1 Session strategy

Use Supabase Auth via its supported SSR integration. Server validates token claims/signature (`getClaims`) and checks current active profile; obtain fresh identity information for security-sensitive operations; do not require local email confirmation. Do not trust the user object from an unvalidated cookie/session. Supabase manages password hashes, OAuth identities and token refresh; application tables never store them. [Supabase SSR guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

Auth adapters below are our HTTP interface over the SDK, not replacements for Supabase's Auth protocol. Cookie options follow SDK/browser requirements with Secure in production and appropriate SameSite settings; do not falsely assume all SSR session cookies can be HttpOnly when the browser SDK needs them for direct Storage upload. Prevent XSS with escaped text, CSP and no model-generated HTML. Response token material is never logged. Selected Supabase Storage requests use the supported SDK/session and exact allocation policies or scoped transfer grants as implemented. Do not copy tokens into project metadata. R2 is deferred and receives no Supabase tokens.

On session refresh failure clear stale cookies and return AUTH_REQUIRED. Refresh/signout does not stop an already queued generation. Disabled/deleting profiles are denied even if the Auth JWT has not expired. Account roles come from protected DB records, not client-editable user metadata. Operator actions are separately authorized; operator role does not imply arbitrary tester media downloads.

### 3.2 Auth endpoints

All paths below are under /api/v1/auth except the web callback. Public signup requires no invitation. No SMTP or email-delivery adapter is configured for V1.

| Method/path | Request | Success | Failures / rules |
|---|---|---|---|
| GET /csrf | None | 200 {csrfToken,expiresAt} plus nonce cookie | no-store, origin-bound |
| POST /sign-up | {email,password,displayName} | 201 {user:UserDto,nextPath:"/dashboard"} plus session cookies | Create local email/password account without confirmation email; rate limit, generic failure if signup cannot complete |
| POST /sign-in | {email,password} | 200 {user:UserDto,nextPath:"/dashboard"} plus cookies | Generic INVALID_CREDENTIALS; no email-verified gate |
| POST /google | {nextPath?:string} | 200 {authorizationUrl} | Start Google through Supabase PKCE; nextPath is allowlisted internal path; CSRF protected |
| GET /session | Session cookies | 200 {user:UserDto} | 401 if invalid/expired |
| POST /refresh | Session cookies | 200 {authenticated:true}, updated cookies | 401 if refresh fails |
| POST /sign-out | {scope:"local"} | 204, clear cookies | Jobs continue; no token in response |
| POST /reauthenticate | {method:"password",password,action:"delete_account"} | 200 {actionToken,expiresAt} | Recheck password of the same user; five-minute, one-use grant |
| POST /reauthenticate | {method:"google",action:"delete_account"} | 200 {authorizationUrl,reauthAttemptId} | Fresh provider reauthentication bound to current user/session; never issue grant merely for initiating OAuth |
| POST /password-change | {currentPassword,newPassword} with active local-password session | 204 | Reverify current password, then update via Auth; no email/reset token; no password creation for Google-only users |

GET /auth/callback is the web OAuth callback outside the API base. Exchange a one-use authorization code through the supported SDK/PKCE flow, validate browser-bound state and exact redirect allowlist, then establish session and 303 redirect to the intended internal page. Replayed/expired code, missing verifier, consent denial and provider mismatch yield a safe sign-in error; do not log codes or raw tokens. Google client secret remains in the provider's server configuration, not the browser. Request only identity scopes needed for login (openid/email/profile); no Gmail/Drive permissions.

For Google reauthentication, the callback must demonstrate a fresh authentication to the same existing Google identity/app user, not just an account-choice screen or cached session refresh. Bind attempt to the initiating user/session/action, expire in five minutes, consume once, and issue the action grant only after that proof. Preserve the initiating session on failed/cross-account reauthentication. Provider/SDK support for fresh proof is an implementation verification gate; if unavailable, do not weaken the check or pretend email recovery exists. A completed reauth returns to a same-origin page; retrieve the grant through POST /reauthenticate/result {reauthAttemptId}, not a URL query token. Result retrieval is one-use and session-bound, returning {actionToken,expiresAt}.

Password boundary: 12–128 characters, preserve passwords exactly; verify supported provider policy before implementation. Display name 1–80, email maximum 254. Signup uses Confirm Email disabled per the explicit user decision. Email strings are self-declared for local signup even if Supabase internally labels them confirmed. User profile roles are assigned server-side. Forgotten-password recovery, resend-confirmation, invitation check, password-reset, recovery-token password-update and /auth/confirm routes are removed, not left as nonfunctional UI buttons. There is no SMTP replacement via another email API.

### 3.3 Identity ownership and public access

Supabase may automatically link identities sharing an email. Disabling Confirm Email implicitly confirms local email accounts in Supabase; that is not evidence of mailbox ownership. Never implement application account merging, ownership transfers or password reset based only on matching email text. Test email-first, Google-first, pre-registered victim email, existing password credentials and active sessions before enabling both methods publicly. If provider automatic-linking behavior cannot safely handle these combinations, resolve the identity isolation/linking configuration before release; a UI-only check is insufficient. Manual link/unlink and adding a password to Google-only accounts are not V1 features. Google sign-in must never be advertised as guaranteed recovery for an unrelated email/password account. [Supabase identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking), [confirmation configuration](https://supabase.com/docs/guides/auth/general-configuration).

UserDto.emailOwnership is unknown for email/password unless verified provider evidence actually supports that address; it is not copied from Supabase email_confirmed_at. Authentication authorizes access to the app user ID, not proof of the typed mailbox. No email-edit endpoint is exposed in V1. Account-linking tests must cover direct Supabase calls too, not only this API; manual linking is disabled until explicitly designed.

Keep public landing/sample browsing, but require an authenticated active profile for private projects and generation. Retain central signup/login throttles, provider-supported abuse controls and global generation/provider/storage caps. Multiple new accounts must not bypass the global cap. Unauthenticated direct Auth signup may be permitted by the chosen public policy; it must still produce a normal user role and be protected by provider signup controls.

Email-only users who lose their password have no automatic recovery in V1. State this at registration and on the sign-in help screen. Google recovers Google credentials; it does not promise access to a separately created application account. No recovery email is sent.

### 3.4 Google configuration checklist

Configure the Google OAuth web client, Supabase callback and exact Vercel production return URL; use explicit localhost development callback entries separately. Do not use a purchased domain as a prerequisite. Configure external/public audience and publish the consent configuration as needed for general users; a testing-mode allowlist is not public registration. Validate allowed basic scopes, cancellation, refresh, provider outage and cross-account behavior. [Supabase Google sign-in](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).


## 4. Reusable domain DTOs and validation

Notation below is TypeScript-shaped contract documentation. Every required property must exist, `?` is optional, explicit null is only allowed where declared; enums are closed. Reject unknown fields. All user content is plain text.

```ts
type UUID = string;
type IsoTime = string;
type DecimalString = string;
type Mode = 'education' | 'software' | 'branding';
type Orientation = 'landscape' | 'portrait';
type Stage = 'understand' | 'story' | 'voice' | 'render';
type JobStatus = 'queued' | 'waiting_worker' | 'running' | 'waiting_quota'
  | 'needs_input' | 'cancel_requested' | 'cancelled' | 'failed' | 'succeeded';

interface UserDto {
  id: UUID; displayName: string; email: string; role: 'tester' | 'operator';
  authMethods: Array<'password' | 'google'>;
  emailOwnership: 'unknown' | 'provider_verified';
}
interface Preferences {
  targetSeconds: 60 | 75 | 90;
  orientation: Orientation;
  voiceProfileId: string; // enabled server catalog ID, not arbitrary provider model
}
interface SourceSelection { assetId: UUID; role: 'image' | 'recording' | 'logo' }
interface CommonInput {
  title: string; // 1–120
  brief: string; // 0–4000, software requires nonempty
  sources: SourceSelection[];
  intendedUse: 'personal-learning' | 'promotional';
}
type GenerationInput =
  | (CommonInput & {mode:'education'; topic:string;
      audience:'beginner'|'school'|'adult'; learningObjective?:string;
      referenceNotes?:string})
  | (CommonInput & {mode:'software'; softwareName:string; featureHighlights?:string})
  | (CommonInput & {mode:'branding'; productName:string;
      benefits?:string[]; brandDetails?:string; brandColors?:string[]; callToAction?:string;
      intendedAudience?:string});

interface JobDto {
  id: UUID; projectId: UUID; revisionId: UUID;
  kind:'generation'|'caption_export'; status: JobStatus; stage: Stage;
  progress:{completedScenes:number; totalScenes:number|null; activeMs:DecimalString};
  lastEventSequence: DecimalString;
  createdAt:IsoTime; startedAt:IsoTime|null; finishedAt:IsoTime|null;
  retryAt:IsoTime|null; error:SafeJobError|null;
  canCancel:boolean; canRetry:boolean;
}
interface SafeJobError {
  code:string; message:string; retryable:boolean;
  action:'retry'|'wait'|'edit_input'|'reupload'|'contact_operator'|'none';
}
interface QueuedResult {
  jobId:UUID; revisionId:UUID; status:JobStatus; stage:Stage;
  statusUrl:string; reused:boolean;
}
interface AssetDto {
  id:UUID; kind:string; state:string; filename:string|null;
  byteSize:DecimalString|null; mime:string|null;
  width:number|null; height:number|null; durationMs:DecimalString|null;
  expiresAt:IsoTime|null; validationError:SafeJobError|null;
}
interface ExportDto {
  id:UUID; variant:'clean'|'burned'; state:'pending'|'rendering'|'ready'|'failed'|'expired';
  videoAssetId:UUID|null; thumbnailAssetId:UUID|null;
  vttAssetId:UUID|null; srtAssetId:UUID|null;
  expiresAt:IsoTime|null; jobId:UUID;
}
interface RevisionDto {
  id:UUID; projectId:UUID; number:number; parentRevisionId:UUID|null;
  status:'pending'|'processing'|'needs_input'|'failed'|'cancelled'|'ready'|'expired';
  preferences:Preferences; exports:ExportDto[];
  completedAt:IsoTime|null; expiresAt:IsoTime|null;
  providerSummary:{narrationProvider:string|null; voiceLabel:string|null;
    attributionText:string|null; useRestrictions:string[]};
}
interface ProjectDto {
  id:UUID; title:string; mode:Mode; draftVersion:number;
  draftInput:Partial<GenerationInput>; preferences:Preferences;
  draftState:'active'|'removed'; sources:AssetDto[]; currentJob:JobDto|null;
  latestReadyRevision:RevisionDto|null; createdAt:IsoTime; updatedAt:IsoTime;
}
```

DTO `Partial` is descriptive, not a permissive union implementation: draft schema still rejects fields incompatible with its selected mode and validates present fields. Incomplete drafts can save; Generate uses complete discriminated schema. Title/name/topic 1–120/120/300 characters; learningObjective 0–500; notes ≤10,000; benefits ≤8 entries of ≤200; colors ≤4 valid hex colors; CTA ≤160; intendedAudience ≤200. Supplemental factual fields plus brief share a 4,000-character brief budget (notes separate). Whitespace-only required text is invalid. No remote URL input, repository ingestion or automatic third-party login.

Education uses topic/audience and pasted references, not required images; any uploaded asset selection is rejected initially for this mode. Software requires name, feature description and >=1 screenshot or recording; branding requires name and >=1 product image excluding logo. Up to eight images including logo, each ≤5,000,000 bytes; one software recording ≤45,000,000 bytes/120 seconds; total ≤60,000,000 bytes. JPEG/PNG/WebP; recording MP4/H.264 with optional AAC; mute recording audio. Allowed duration is 60/75/90 only. No cinematic/music/teacher preference fields: teacher is automatic in education only.

Receipt validation precedes enqueue; safe decode and source quality checks happen on worker before AI. Requires acknowledgment of source rights and provider processing at Generate. `intendedUse` gates eligible fallback usage; it is not a legal guarantee of licensing suitability.

## 5. Browser endpoint contracts

Paths below are under `/api/v1`; **U** means authenticated active user and owner authorization. Empty mutation body is `{}`. Every endpoint applies common errors and additionally those listed. Read/list endpoints return safe DTOs only, no raw plan/provider/debug data.

### 5.1 Catalog and settings

| Method/path | Auth / request | Response / effects |
|---|---|---|
| GET `/capabilities` | U, no body | 200 `{modes,durations:[60,75,90],orientations,uploadLimits,educationCapabilities,limitsVersion}`; enabled modes reflect actual readiness, not claim all tested |
| GET `/voices` | U | 200 `{items:[{id,label,language,description,previewUrl,available}],nextCursor:null}`; cached auditioned preview, no on-demand synthesis; unverified regional accent not advertised |
| GET `/availability` | U | 200 `{worker:{online,lastSeenAt},generationPaused,providers:[{name,state,retryAt}],message}`; no token/balance guess |
| GET `/me/settings` | U | 200 `{displayName,email,authMethods,defaults:Preferences,settingsVersion,usage:{retainedOutputs,reservedOutputs,maxOutputs,usedBytes,reservedBytes,byteLimit}}` |
| PATCH `/me/settings` | U, `{expectedVersion,displayName?,defaults?}` | 200 updated settings; 409 stale version; never permits role/limits/owner changes |

Voice preview URLs refer only to explicitly public cached samples, not tester media. Public landing examples use separately authorized static assets; no automatic promotion of a private result to a public gallery.

### 5.2 Project and library endpoints

| Method/path | Request | Success / rules |
|---|---|---|
| POST `/projects` | U; `{mode,title,draftInput?,preferences?}` | 201 ProjectDto. Mode-specific draft validation, default preferences from catalog; optional Idempotency-Key recommended |
| GET `/projects` | U; `cursor?,limit?,mode?,state?` | 200 `{data:ProjectSummary[],page}` sorted updatedAt DESC,id DESC; summary omits full source text |
| GET `/projects/:id` | U | 200 ProjectDto; revisions paginated separately |
| PATCH `/projects/:id` | U; `{expectedDraftVersion,title?,draftInput?,preferences?}` | 200 ProjectDto with incremented version; full replacement for supplied input/preferences; no mutation of frozen revisions |
| GET `/projects/:id/revisions` | U; cursor/limit | 200 paginated RevisionDto descending number |
| GET `/revisions/:id` | U | 200 RevisionDto with job/result links; owned expired metadata remains visible |
| GET `/videos` | U; cursor/limit, `mode?,state=ready\|expired?` | 200 paginated VideoSummary for owned completed outputs, newest completedAt,id first; no duplicate card for burned variant |
| DELETE `/projects/:id/draft` | U; `{expectedDraftVersion}` | 202 cleanup DTO; remove mutable draft only, preserve frozen revisions/shared sources; 409 stale draft or active project job |
| DELETE `/projects/:id` | U; `{}` | 202 `{deleted:true,cleanupState:"pending"}`; immediate tombstone/cancel; repeated owned deletion returns same safe result |
| DELETE `/revisions/:id` | U; `{}` | 202 same deletion DTO; retain shared source and other versions; recompute latest Ready pointer |

`ProjectSummary` is `{id,title,mode,draftState,draftVersion,updatedAt,currentJob:{id,status,stage}|null,latestReadyRevisionId:null|UUID}`. A project with no valid result still has useful draft/history. List state filters derive from latest activity; they do not overwrite job state. Deleting an output does not automatically delete the whole project.

### 5.3 Source upload contracts

**POST `/projects/:id/uploads`** — U + Idempotency-Key.

```json
{
  "expectedDraftVersion": 1,
  "filename": "dashboard.png",
  "mimeType": "image/png",
  "byteSize": "2400000",
  "role": "image"
}
```

Returns 201 `{data:{uploadId,assetId,bucket,objectKey,protocol:"standard"|"tus",uploadEndpoint,expiresAt,draftVersion}}`. The allocation transaction reserves bytes/count and increments draft version. Endpoint/key are server allocated; browser may not choose another path or overwrite. Browser authenticates direct Storage upload with its own SDK session. No Next.js file proxy. Use TUS for recordings and optional network-resume support. [Supabase resumable upload](https://supabase.com/docs/guides/storage/uploads/resumable-uploads).

**POST `/uploads/:id/complete`** — U, `{}`. Server checks exact stored object existence/size/metadata against allocation. Returns 200 `{data:{asset:AssetDto,draftVersion}}`, state=received; replays return same receipt. Oversize/invalid declared type rejects/removes object and returns 413/415. Do not trust browser checksum or call it decoded. Worker later changes received→validated; no TTS request is made to validate files.

**GET `/uploads/:id`** — U, no body. Returns allocation state and AssetDto to recover after refresh. Browser/native TUS resumes within valid allocation; expired allocation returns 410 and offers new allocation. **DELETE `/uploads/:id`** — U, `{}`; returns 202 cleanup DTO only if not referenced by a frozen revision; otherwise 409 ASSET_IN_USE, delete the relevant revision/project through its lifecycle instead. Partial/abandoned upload cleanup after 24 hours.

### 5.4 Start a generation

**POST `/projects/:id/generations`** — U + Idempotency-Key.

```json
{
  "draftVersion": 3,
  "preferences": {
    "targetSeconds": 60,
    "orientation": "landscape",
    "voiceProfileId": "Kore"
  },
  "acknowledgments": {
    "sourceRights": true,
    "externalAiProcessing": true,
    "policyVersion": "v1"
  }
}
```

Frozen input is derived from the current owned draft and received/validated source selections, not an arbitrary object list supplied again. Server checks current catalog/limits, storage/output capacity, active job and policy version; creates immutable revision/reservation/job/idempotency record in one transaction. Returns 202 QueuedResult and `Location: /api/v1/jobs/:id` immediately. Worker offline is accepted as waiting_worker, not HTTP failure. Corrupt bytes detected later produce needs_input before AI; incompletely uploaded sources reject enqueue with 409 UPLOAD_INCOMPLETE.

Draft changed while clicked? 409 DRAFT_VERSION_CONFLICT with currentDraftVersion. Same request replay returns same revision/job. Different key while an active job exists returns ACTIVE_JOB_EXISTS. No automatic eviction at three outputs and no automatic capacity purchase.

### 5.5 Job status, events, cancellation and retry

| Method/path | Request | Response / contract |
|---|---|---|
| GET `/jobs/:id` | U | 200 JobDto, no worker secret/raw failure |
| GET `/jobs/:id/events` | U; `afterSequence` decimal default 0, limit ≤100 | 200 `{data:EventDto[],page:{nextCursor},latestSequence,requiresResync}`; monotonic sequence, no duplicates within page |
| POST `/jobs/:id/cancel` | U; `{}` | 202 `{jobId,status:"cancel_requested"}` if running; 200 cancelled for nonrunning/replay; 409 if succeeded (delete instead) |
| POST `/jobs/:id/retry` | U + Idempotency-Key; `{}` | 202 QueuedResult for eligible failed job, same job/revision; reacquire capacity, retain call counters and checkpoints |

`EventDto={sequence,stage,code,message,createdAt,details:{completedScenes?,totalScenes?}}`. Worker health and provider status messages remain safe. If retained event history no longer covers the cursor, requiresResync=true and UI reloads JobDto. Browser polls active jobs every 5 seconds, waiting every 15, pauses while hidden and stops at terminal state. No progress percent until objectively measured.

Retry only for recoverable failed infrastructure/service/media-processing errors with retained valid inputs and remaining budget. Needs input requires edited draft/new revision. Cancelled or succeeded jobs are not retried. Known waiting_quota jobs resume by scheduler eligibility; polling or clicking Retry does not hammer provider or reset retryAt. Return 409 STATE_CONFLICT/BUDGET_EXHAUSTED or 410 INPUTS_EXPIRED with the correct action. Late cancel after succeeded cannot rewrite successful history; UI offers delete.

### 5.6 Revisions, regenerate and caption exports

**POST `/projects/:id/revisions`** — U + Idempotency-Key:

```json
{
  "parentRevisionId": "00000000-0000-4000-8000-000000000002",
  "requestKind": "revise",
  "instruction": "Explain the inverter more simply.",
  "preferences": { "targetSeconds": 60, "orientation": "landscape", "voiceProfileId": "gemini-kore" },
  "acknowledgments": { "sourceRights": true, "externalAiProcessing": true, "policyVersion": "v1" }
}
```

Required requestKind=`revise|regenerate|format`; instruction required for revise (1–4000), forbidden for format, optional for regenerate. Preferences optional except format must change orientation. Parent must be owned/nondeleted; retained usable sources required. To replace source files, edit draft and use generations instead. Returns 202 QueuedResult; creates new output slot even if old output exists. Old valid output remains until its own expiry. Format reuses compatible audio/timing, voice change invalidates all speech/timing. Regenerate creates a new revision with deliberate fresh planning; display possible API use, while unchanged original inputs can be reused. No same-job budget reset through Retry.

**POST `/revisions/:id/exports`** — U + Idempotency-Key, `{captionMode:"burned"}`. Clean Ready/nonexpired result and required retained artifacts must exist. Existing Ready burned variant returns 200 ExportDto; pending variant returns 202 its job; absent creates one export job/reservation and returns 202 `{export:ExportDto,job:QueuedResult}`. Failure retry uses job retry. No TTS/planning calls, zero extra output card, additional bytes reserved; expiry unchanged. Worker offline shows waiting. Clean video already has a download action, not another render request.

### 5.7 Media access and account deletion

**POST `/assets/:id/access`** — U, `{purpose:"preview"|"download"}`. Only published output/thumbnail/caption or validated own draft source; internal artifacts are denied. Returns 200 `{data:{url,expiresAt,mimeType,filename,byteSize}}`, life ≤60 seconds and ≤remaining asset retention. Server generates content disposition safely. Signed URL is bearer access: no-store, no analytics logging. Renewal reauthorizes. 410 on owned expired media; deleted/foreign 404. A valid old link may continue until expiry; previously downloaded bytes cannot be recalled. [Supabase private downloads](https://supabase.com/docs/guides/storage/serving/downloads).

Player uses clean MP4 with VTT; refresh video/VTT access on expiry, preserving playhead. Burning captions is a separate export and cannot be toggled off. Source asset reads additionally enforce its live draft or revision reference; `assets.available` alone is insufficient.

**POST `/me/deletion`** — U + Idempotency-Key + fresh grant, `{actionToken,confirmation:"DELETE"}`. Consume grant, mark account deleting, cancel jobs and enqueue cleanup in one transaction. Return 202 `{data:{operationId,status:"requested"}}`, sign out/clear cookies. No further user access. Operator tooling tracks cleanup if it fails; user sees a signed-out “Account deletion requested” acknowledgment, never a physical-deletion completion claim for this 202. Physical storage deletion then metadata/Auth purge runs idempotently; do not delete the Auth identity before cleanup has its required references.

## 6. Worker API — plain-language overview

A worker is the program on your computer. These endpoints coordinate it; they do not themselves call Gemini.

| Operation | Meaning |
|---|---|
| Claim | “Give me the next job I am allowed to process.” |
| Heartbeat | “I am still online; please renew my temporary assignment.” |
| Checkpoint | “This stage is complete, and here are its verified reusable artifacts.” |
| Provider attempt | “Record/reserve one external call so usage and retry limits survive a crash.” |
| Complete | “The verified files are uploaded; publish them if my assignment is still valid.” |

Assignment is a **lease**: 90 seconds, heartbeat every 20 seconds. Its increasing **leaseToken** rejects an old worker after reassignment. A heartbeat is a small application API/DB call, not an AI request. Temporary API outage does not mean the worker may continue indefinitely without a lease.

## 7. Worker API contracts

All paths below under `/api/worker/v1`. Header `Authorization: Bearer <worker-token>` and `X-Worker-Protocol: 1` required. Server derives workerId from token. Every job mutation includes `leaseToken` as decimal string; body workerId cannot impersonate another worker. Use safe request size ceilings, strict schemas and resource scope checks. User JWT rejected on this surface; worker token rejected on user routes.

### 7.1 Claim and heartbeat

**POST `/claim`**:

```json
{
  "capabilities": { "modes": ["education","software"], "orientations": ["landscape","portrait"], "compositionVersion": "1", "schemaVersions": [1] }
}
```

Returns 204 if no eligible work (or claims paused), with `Retry-After` indicating poll delay; 200:

```json
{
  "data": {
    "jobId": "00000000-0000-4000-8000-000000000001",
    "revisionId": "00000000-0000-4000-8000-000000000002",
    "kind": "generation",
    "leaseToken": "7",
    "leaseExpiresAt": "2026-10-24T10:01:30Z",
    "heartbeatIntervalSeconds": 20,
    "input": { "schemaVersion": 1, "inputAssetIds": [], "inputHash": "<sha256>", "manifest": {} },
    "budgets": { "maxExternalAttempts": 24, "usedExternalAttempts": 0, "maxRepairs": 2, "usedRepairs": 0, "maxActiveMs": "1800000", "usedActiveMs": "0" },
    "checkpoints": []
  }
}
```

Example manifest above is abbreviated; actual `manifest` is full validated GenerationInput + Preferences + frozen policy/version metadata, never `{}` for a real job. Claim includes declared input asset IDs and compatible checkpoint summaries `{id,stage,unitKey,dependencyHash,manifestAssetId?,manifest?}`. No unrestricted Storage listing/credentials. Worker obtains per-object access separately. Catalog/provider identities resolve only to locally configured eligible adapters; no remote executable path can be supplied.

**POST `/heartbeat`**, idle `{health:{freeDiskBytes,freeMemoryBytes,toolVersions}}`; active adds `{jobId,leaseToken,progress:{stage,completedScenes,totalScenes}}`. 200 `{data:{serverTime,leaseExpiresAt:null|IsoTime,cancelRequested,claimsPaused}}`. DB-derived elapsed time uses heartbeat intervals, not worker-provided lifetime budget resets. On cancel, heartbeat acknowledges control but does not reauthorize new work; worker sends cancel-ack. Invalid/expired lease returns 409 LEASE_LOST; stop and preserve local files. Health data is bounded and contains no local private path names.

Idle poll backs off 15→60 seconds with jitter; infrastructure outage up to five minutes. No global slot override in worker request. Compatible job claims are serialized in DB; accidental second worker cannot take the occupied slot. Protocol mismatch returns 503 WORKER_VERSION_UNSUPPORTED with minimum version, no data.

### 7.2 Artifact allocation and transfer

**POST `/jobs/:id/artifact-access`** accepts a discriminated request:

```ts
type ArtifactAccessRequest =
  | {leaseToken:DecimalString; action:'read'; assetId:UUID}
  | {leaseToken:DecimalString; action:'allocate_write'; clientArtifactKey:string;
      kind:string; mimeType:string; byteSize:DecimalString; checksum:string}
  | {leaseToken:DecimalString; action:'renew_write'; assetId:UUID};
```

Read permits only assigned input/checkpoint artifacts. Return 200 `{assetId,url,expiresAt,byteSize,checksum,mimeType}` with short-lived read access. Allocation validates job kind, required artifact type, per-file/global reservation and checksum shape, creates an immutable attempt path, then returns 201 `{assetId,uploadUrl,objectKey,expiresAt}`. `clientArtifactKey` 1–120 characters unique within job+lease: repeat same metadata returns same allocation, conflicting metadata returns 409. Persist this identity in assets allocation metadata/unique constraint. Renew_write requires same active lease/allocation; never permits another job's path or overwrite. Worker signed upload expiry is provider-governed and may outlive lease; DB finalization still rejects stale output.

**POST `/jobs/:id/artifacts/confirm`**: `{leaseToken,assetId,checksum,byteSize,mediaMetadata?:{mimeType,width?,height?,durationMs?}}`. Server verifies storage existence/size and scoped manifest; worker is trusted for full byte hash and decoding. Returns 200 AssetDto with validated/received state appropriate to stage. Replayed identical confirmation is safe. Missing/partial bytes 409 ARTIFACT_NOT_UPLOADED; conflicting hashes 422 MANIFEST_INVALID. A Storage ETag is not substituted for SHA-256. Source decode report also goes through this endpoint with `validation:{valid:boolean,code?,detectedMime,...}` restricted to claimed source assets; invalid source becomes rejected/needs_input before AI.

### 7.3 Provider attempts and budgeted repair

**POST `/jobs/:id/provider-attempts`**: `{leaseToken,dispatchNonce,operationKey,operationAttempt,provider,modelId,voiceId?,requestHash}`. Server checks current lease, provider policy, configured free-only eligibility and remaining job budget. Returns 201 `{attemptId,dispatchAuthorized:true}` for a newly reserved nonce. Identical replay returns 200 `{attemptId,dispatchAuthorized:false,status}`; worker must reconcile, not send the call again. An attempt cannot be dispatched merely because an HTTP retry returned its ID.

**PATCH `/jobs/:id/provider-attempts/:attemptId`**: `{leaseToken,status:"dispatched"|"succeeded"|"failed"|"outcome_unknown"|"not_sent",providerRequestId?,usage?:{inputTokens?,outputTokens?,characters?},safeErrorCode?}` → 200 `{attemptId,status}`. Fields are bounded nonnegative counts or null. Only reserved→dispatched→terminal (or reserved→not_sent/outcome_unknown) transitions; no success overwritten by generic failure. Repeated same result is idempotent. Recovered worker under a new current fence can reconcile an older same-job attempt with saved evidence; stale worker cannot mutate job state.

**POST `/jobs/:id/repairs`**: `{leaseToken,repairKey,stage,reasonCode}` → 201 `{repairId,usedRepairs,remainingRepairs}`; same key replay 200 same reservation. Persist repair identity in a `job_repairs` table described in DB addendum. Maximum two content repairs shared across all stages. Local deterministic layout repair that does not change planned content is logged as an event, not a provider-budget escape. Every AI repair call still reserves a provider attempt.

Retry classification: quota → eligible fallback or waiting_quota; transient connection/5xx → initial + at most two retries per operation within overall 24 attempts and 30-minute active budget. Honor Retry-After. Invalid credentials/model/configuration/refusal → stop, no bypass. Unknown outcome after timeout remains counted. All fallback scenes use one consistent speaker; no mixing providers mid-video.

### 7.4 Progress and checkpoints

**POST `/jobs/:id/progress`**: `{leaseToken,stage,completedScenes,totalScenes,eventKey,code}` → 200 `{sequence}`. Deduplicate eventKey per job/run; coalesce noisy progress. No arbitrary user-facing provider error text; server maps codes to safe text. Persist event deduplication key in job_events. Progress is informational; it cannot mark a stage complete.

**POST `/jobs/:id/checkpoints`**:

```json
{
  "leaseToken": "7",
  "stage": "voice",
  "unitKey": "scene-2",
  "dependencyHash": "<sha256>",
  "producerVersion": "pipeline-1",
  "artifactIds": ["00000000-0000-4000-8000-000000000003"],
  "manifest": { "schemaVersion": 1, "kind": "scene_voice" }
}
```

Manifest is a strict union by kind, with required full fields: source_inventory (facts/source IDs/regions), story_plan (plan version/scenes/evidence), scene_voice (audio ID/provider/model/voice/script hash/measured duration), alignment (timed words/hash/validation), mouth_cues (timed allowed shapes/audio hash), timeline (scene offsets/30fps/format/dependencies), render (video ID/verification). For large arrays upload a manifest asset and send `{manifestAssetId,manifestHash}` instead of inline manifest, not both. The illustration shows only the discriminator; an incomplete real manifest is rejected.

Returns 201 `{checkpointId,sequence,reused:false}` or 200 reused=true for identical identity/hash. Register DB plans/scenes/timings and artifact dependencies transactionally. Completed checkpoints require durable confirmed artifacts; local-only partial files are not reusable cloud checkpoints. Invalid refs/layouts/timing/teacher cues return 422. No model-authored executable HTML/JS is accepted.

### 7.5 Complete, fail and cancel acknowledgment

**POST `/jobs/:id/complete`**:

```ts
interface CompleteRequest {
  leaseToken:DecimalString;
  completionKey:string;
  manifestHash:string;
  timelineCheckpointId:UUID;
  exportId:UUID;
  artifactIds:UUID[];
  verification:{reportAssetId:UUID; fullDecodePassed:true;
    width:1280|720; height:720|1280; fps:30;
    durationFrames:number; measuredDurationMs:DecimalString;
    audioPresent:true; captionChecksPassed:true;
    teacherCueChecksPassed:boolean|null};
}
```

Return 200 `{data:{jobId,status:"succeeded",revision:RevisionDto}}` only after uploaded objects, report, expected orientation/target range, audio/captions and education teacher checks pass; selected timeline dependencies and storage reservation match. Clean required artifact set is complete. API validates report consistency/Storage metadata, worker performs full decode; do not pretend API independently watched video. Fail 409 on cancellation/deletion/stale fence and schedule orphan cleanup. Matching completion replay for an already succeeded, still-live job returns success even though its lease ended; mismatch is 409. Never resurrect a deleted revision on replay.

**POST `/jobs/:id/fail`**: `{leaseToken,failureKey,code,stage,retryable,disposition:"failed"|"waiting_quota"|"needs_input",retryAt?:IsoTime}` → 200 `{jobId,status,canRetry}`. Server maps approved codes to disposition and safe text rather than blindly trusting worker retryable. waiting_quota requires known future retryAt. Clear lease/global slot and account for budgets/reservations appropriately; no raw provider body. Same failureKey is idempotent. Report local disk/memory issues as recoverable infrastructure failures with preserved checkpoint.

**POST `/jobs/:id/cancel-ack`**: `{leaseToken,stopped:true}` → 200 `{jobId,status:"cancelled"}` only for matching cancelled/cancel_requested run; stale token cannot change newer work. If the worker is gone, lease reaper completes cancellation. Cleanup of already uploaded artifacts is separate.

### 7.6 Cleanup protocol

**POST `/cleanup/claim`**: `{}` → 204 none or 200 `{taskId,leaseToken,assetId?,reason}`. Server selects only authorized cleanup tasks and rechecks asset references/leases/expiry. It marks deleting to prevent new references.

**POST `/cleanup/:id/complete`**: `{leaseToken}` tells server to perform the lightweight exact-object Storage delete and verify absence. Returns 200 `{taskId,status:"done"}` or 202 `{taskId,status:"retry",retryAt}`. Worker never receives a general delete capability or Supabase service key. Already absent is success; failure does not free byte accounting. This endpoint name means complete the cleanup operation, not trust a worker's unsupported claim of deletion.

Worker triggers periodic/restart cleanup while online; API access expiry works even if none is running. Bucket-inventory reconciliation is protected operator/server work, not unrestricted worker object listing. Late uploads after expired leases remain unpublished and are picked up by repeated scans.

## 8. Operator endpoints

All `/api/v1/operator` routes require verified active operator role, CSRF for browser mutations, rate limits and audit. They reveal only required operational data. They do not browse tester screenshots/scripts by default.

| Method/path | Request | Success |
|---|---|---|
| GET `/health` | None | 200 `{workerSummary,queueCounts,storage:{usedBytes,reservedBytes,limitBytes},cleanupBacklog,providerStates,authProvidersConfigured}` |
| GET `/jobs` | cursor/status/stage | 200 sanitized job summaries; no raw input |
| POST `/jobs/:id/retry` | idempotency, `{reason}` | 202 same eligible retry behavior/budget as owner route |
| POST `/jobs/:id/cancel` | `{reason}` | 202/200 cancel state; audited |
| PATCH `/controls` | `{expectedVersion,generationPaused?,claimsPaused?}` | 200 controls/version; affects new work, not silent cancellation |
| GET `/workers` | None | 200 worker metadata/health; no credential hashes |
| POST `/workers` | `{label,protocolVersion}` | 201 `{workerId,workerToken}` once; credential provision audited |
| POST `/workers/:id/revoke` | `{}` | 200 disabled/revoked; stop future claims/calls, existing lease cannot publish |
| POST `/workers/:id/credentials` | `{expiresAt?}` | 201 new once-only token; creation requires explicit operator action, no silent renewal |
| GET `/cleanup` | cursor/state | 200 sanitized cleanup queue |
| POST `/cleanup/:id/retry` | `{}` | 202 requeued blocked cleanup after corrected issue |
| GET `/account-deletions/:id` | None | 200 status/safe reason |

Worker creation/rotation is designed here, not performed now. Operator controls cannot enable paid billing or arbitrary remote models. Limits are reviewed configuration migrations in V1, not an unrestricted spending-settings endpoint.

## 9. End-to-end sequences

### 9.1 Generate and recover

```mermaid
sequenceDiagram
  participant B as Browser
  participant A as Next.js API
  participant D as PostgreSQL
  participant W as Local worker
  participant S as Private Storage
  B->>A: Save draft / allocate uploads
  B->>S: Upload directly
  B->>A: Confirm receipt
  B->>A: Generate + idempotency key
  A->>D: Freeze revision + reserve + enqueue
  A-->>B: 202 job ID
  W->>A: Claim
  A->>D: Lease and fence
  A-->>W: Assigned input/checkpoints
  W->>A: Heartbeats and provider attempt reservations
  W->>S: Download inputs / upload artifacts
  W->>A: Register validated checkpoints
  Note over W,A: If worker stops, lease expires; next claim reuses durable artifacts
  W->>A: Complete + verification
  A->>D: Conditional Ready transaction
  B->>A: Poll job / request asset access
  B->>S: Play clean MP4 + VTT
```

### 9.2 Delete during render

1. Owner DELETE sets project/revision tombstone, requests cancellation and denies new media access immediately.
2. Worker heartbeat receives cancellation; no further AI dispatch, stop subprocesses safely.
3. An in-flight upload may finish. Completion transaction checks tombstone/current fence and rejects publication.
4. Cleanup removes orphaned bytes and reconciles counters. Previously issued read URL lasts at most its original 60 seconds; downloaded bytes cannot be recalled.
5. A late retry/replayed completion cannot recreate the deleted project or refund uncertain provider use.

### 9.3 Regenerate versus retry

| Action | New revision? | Provider use |
|---|---|---|
| Retry recoverable failed job | No | Only missing/invalid stages, within original counters |
| Revise narration/content | Yes | Affected content/speech stages; prior result retained |
| Change orientation | Yes | Reuse compatible audio/timings; rerender only |
| Burn captions | No, export variant | No AI; render from stored assets |
| Regenerate intentionally | Yes | Fresh planning/affected speech explicitly allowed, with new capacity check |

## 10. Security and edge-case contract rules

- API never follows user/model-provided URLs, runs supplied shell/code, or treats screenshot text as instructions. File names are display data, not paths.
- Source decode before providers; role-based source selection prevents a logo alone satisfying branding input. Unclear/conflicting claims yield needs_input/omission, not invention.
- Store policy/rights acknowledgment version in immutable revision snapshot. Third-party processing and operator-local-worker access are disclosed before Generate.
- Provider fallback obeys eligibility/usage rights and consistent voice; missing/expired key is visible operational failure, not a paid switch.
- Presigned upload may outlive worker lease. Exact attempt paths plus finalization fencing and orphan cleanup prevent stale publication. Upload success alone never means Ready.
- Ownership/RLS tests include direct Supabase calls, foreign IDs in arrays, checkpoint links, exports, signed reads and expired users. Browser storage signing bypass must fail.
- Upstream outage returns safe errors without exposing credentials. Persisted jobs survive Vercel process restarts and browser logout.
- Keep error/retry reasons distinct: capacity, quota reset, worker offline, invalid content and config failure require different user actions.
- Public cached samples require separate publication authorization and licensing. No private source is automatically reused as a landing example.

## 11. API-to-database operation mapping

| API family | Atomic operation / tables |
|---|---|
| Auth | Public signup/Google OAuth, profile trigger; profiles, oauth_flows, action_grants |
| Projects/settings | version-checked update; projects/profiles |
| Uploads | reserve_upload/confirm_upload; assets, upload_allocations, usage accounts/reservations/ledger |
| Generate/revise/export | enqueue_generation/create_revision/enqueue_export; revisions/jobs/exports/references/idempotency |
| Worker claim/heartbeat | claim_job/renew_lease; worker_slots, workers, jobs, job_runs |
| Provider/repair/progress | reserve_provider_attempt/reserve_repair/append_event; attempts, repairs, events, counters |
| Checkpoints | save_checkpoint; plan_versions/scenes/scene_timings/checkpoints/references |
| Complete/fail/retry/cancel | fenced state procedures; jobs, revisions, exports, events, usage |
| Media access | authorized private asset lookup + bounded signed read; no DB permanent URL |
| Delete/cleanup | soft_delete and cleanup procedures; tombstones, dependency rows, deletion tasks, usage ledger |
| Operator | protected controls/worker credentials/audit |

## 12. Acceptance, versioning and PRD mapping

Contract tests must cover request validation and every documented success/error/status transition. During implementation, generate OpenAPI from shared schemas, validate illustrative fixtures, and compare frontend/client/worker types to generated DB types. Pin worker protocol and composition/schema versions; incompatible workers do not receive jobs. Additive response fields can evolve within v1 if consumers tolerate unknown response fields; new required request fields or changed semantics require explicit version/migration coordination. Requests remain strict.

Tests: cookie validation/CSRF/public signup/Google callbacks; duplicate-email and identity pre-registration collision tests; no verification/reset emails; direct Auth role/abuse controls; two-user IDs/Storage isolation; same-key and multi-tab enqueue; quota races; stale fence and cancellation during complete; provider timeout uncertainty; caption-export failure leaving clean video intact; offline refresh/poll; signed-link expiry/renewal; source-retention retry failure; account purge. Run integration tests with synthetic assets/mocked providers first. No live API generation is necessary to validate endpoint contracts.

| PRD IDs | Contract sections |
|---|---|
| AUTH-01, AUTH-02, AUTH-03 | 3, 5, 8, 10 |
| INPUT-01, INPUT-02 | 4, 5.3–5.4 |
| AI-01, AI-02, AI-03 | 4, 7.3–7.4: provenance and strict manifests |
| VOICE-01, SYNC-01, CAP-01, TEACH-01 | 7.4–7.5: measured artifact and completion contracts |
| VIS-01, FORMAT-01 | 4, 5.6, 7.5 |
| JOB-01, JOB-02, JOB-03, JOB-04 | 2, 5.4–5.6, 6–7 |
| RESULT-01, RESULT-02 | 5.2, 5.6–5.7, 7.5 |
| COST-01, DATA-01 | 2.2, 5.7, 7.3, 7.6, 9.2 |

No new product clarification blocks these contracts. Remaining Google OAuth/identity-linking/account limits/storage SDK details are implementation verification tasks. The 25 October UI reconciliation maps screen actions/data to these endpoints and entities; apply its corrections in shared contracts and implementation. This design does not implement endpoints, send mail, create credentials, migrate a database or consume AI generation quota.


## 13. Revision 1.1 — accepted authentication change

Email/password plus Google sign-in, public signup, no invitation endpoints, no SMTP dependency and no verification/reset-email endpoints. Reauthentication supports password or verified fresh Google proof. Video APIs, worker leases, media access, quotas and retention remain unchanged. API design is approved in general by the user; this revision records the explicitly requested authentication change. No endpoint/configuration was implemented.

## 14. UI reconciliation contract amendments — 25 October 2026

Read [UI reconciliation](UI-RECONCILIATION.md) with the contracts above. These are pre-implementation amendments; no live API changed.

### 14.1 Identity and settings

Full name is the existing displayName: trim outer whitespace, require 1–80 Unicode code points; preserve international names, punctuation and internal spacing. Apply the same bound to settings updates. No separate full_name column, unique-name rule or role from metadata. Controlled Google profile creation takes bounded provider full_name/name; if unavailable use “User” as a nonprivileged display label, editable in Settings. Never overwrite an explicitly edited display name on later OAuth login. UserDto.email comes from the current authorized Auth identity, not client-editable metadata. Email is read-only. authMethods determines password controls; Google-only users cannot create an app password here. Confirm-password fields are client checks; only the new password is sent to the existing endpoint. Configured password policy remains authoritative.

### 14.2 Form adapter and licensing

- Derive title from education topic, softwareName or productName, trimmed and bounded to 120 characters. An incomplete draft uses a nonempty “Untitled education video”, “Untitled software showcase” or “Untitled product video” title; this does not satisfy generation input requirements.
- Map the software description to brief and Features to highlight to featureHighlights. Map optional product description to brief, newline-separated benefit entries to benefits, and optional raw Brand details to brandDetails. Preserve raw brand details rather than guessing hex colors from prose; strict brandColors remains an optional separate structured field, not a replacement for raw text. Benefits retain the existing eight-entry/200-character bound; helpers/counters and combined 4,000-character budget must expose validation. featureHighlights/brandDetails each have 0–4,000 bounds subject to that combined budget. Education notes have their separate 10,000 limit.
- intendedUse remains required before Generate with values personal-learning/promotional; incomplete drafts may omit it. Render a compact shared Intended use choice. Server-side eligible-provider selection uses the frozen value and verified provider rights, never client assertions of commercial licensing. Uncertain/ineligible fallback cannot be used merely because quota is exhausted.
- Upload limits come from capabilities; show them before file selection. Source receipt precedes enqueue, decode validation precedes AI; successful-looking UI alone is not validated media. Removing a frozen/shared upload detaches mutable draft selection and cannot destroy referenced bytes.
- Privacy disclosure precedes upload. The external-AI checkbox authorizes analysis at Generate; choosing a file does not itself dispatch it to Gemini.

### 14.3 Library, actions and draft removal

VideoSummary = RevisionDto plus {projectId,title,mode,audience:null|'beginner'|'school'|'adult',targetSeconds,orientation,resolution:'720p',thumbnailAssetId:null|UUID}. Source from immutable revision snapshot, not subsequently edited draft. Existing export metadata supplies captioned-copy readiness. Owned expired metadata remains listable without renewing media URLs. Combine GET /videos with active draft projects for distinct Saved videos / Drafts / Expired sections. One project can have multiple completed version cards but only one mutable draft; a generated snapshot is not automatically a second unfinished draft card. An explicit later draft edit can coexist with saved outputs.

DELETE /projects/:id/draft requires expectedDraftVersion. Recheck active jobs and version under lock; on active work return STATE_CONFLICT without cancellation. On success set draft_state=removed, clear mutable draft_input and draft selections, increment draft_version, and schedule only unreferenced draft uploads for cleanup. Preserve revisions, title/history, their job records and source references. Repeated owned removal returns the safe prior result; deleted project remains 404. A later explicit Review input/Continue editing operation may restore a draft from the chosen revision through PATCH /projects/:id with expectedDraftVersion and complete replacement input; expiry of source bytes still requires reupload. Opening a form alone does not enqueue generation. Removed draft data without a surviving revision is not recoverable.

Backend returns server-computed availableActions with enabled flags and safe reasons for generate/revise/regenerate/format/prepareCaptioned/retryCaptioned/deleteVersion where applicable; status alone is insufficient. Evaluate source retention, worker capability, output/byte reservations, active job, retry budget and expiry. Existing mutation endpoints recheck every condition; flags are UX hints, never authorization. Captions exports keep the clean revision Ready. Internally render stage is allowed for export jobs, but UI projects kind=caption_export to one export status, not four AI stages. Retry is the existing same-job endpoint and never creates a new revision.

### 14.4 Deletion acknowledgment and returns

POST /me/deletion stays asynchronous 202. The completion-looking mockup must instead say “Account deletion requested” and “You’ve been signed out and can no longer access this account. Your stored data is being removed.” Keep the downloaded-files notice. No unauthenticated polling endpoint is added. Password/Google reauth grant is consumed on the explicit destructive action; confirmation:"DELETE" is a fixed client request value for that action, not a typed confirmation input. Preserve account/session on reauth cancellation or wrong-identity failure. Ordinary Google login cancellation returns to the normal sign-in form without an alarming banner. return paths are allowlisted same-origin paths; authorize again after login and never replay pending mutations.


## W-05 implementation slice — 3 November 2026

Local email signup/signin, verified session reads and display-name updates implement the auth/settings contracts. The initial GET /me/settings projection contains displayName, email, authMethods and settingsVersion only; defaults and usage are intentionally deferred until their real data features exist. PATCH accepts exactly the shared DisplayNamePatchSchema (expectedVersion, displayName), returning displayName/settingsVersion; stale writes return 409 STATE_CONFLICT. The SQL RPC locks the current Auth UID's active profile and increments its settings version. No client-supplied owner, role, email or Auth metadata is authority. Google, explicit refresh/signout flows, password changes and deletion remain later tracker milestones. See WEB-DEVELOPMENT.md for local setup and the validation evidence in PROJECT-TRACKER.md.


W-07 local implementation (4 November 2026): POST auth/refresh accepts a strict empty JSON object and returns {data:{authenticated:true}} after SDK refresh plus verified active-profile checks. POST auth/sign-out accepts SignOutRequestSchema {scope:"local"}, returns 204 and removes local auth/CSRF cookies; separate browser sessions are preserved. Both enforce the existing Origin/CSRF/body limits. Invalid sessions clear stale cookies; transient provider failures remain retryable service errors. Account content is gated by verified APIs with safe live return destinations and no mutation replay. W-06 Google is deferred at the user's request; live signup/signin contain only email/password. Password changes and deletion remain later tasks.


### W-08 dashboard read projection (4 November 2026)

GET /api/v1/dashboard requires a verified active user and accepts no query parameters. It returns {data:DashboardDto}: asOf (UTC), projectCount, recentProjects (at most six ordered updatedAt DESC/id DESC with id/title/mode/updatedAt/state), usage (retainedOutputs, reservedOutputs, maxOutputs, decimal-string usedBytes/reservedBytes/byteLimit, accountingConfigured), and worker (status:not_configured|offline|online, processingPaused). Missing per-user usage fields are null, never invented zero. Raw inputs, private object keys and worker internals are absent. A stable authenticated-only SQL projection scopes rows to auth.uid(); the web app uses no service-role credential. Private/no-store and safe error envelopes apply; unknown queries return 400, unsupported methods 405, missing sessions 401, inactive accounts 403, unavailable/invalid data 503.

This endpoint is a bounded dashboard slice, not the paginated /projects CRUD endpoints assigned to W-09/W-23. It reports current metadata only; it does not authorize media access or generation. Retained counts enforce expiry even before cleanup. Reserved counters are distinct from retained results; unconfigured accounting remains visible as unknown. Online indicates an enabled compatible worker heartbeat less than 90 seconds old and not in the future; pause flags remain separate. Shared schemas are in shared/contracts/dashboard.ts and the generated component catalog.


CSRF issuance repair (4 November 2026): GET auth/csrf reuses an existing valid nonce for the same session binding, preserving its original expiry across tabs. Anonymous 401 reads preserve a pre-auth nonce when there are no Auth cookies to remove; invalid Auth cookie clearing and explicit signout invalidate it. Exact Origin, strict HttpOnly cookie, constant-time cookie/header equality, timestamp bounds and session fingerprint checks remain in force. Mutation requests are not replayed automatically after a rejection. Missing-cookie and origin mismatches now provide actionable safe errors.


### W-09 project draft implementation (4 November 2026)

- POST /api/v1/projects accepts ProjectCreateRequest: {mode,title?,draftInput?,preferences?}; returns 201 {data:ProjectDto}. Missing/blank title becomes Untitled education video, Untitled software showcase or Untitled product branding video. Current catalog defaults are targetSeconds:60, orientation:landscape, voiceProfileId:Kore. Requests may carry Idempotency-Key (1-128 ASCII letters/digits/underscore/hyphen); the live UI always supplies a UUID stable across first-save retries. Missing keys get a fresh server key with no cross-request deduplication guarantee. Same-owner/same-key/same-canonical-payload retries return the original receipt; different payload reuse returns 409 STATE_CONFLICT. Receipt replay never resurrects a deleted/removed project.
- GET /api/v1/projects/:uuid returns the verified active owner's editable ProjectDto or 404 for foreign/missing/tombstoned/removed drafts. Invalid IDs/extra route segments are unavailable. Unknown query parameters are rejected. ProjectDto is {id,title,mode,draftInput,preferences,draftVersion,draftState:active,updatedAt,modeLocked}; the nested input's mode/title are canonical metadata. No raw owner identifiers, internal storage locations or revision input snapshots are returned.
- PATCH /api/v1/projects/:uuid accepts {expectedDraftVersion,title?,draftInput?,preferences?} with at least one editable field. Supplied input/preferences replace those objects; omitted fields preserve saved values. Every supplied draft input includes matching mode. Existing mode is not a writable PATCH field. A stale version returns 409 DRAFT_VERSION_CONFLICT; the SQL primitive checks again under row locks. Snapshot/version are returned from the write transaction, not a later HTTP read. No-op saves retain the existing version; actual draft changes advance it.
- All mutations retain Origin/CSRF/body limits and active-user authorization. Strict shared input/preferences validation permits incomplete content but rejects out-of-budget/unknown fields and unsupported voices. Source selections cannot be introduced/replaced until private upload/selection support exists; PATCH preserves any existing selections. No consent is accepted as authorization in these draft requests, and no save triggers generation, provider analysis, quota reservation or media upload. API errors do not dump source text or database errors. Existing internal SQL primitives enforce ownership/locking/bounds; the API additionally enforces the shared mode-specific semantic schemas.

The full paginated /projects and /videos library, upload lifecycle, complete branding form and Generate endpoints remain their later milestones. The live dashboard remains a six-recent-project entry point; known saved draft URLs also reopen directly. New-project mode queries are navigation only and do not create a row before explicit Save. Safe return destinations permit only live GET pages and never replay a draft write after signin.


### W-10 local catalog implementation (5 November 2026)

GET /capabilities and /voices now require a verified active account, return private/no-store data envelopes and reject query parameters. Capabilities modes are objects {id,draftAvailable,generationAvailable}, not a claim of live generation: all draftAvailable=true, generationAvailable=false. Durations=[60,75,90], orientations=[landscape,portrait], uploadLimits has enabled=false and the shared V1 byte/count bounds; educationCapabilities describes current drafts/generation/installed sample state and limitsVersion=v1. Voice available means selectable for draft preferences, not verified current provider capacity or usage rights. Kore is the sole selectable voice; nextCursor=null. No accent guarantee or provider credential/voice identifier is exposed. Shared DTOs are in shared/contracts/capabilities.ts.

The earlier public-preview proposal is narrowed for this implementation: previewUrl is either null or the fixed same-origin /api/v1/voices/Kore/preview. That GET requires active-account verification before returning reviewed static audio/wav, private/no-store, nosniff and same-origin resource policy. Missing/invalid/over-2MB sample returns 404. It accepts no media ID, path, source URL or query and never reads tester media or synthesizes speech. Reviewed installation outside public/ is explicit; no automatic promotion of private results. Currently no authorized sample has been installed, so real playback remains pending. Future public landing samples still require separate authorization.


W-10 sample update: the owner-approved 12-second Education Gemini/Kore excerpt is now installed locally. /voices returns previewUrl=/api/v1/voices/Kore/preview and educationCapabilities.voicePreview=true when that reviewed file exists. Active-account authorization/private caching rules are unchanged. Desktop/mobile native audio playback passed. No generation endpoint is enabled by sample availability.


### W-11 implemented upload boundary

The source allocation request above is implemented with strict shared UploadRequestSchema and required idempotency key. POST /projects/:id/uploads returns 201 {data:{uploadId,snapshot:{project,items}}}; GET on that path returns {data:{project,items}}. Items carry uploadId, assetId, filename, mimeType, decimal byteSize, role, protocol, allocation state/expiry and the exact bucket/objectKey needed for owner-session uploads. The snapshot is an atomic versioned project DTO. A changed payload cannot reuse an allocation key. GET /uploads/:id, POST /uploads/:id/complete {} and DELETE /uploads/:id {} return the owner's current upload snapshot; removal returns 202 because cleanup can retry. Unknown queries and unexpected mutation fields are rejected. GET /upload-config exposes only public Supabase URL/anon configuration after active-account verification; it never returns a session token or service key.

Direct uploads use the browser's own verified Storage session: standard POST for images and TUS for recordings, upsert=false. The Storage policy checks active exact allocation/path plus available metadata, with a full 45 MB bucket-ceiling reservation during transfer because Storage pre-authorizes before metadata exists. Receipt reads Storage metadata through scoped SQL, charges the declared exact size once and releases the excess reservation. It never trusts a browser completion payload and never claims decoding. Source selection changes remain controlled by upload operations; ordinary PATCH must preserve the current source list. A database guard also protects direct draft RPCs from foreign assets, invalid roles, duplicate sources and count/combined-byte overflow.

Server-only cleanup uses the existing service credential after verified owner-scoped logical removal; its bookkeeping RPC is granted only to service_role, checks the exact upload/owner and surviving references, and releases charge once after deletion. Incomplete transfers retain their ceiling charge through the authorization/orphan window. Missing service config or storage failures leave cleanup pending. Foreign/disabled/missing resources are unavailable; confirmed source-in-use, stale version, expiry and capacity failures preserve draft data. Private/no-store, Origin/CSRF, 64 KiB JSON bounds and safe error envelopes apply.

The local periodic cleanup command is operator-driven until scheduler integration. It re-scans removed paths through authorization expiry plus 24 hours, and expires abandoned 24-hour allocations. General received-media retention, account deletion and published signed access are separate milestones.


## W-14 implemented queue boundary — 6 November 2026

Implemented locally: POST /projects/:id/generations (mandatory Idempotency-Key; exact GenerationRequest) returns 202 QueuedResult and Location /api/v1/jobs/:uuid; GET /jobs/:uuid returns the owned safe JobDto. Same-key receipt recovery runs before draft/config/source freshness checks. Same key with changed payload: 409 IDEMPOTENCY_CONFLICT; stale version: 409 DRAFT_VERSION_CONFLICT with currentDraftVersion; another active owned job: 409 ACTIVE_JOB_EXISTS with jobId. Pause: 503 GENERATION_PAUSED; byte/configuration failure: 409 STORAGE_CAPACITY; output cap: 409 OUTPUT_LIMIT; incomplete receipt: 409 UPLOAD_INCOMPLETE; expired inputs/hidden retired receipt: 410 INPUTS_EXPIRED; unknown/foreign/deleted project or job: 404. Content validation returns 422 with safe messages. Query parameters are rejected; Origin/session-bound CSRF protects POST; response status/receipt bodies are strict browser-safe schemas and private/no-store.

The SQL RPC derives input from the locked draft and rechecks completeness even for direct authenticated RPC callers. It freezes consent plus acceptedAt, selected preferences and exact source references, applies cumulative byte/output admission, and creates one revision/job/reservation/ledger/event/receipt atomically. Offline/claim-paused workers do not reject accepted work; they yield waiting_worker. Safe GET currently reports canCancel=false/canRetry=false because those mutation endpoints remain planned; generic error text replaces any raw stored message.

W-14 implements the backend boundary only. Existing generation pauses and UI generationAvailable=false remain in place. There is no live provider processing, progress polling UI, cancellation, retry worker, or result publication yet. New admissions require configured actual global/user capacity; no default grant is invented or increased. The architecture sections above remain the future full API contract.


## Dedicated draft list — implemented 6 November 2026

GET /drafts requires an active authenticated account. Response: {data:{items:[{id,title,mode,draftVersion,updatedAt}],nextCursor:string|null}}. Each response contains at most 20 summaries. Optional cursor is canonical base64url of the strictly validated {updatedAt,id} boundary; it preserves the exact UTC timestamp and UUID for stable keyset pagination. It contains no source content, is not an access grant, and every request derives ownership again from the verified session. Unknown/duplicate parameters are INVALID_QUERY; malformed cursors are INVALID_CURSOR. POST/other mutations are unsupported. Responses are private/no-store, and private inputs, media keys and owner metadata are omitted. /drafts is an exact allowed authentication return path.


## W-15 implemented control boundary - 6 November 2026

The current strict protocol uses POST /api/worker/v1/claim with {instanceId,capabilities}; heartbeat with {instanceId,health,assignment?:{jobId,leaseToken}}; release with {instanceId,jobId,leaseToken,reason:adapter_pending|stopping}. Each process UUID is bound to its lease. Health currently permits only decimal freeDiskBytes/freeMemoryBytes and a bounded Node version; no progress or private filesystem paths. Headers require the opaque wkr_ token and X-Worker-Protocol: 1; any Origin is rejected and cookies/user JWTs grant no authority. Control-body ceiling is 16 KiB. Responses are strict shared worker schemas, private/no-store; idle claim is 204 Retry-After: 15, auth 401, stale lease 409, invalid fields 422, oversized 413, protocol/service unavailable 503. Errors never expose SDK/SQL bodies.

Claim returns serverTime, a 90-second lease, 20-second heartbeat interval, exact frozen input, remaining budget and checkpoint metadata. Same instance recovers its original claim/fence; a second process cannot. Expired leases close prior job_runs, retain bounded elapsed budgets and increment the fence before reassignment. Deactivated/deleted owners, cancellation, missing inputs or exhausted budgets stop renewal; terminal control releases only unused reservation, preserving physical-byte charges. All capacity transitions share global-first usage locks.

Only these three control actions are implemented in W-15. Artifact access/registration, provider attempts, stage progress, cancellation UI and Ready publication above remain future contracts. The adapter prepares/reuses validated immutable local input and yields safely; it does not execute AI. See LOCAL-WORKER.md for setup, tests and boundaries.


## W-16 implemented Education boundary - 6 November 2026

POST /api/worker/v1/execute accepts the strict WorkerExecutionRequest (256 KiB maximum): instanceId, jobId, leaseToken, bounded health and one allowlisted operation. Scoped state/plan, dispatch/result/repair, allocate/confirm/read, checkpoint, stage-start, complete and fail all authorize the current server fence and account/project state. Binary uploads/downloads use exact private Storage permits, not a Next.js media proxy. Server validates report bytes/hash/schema; worker performs full decoding/timing checks. Confirmed metadata alone never publishes Ready. Completed-operation replay preserves one output charge; no raw SQL/provider failures are returned.

GET /api/v1/projects/:id/generation returns a safe owned EducationRun projection without input/paths/credentials; GET /api/v1/projects/:id/result/video|srt|vtt freshly authorizes active ownership, live verified result and retention before a private 307 to an at-most-60-second Storage permit. Missing/foreign/expired media is unavailable. Worker credentials do not authorize user routes.

Capabilities advertise Education generation only when reviewed activation, live executing-worker health, configured account/global capacity and enabled mode agree. Control-only heartbeat does not imply an executor. Optional health.executionReady is additive within protocol 1. A forward admission guard preserves existing receipt recovery while enforcing configured enabledGenerationModes for new jobs. Software/Branding readiness stays false.

The original 24-attempt lease gate, two repairs and 30-minute execution budget are retained; execution reserves no more than 23 actual dispatches. Unknown attempts remain charged and cannot be blindly replayed; eligible fallback uses a separately budgeted consistent scene set. See EDUCATION-GENERATION.md for verified scope and remaining W-17 through W-28 workflows.


### W-24D local implementation — 6 November 2026

DELETE /api/v1/projects/:id/draft accepts strict DeleteDraftRequest {expectedDraftVersion} with the existing verified session, exact Origin, CSRF and JSON size boundary. Success is HTTP 202 {data:{deleted:true,cleanupState:"pending"}}; the receipt means the mutable draft was removed and cleanup scheduled, not all bytes physically purged. Query parameters are rejected. Foreign/missing drafts are indistinguishable 404s; a stale version returns 409 DRAFT_VERSION_CONFLICT; active queued/waiting/running/cancelling work on this project returns 409 ACTIVE_JOB_EXISTS with finish/cancel guidance. Transient failures remain retryable and the client keeps the card until confirmation.

The authenticated delete_saved_draft(project,expected_version) RPC owns the transaction; repeat owned requests after removal return the same safe acknowledgment even with the original positive version. No arbitrary owner or force flag is accepted. Frozen results/history and revision/checkpoint sources remain. The route attempts bounded cleanup after the response; durable source cleanup tasks and existing uploads:cleanup retry failures and preserve partial-upload grace accounting. Current transfers/deletion remain Supabase Storage; no R2 API has been implemented by W-24D. Generated component schemas include the strict deletion request and acknowledgment.


### W-17 progress read/telemetry implementation — 7 November 2026

GET /api/v1/projects/:id/generation remains an owner-authorized private/no-store read and returns null before generation. EducationRun now includes strict status/stage, jobId/revisionId, activeMs, expiresAt, startedAt, serverTime, retryAt, workerStatus (online/offline/not_configured), claimsPaused and progress {completedScenes,totalScenes}. Count ranges are bounded to Education plans (4–6 total when known); retryAt is nullable and supplied only for waiting_quota. No input, storage path, worker identity, credential, lease token or raw error is exposed. A foreign/missing/non-Education project is 404; service/projection failures are retryable 503, not a false missing project.

Running/cancel-requested availability is derived from the assigned worker and current job lease/heartbeat; other queue states use compatible enabled executor liveness/readiness. Reads do not mutate job state. Existing fenced worker progress operations accept an optional paired completedScenes/totalScenes only for voice preparation, validate bounds and preserve compatibility with stage-only reports. Repeated identical counts do not add duplicate progress events; corrections back to story clear old counts. This telemetry does not change external attempt/repair budgets.

Foreground polling uses five seconds for online running work, fifteen for waiting/unavailable work; hidden tabs pause, focus/online resumes and terminal recurring polling stops. Manual Check status/Try again repeats a read only. Connection failures retain last known status/editor; abort/teardown guards prevent stale updates. A known retry time is provider eligibility, never ETA. The existing Open video/SRT/VTT links remain; full player, recovery commands and cancellation belong to W-20, W-18 and W-19. No provider scheduler or new generation request is triggered by viewing progress.


### W-18 recovery implementation — 7 November 2026

GET /api/v1/jobs/:id/recovery returns strict {jobId,revisionId,reason}, where reason is retry/edit_input/inputs_expired/budget_exhausted/operator_required/state_conflict/unavailable. No raw exception/provider text/input/storage path is returned. GET is read-only. Unknown/foreign/deleted/inactive resources are hidden by the established active-account and owner checks.

POST /api/v1/jobs/:id/retry requires {} exactly, an Idempotency-Key, active email session, exact Origin and session-bound CSRF. Returns 202 QueuedResult and Location for the same job/revision. Same-key replay only recovers its receipt/current status and cannot requeue a later failure. Different keys cannot double-reserve an active job. Newer revisions, nonfailed states, nonrecoverable/uncertain failures and missing/expired media reject retry. 409 STATE_CONFLICT/BUDGET_EXHAUSTED/ACTIVE_JOB_EXISTS/STORAGE_CAPACITY/OUTPUT_LIMIT, 410 INPUTS_EXPIRED, 503 GENERATION_PAUSED or retryable SERVICE_UNAVAILABLE retain safe messages; foreign resources are 404. No query parameters or changed content/budget fields.

Retries reacquire capacity without resetting consumed provider/repair/time/worker/byte budgets or extending expiry. Existing valid checkpoints resume under a fresh lease; pending/unknown provider outcomes require operator review. Per logical operation the durable dispatch ceiling is three attempts. Unknown historical PIPELINE_FAILED records do not authorize blind provider retry. Failure classification only labels known infrastructure/processing problems recoverable; content/config/refusal/verification failures stay stopped. Needs input returns to the form and explicit Generate creates a new immutable request. Provider waiting/scheduler and cancellation are not implemented by this endpoint.

The browser retains the key after ambiguous responses, offers Check retry request and holds new Generate through background checks until confirmation. Successful receipt confirmation permits a later deliberate retry only if a later failure is eligible. No automatic retry POST or paid/exactly-once-provider guarantee is introduced.


### W-19 cancellation implementation — 7 November 2026

POST /api/v1/jobs/:id/cancel requires an active owner session, exact Origin, session-bound CSRF and {} exactly; no idempotency key is necessary because the target job/state is the operation identity. Returns 202 {jobId,status:cancel_requested} for a live assignment or 200 {jobId,status:cancelled} after unassigned stop, acknowledgment or lease expiry. Replays do not add events/releases. Foreign/missing/deleted resources are 404; completed/stopped noncancelled states are 409 STATE_CONFLICT; transient service errors are safe retryable 503. Unknown fields/queries are rejected.

Cancellation commits before any later publication grant: worker_execute rejects a cancelled/stopping fence. Completion winning the serialized transaction first stays successful and cancel returns conflict. Already issued private upload permits may still land; allocated bytes and provider usage are not refunded. In-flight unconfirmed attempts become outcome_unknown upon terminal cancellation. Unused reservation/output capacity releases once only after acknowledgment or expired authority.

The existing worker release acts as cancellation acknowledgment after its child stops. Stopping views repeat the same cancellation POST every fifteen seconds while visible/online to reconcile expiry; user Check cancellation repeats that same operation after ambiguous replies. Status GETs remain read-only. Idle worker heartbeat also reconciles an expired cancellation. With all workers offline and no open view, durable fencing persists and bookkeeping reconciles on next activity; no continuous scheduler is introduced. Cancelled offers Review input and requires an explicit new Generate; no Undo/Resume/Retry of the cancelled job.


### W-20 revision-pinned private results — 7 November 2026

GET /api/v1/projects/:id/results/:revisionId returns strict EducationResult: revisionId, frozen title, version, ready/expired/unavailable status, orientation, targetSeconds, nullable measured durationMs/completedAt/expiresAt, serverTime and recorded narration {provider,voice}. Active ownership and a nondeleted Education project are required. Ready requires retained clean-export/typed-artifact/Storage metadata; expired metadata remains readable without issuing file access. No inputs, keys, credentials or media URL are in metadata. Foreign/missing/deactivated resources are hidden; infrastructure/schema faults return safe retryable 503.

POST /api/v1/projects/:id/results/:revisionId/access {kind:video|srt|vtt|thumbnail,download:boolean} requires exact Origin, session CSRF and active ownership; queries/unknown fields and thumbnail downloads are rejected. Response is {revisionId,kind,download,url,serverTime,expiresAt}; no idempotency key/provider request is involved. Grants authorize that exact revision rather than mutable latest_ready_revision_id. The server rechecks after signing, matches the configured Storage origin, and bounds TTL to 60 seconds and the minimum revision/export/requested-asset expiry. Download filenames are education-<revisionId>.mp4|srt|vtt through Storage Content-Disposition. Report/checkpoint access is not exposed.

404 hides foreign/missing resources; 410 RESULT_UNAVAILABLE covers expired/incomplete/removed result access; 422 rejects unsupported actions and 503 preserves retryable infrastructure failure. Responses are private/no-store. Existing legacy GET result redirects remain compatible, while the player uses pinned grants. Native video/track/download transfer is direct to private Storage, never a Vercel media proxy. Caption controls, position-preserving bounded reauthorization and expiry/session cleanup do not create generations, renders or new quota.


### W-23 implemented Education library — 7 November 2026

GET /api/v1/videos accepts only an optional single canonical base64url cursor containing {completedAt,id}; timestamps retain PostgreSQL microseconds. Returns SavedVideoPage {items,nextCursor,usage,asOf}, at most 20 items and a 21-row private lookahead. Each item extends the W-20 EducationResult with {projectId,canEditDraft}, nonnull completedAt/expiresAt, frozen title, original version/orientation/duration and recorded narration. No source input, owner override, media URL, asset ID or object path is returned. Unknown/duplicate/empty/malformed query parameters return 400, unsupported methods 405, inactive accounts 403 and transient faults safe retryable 503. Same-origin session policy and private/no-store headers apply. Filters/custom limits in the broader future contract are not enabled for this release.

Lists owned nondeleted completed Education revisions independently of mutable latest_ready_revision_id and removed draft state. Expired results retain safe metadata; unavailable verification/Storage objects cannot mint new links. Usage is the existing dashboard projection as of the returned timestamp; listing does not reconcile/charge/release quota. Thumbnail access remains the W-20 exact-revision POST with Origin/CSRF and at most 60-second grants; no extra grant endpoint or media proxy. The live result page /projects/:id/results/:revisionId uses that player and can reopen results even after the editable draft was removed. /videos and exact root-relative pinned result pages are valid email-session return destinations; no mutation/query or foreign scheme is replayed.


### W-24 privileged maintenance — 12 November 2026

No browser/Next.js cleanup route was added. Supabase RPC sweep_expired_media(apply_changes=false,scope_owner=null,page_size=25) and media_cleanup_task(operation,runner,task,expected_token,scope_owner) are revoked from PUBLIC/anon/authenticated and granted only to service_role. The private Node tool defaults to preview; apply/serial watch and revalidated blocked-task retry are operator actions. Claims carry an exact artifact identity, decimal fence and at most 60-second lease. Storage API deletion must be followed by database absence/accounting verification; stale acknowledgments fail closed. Ordinary user JWT denial was verified over real local Auth/REST. Existing private player/library contracts are unchanged.

### Education topic-visual data — 12 November 2026

The existing authenticated worker plan operation accepts optional `SceneSchema.animation`: bounded `bubble-sort` or `llm-flow` data with allowlisted phases and consistent examples. New specialized planner requests require it; older plans without it remain valid. This adds no public form endpoint, executable code or external-media URL. The shared OpenAPI catalog is refreshed. See [topic visuals](TOPIC-VISUALS.md); ownership, budgets and lease checks are unchanged.

### Completed Education video deletion — 12 November 2026

DELETE /api/v1/projects/:project/results/:revision accepts only expectedVersion and uses the user JWT, same-origin CSRF and owner/version checks. Returns deleted/revisionId/cleanupState (202 pending, 200 complete). GET on the same path plus /deletion reads an owned safe receipt. Confirmed removal blocks new grants and hides that result; drafts/other revisions stay intact. Logical slots are reconciled once; physical bytes stay charged until the service-only Storage watcher confirms removal. See [video deletion and account controls](VIDEO-DELETION-ACCOUNT.md).


## Security safeguards — 12 November 2026

Sign-in/sign-up share durable email/network/global 60-second windows. A denied application attempt returns RATE_LIMITED/429 and Retry-After; unavailable protection returns SERVICE_UNAVAILABLE/503 before credentials are submitted to Auth. Vercel forwarding is trusted only at the configured platform boundary. Project/generation-history capacity uses the existing validated STATE_CONFLICT/409 envelope; daily job/provider admission uses RATE_LIMITED/429 with the 00:00 UTC reset explanation. Recovery may report daily_limit and offers a bounded read to recheck; cached media/storage recovery stays eligible subject to existing safety guards. Worker P1604 maps to the allowlisted PROVIDER_DAILY_LIMIT transport conflict, never lease loss or provider-fallback permission. No new browser service/provider credentials or permissive CORS policy were introduced. [Implementation and remaining direct-Auth checks](SECURITY-CONTROLS.md).

## W30 essential operational contract — 13 November 2026

Essential controls are verified locally through active operator sessions plus a repeated DB role/status gate: GET /api/v1/operator/health, /workers, /jobs (status/before), /audit (before); PATCH /controls with {requestId,reason,expectedVersion,generationPaused?,claimsPaused?}; POST /jobs/:id/reconcile with {requestId,reason,expectedLeaseToken}. Bodies are strict; mutations keep same-origin/CSRF protection, exact per-actor receipts and safe audit. No credential/model/limit update is exposed. State/version conflicts use STATE_CONFLICT; role failures OPERATOR_REQUIRED; persisted limits return RATE_LIMITED/Retry-After. Public RPC operator_console delegates to a private denied-to-users implementation only after early protected-role authorization, then rechecks under locks. Read projections omit raw inputs/media/credential hashes. The wider operator endpoint table above remains design backlog where not listed here. No operator UI or worker-token creation/rotation was added. [Guide/evidence](OPERATOR-CONTROLS.md).

## Media handoff and upload error corrections — 13 November 2026

Legacy GET /api/v1/projects/:id/result/{video|srt|vtt} revalidates the active owner and live result after Storage signing, compares the same bucket/object and rechecks expiry before returning 307. A deletion/account denial returns 404; changed-object or unavailable checks fail closed without returning the signed URL. Links remain pinned to the configured Storage origin and bounded to 60 seconds, consistent with the exact-revision POST handoff.

Worker upload confirmation now uses SQL P1605 and the allowlisted ARTIFACT_UPLOAD_INCOMPLETE/409 transport response. The worker records STORAGE_UNAVAILABLE for that failure, preserving cached-only retry at a full daily AI allowance. P1604 remains reserved for daily provider admission and maps to PROVIDER_DAILY_LIMIT/409, recorded as PROVIDER_UNAVAILABLE. A recovery that actually dispatches a new provider request must still pass the unchanged daily guard.