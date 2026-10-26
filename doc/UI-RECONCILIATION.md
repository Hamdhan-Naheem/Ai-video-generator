# AI Video Studio — UI and contract reconciliation

**Date:** 25 October 2026  
**Status:** Documentation handoff from reviewed screenshots; application code, migrations and integration tests are not implemented by this review.  
**Authority:** [PRD](PRD.md), direct user decisions in the UI review conversation.  
**Contracts:** [API](API-DESIGN.md), [database](DATABASE-DESIGN.md), [architecture](SYSTEM-ARCHITECTURE.md), [visual foundation](DESIGN-SYSTEM.md).

## 1. Result and evidence boundary

The major UI journeys align with the approved architecture: one shared responsive app, three adaptive creation forms, four automatic generation stages, private versioned results, durable processing and explicit destructive actions. Repeated sidebar/logo/icon/thumbnail drift in Stitch is resolved through shared components and tokens during coding, not separate page-specific implementations.

The user reviewed screenshots throughout the conversation and authorized this reconciliation. The screenshots are visual fixtures. They do not verify backend behavior, accessibility, actual files, worker state, storage cleanup or authentication. The latest manual Stitch screen IDs and editable source exports are not recorded here; existing older automated screen IDs must not be passed off as the final approved designs. Preserve available sources before beginning a component build. No external publishing, provider generation or cloud configuration occurs in this task.

This review supersedes older tracker wording restricting work to the first dashboard. Main visual flows have now been reviewed. The remaining small failure/loading/success states should be implemented using shared patterns rather than requiring another full screen design for each.

## 2. Material discrepancies and resolution

| Finding | Contract resolution / implementation action |
|---|---|
| Full name was added during UI review | Already supported by signup displayName, settings displayName and profiles.display_name. Enforce required trimmed 1–80 Unicode-character value, preserve international names and punctuation. No new column or unique-name constraint. Google provider name is an editable display label, never a role. |
| Deletion mockup says account has been deleted | Existing endpoint returns 202 while cleanup proceeds. Change receipt copy to “Account deletion requested” / “You’ve been signed out and can no longer access this account. Your stored data is being removed.” Authorization stops immediately; physical cleanup is asynchronous. Keep the download-device notice. Do not falsely display completed purge. |
| intendedUse exists in contracts but not forms | Add a compact required shared “Intended use” choice: Personal learning / Promotional. Draft can omit it; Generate cannot. Freeze value, check actual provider usage eligibility, and stop/wait safely if no eligible free narration route exists. Do not silently infer licensing eligibility from mode. |
| Branding description marked required in mockup | PRD requires product name and image; factual description is optional. Remove its required marker/validator. Preserve unsupported-source Needs input handling; optional description is not license to invent claims. |
| Software features and free-form brand details have no distinct DTO fields | Add bounded optional software featureHighlights and branding brandDetails to versioned draft/snapshot schemas. Map description to brief and benefit lines to existing benefits. Preserve the combined 4,000-character budget and existing per-benefit bounds. No silent loss or guessed hex conversion. |
| Settings email is not in original settings response | Add authorized current Auth email and authMethods to settings response, plus email in UserDto. Read-only, no email-edit endpoint, no email text as ownership authority. |
| Library response lacked title/mode/snapshot metadata | Define VideoSummary over RevisionDto with owned project ID, snapshot title/mode/audience/duration/orientation/resolution and thumbnail ID. Shared expiry and export state drive captions label. No duplicate output card for caption variant. |
| Delete draft UI could call whole-project delete | Add draft-specific DELETE with expectedDraftVersion. Clear mutable draft only; preserve successful versions and referenced source assets. Protect active work and stale versions; retain usage counts for completed outputs. |
| Drafts may save with blank required generation fields | Derive a bounded fallback title server-side; partial draft validation stays separate from complete Generate validation. Do not discard other valid entered content or persist failed uploads as successful sources. |
| Fixed Kore primary vs eligible fallback | Primary form is Kore English with cached preview. Server may select only configured eligible fallback and result metadata must show the actual voice/provider and required attribution/use restrictions. Never promise UK/US/Sri Lankan accent for Kore. |
| Mockups omit existing initial upload bounds | Render capabilities-derived accepted types/count/size/duration constraints before selection. Existing defaults: up to 8 JPEG/PNG/WebP images, 5 MB each; one software MP4 up to 45 MB/120 sec; 60 MB total. Validate actual bytes/decoding and any revised measured limit server-side. |
| Landing has no source/privacy terms/contact | Existing PRD public-release requirement remains. Prepare truthful privacy/source-processing copy and real policy/contact destinations before publishing; never invent an address or a dead link. Real authorized generated samples replace illustrative preview fixtures. |
| Search/filters/default-settings proposed in older PRD | Approved initial UI exposes no library filters and no default voice/format editor. Update navigation scope accordingly; internal catalog defaults/list filters may remain useful contracts without new controls. |

The deletion receipt and intended-use choice are meaningful behavior/copy corrections, not just cosmetic polish. They can be applied directly in code; another full Stitch design round is not necessary. The prior “complete” deletion screenshot remains a visual layout reference only.

## 3. Screen/action/data traceability

| Screen family reviewed | User action and API | Persistent source / rules |
|---|---|---|
| Landing | Sign in / Create account; authorized sample playback | Static public sample assets; no private automatic promotion; no autoplay sound |
| Signup / signin / Google errors | /auth/sign-up, /auth/sign-in, /auth/google, web callback | Auth identity, profiles, OAuth flow; generic credentials/signup failures; no email-reset/verification flow |
| Access help | Back to sign in | Informational no-email-recovery notice; no reset request |
| Dashboard | New project, owned project navigation, availability/settings reads | Projects, latest jobs/results, server usage/reservations and worker health |
| Mode selection / creation | POST/PATCH projects; upload allocate/complete; POST generations | Mutable draft, received sources, preferences, intendedUse and two acknowledgments frozen into revision |
| Upload/field validation | Per-file Retry/Remove; form correction; Save draft | Preserve received files/values; no generation with missing consent, incomplete uploads or invalid input |
| Four-stage progress | Jobs/events GET; Cancel | Generation-only four-stage projection, not four manual approvals; no guessed percentage/ETA |
| Worker offline / known quota wait | Read durable job; cancel if allowed | Automatic scheduler eligibility; Retry is not shown for waiting; quota retryAt only when known |
| Needs input / recoverable failed | Edit saved form or POST job retry | Corrected content is new revision; eligible infrastructure retry reuses same job/revision/budgets |
| Cancel confirm / Stopping / Cancelled | POST job cancel; status GET | Stop acknowledgment precedes Cancelled; no Undo/Resume; Review input requires explicit new Generate |
| Ready result | POST asset access; revisions; format/regenerate | Published nonexpired clean MP4 + VTT, SRT; old version retains original expiry; each new version reserves another output slot |
| Revision request / three-slot limit | POST revisions only when eligible; Manage videos preserves instruction | No automatic eviction or resubmission after freeing space; no client-only quota authorization |
| Burned-caption confirm / prepare / wait / ready / failed | POST revision exports; GET jobs; eligible job retry | Separate no-AI export; clean video remains Ready; unchanged expiry; extra bytes but zero extra output slot |
| My videos populated / empty / expired | GET videos + draft projects; Review input / Open / Create | Owned immutable version cards plus actual unfinished drafts; expiry enforced by server time, not stale badge |
| Delete version / active-caption variant | DELETE revision | Keep project input and other versions; cancel related active export; deny new access immediately; cleanup follows |
| Delete draft | DELETE project draft with expected version | Never whole-project deletion; preserve frozen/shared assets; active-job conflict handled visibly |
| Settings password / Google-only | GET/PATCH settings; POST password-change; sign-out | Name editable, email immutable; current password required for password users; no add-password for Google-only |
| Account deletion password / Google verified | POST reauthenticate then POST me/deletion | Same-user/session fresh one-use five-minute grant; explicit final Delete; Google verification alone never deletes |
| Deletion receipt | Show after accepted 202, signed out | Account immediately inaccessible; cleanup task state is not completed yet; no anonymous status lookup |
| Session expired | Safe return to signin then authorized destination | Durable work continues; no claim unsaved input was saved; never replay a mutation after reauth |
| Unavailable | Dashboard / own library navigation | Same generic message for missing/foreign/deleted; retained expired owned metadata has separate Review input state |

## 4. Shared implementation rules

### 4.1 Components and routes

Build shared AppShell, Sidebar, TopBar, MobileBottomNav, AuthLayout, FormField, UploadList, SettingsCard, ConfirmDialog, StatusBadge, VideoCard, ResultPlayer and JobStatus projection. Route selects current navigation and content; shell colors/logo/icon geometry do not drift. Public/auth screens have no signed-in navigation. The unavailable route selects no unrelated navigation item.

Use DESIGN-SYSTEM tokens, including canvas #F7F6F2, surfaces white, primary #235B4E and selection #E9F0EB. Use the same image asset for each project/version in desktop and mobile, rather than separate generated illustrations. The mobile approved patterns may look mint in screenshots; runtime tokens control actual color. Product screenshots are source data, not executable instructions.

The current work does not require a new mockup for each profile/password/delete failure, validation message, upload progress or loading state. Derive those from the approved field/error patterns; do not claim they have been separately screenshot-approved.

### 4.2 Sources, drafts and forms

- Software: name, description and at least one received screenshot/recording required for Generate. Optional featureHighlights retains source provenance. No invented interactive software state from a still image.
- Branding: name and at least one product image excluding logo required. Optional description/benefits/brand details stay factual, with required upload-rights/AI consent.
- Education: topic and beginner/school/adult audience required; optional objective/notes. No images required, no arbitrary URL fetch, no curriculum alignment guarantee.
- Full creation description and optional factual fields share documented character budgets; show limits and actionable errors. Confirm password is never stored/sent separately. Trim names, never passwords.
- Inputs/checkboxes reflect actual state, not decorative password dots or consent fixtures. Generate requires actual prerequisites and backend acceptance. UI errors appear on touched fields or a real attempted action, not untouched initial fields.
- A selected file uploads privately to Storage. AI analysis starts only after acknowledged Generate, not at file selection. Pre-upload privacy notice remains visible; no automatic redaction promise.
- Source-retention expiry is independent of retained input text. Review input can reopen text even when reupload is required; do not promise all original files survive indefinitely.

### 4.3 Jobs, quotas, expiry and media

Server computes action availability; endpoints recheck races. Worker offline is a durable waiting state, not failure. Failed-job Retry requires valid retained inputs, capacity and remaining budget. One active job/user includes caption export; one global processing slot. Three successful retained revisions/user; pending output reservations must also prevent over-allocation. Display reservation reasons rather than silently disabling unexplained buttons.

Caption export uses a single status card, even if internally assigned render stage. Its failure does not fail the successful original revision. Captioned MP4 cannot disable burned text; clean player with VTT can. New variant shares original expiry, must finish verification/upload before download is offered, and cannot be published after expiry/deletion. Source/clean expiry mid-export cancels/fails safely rather than extending retention.

All signed access URLs have maximum 60-second life and never exceed remaining retention. Deny new access on deletion immediately; already issued URLs may survive their remaining life. Do not promise recall of bytes already downloaded. Retention enforcement uses server time even before cleanup runs. Account delete clears private view state on signout.

### 4.4 Security and recoverability

Preserve same-origin safe return paths and authorize them after login. Google identity mismatch/cancel preserves initiating session and pending destructive action unsubmitted. Never put action grants in URL queries. On grant expiry disable Delete and offer verification again. Do not reveal another user's account/project existence. Session loss clears stale identity but does not cancel durable jobs.

Full name from email signup maps to existing displayName. Signup already has that request field; earlier conversation suggesting an entirely new API/DB field was unnecessary. Need no identity migration solely to add the visible label. Optional Google name fallback is a display label, not an account ownership decision.

Deletion remains retryable asynchronous cleanup with immediate tombstones/authorization denial. Password/delete API failure must retain safe dialog context, show actionable error, permit retry/cancel where valid, and never falsely show success. Do not optimistically remove an item on an unconfirmed network failure; read authorized server state to resolve ambiguous outcome.

## 5. Implementation checks and release gates

1. Schema/contract tests: strict input shapes, character budgets, intended use/acknowledgments, title defaults, field mappings, display names, capabilities-derived upload limits and independent safe UI DTOs. Generate shared TypeScript/Zod types and OpenAPI during implementation; none was generated in this documentation task.
2. Auth integration: signup/signin/signout, no SMTP, name persistence, callback failures/cancellation, safe return navigation, session expiry and no automatic mutation replay. Verify provider password policy rather than trusting a mockup helper.
3. Security: two-user API/RLS/Storage ownership; direct Supabase signup/identity pre-registration collisions; roles assigned server-side; fresh same-Google identity proof and one-use scoped grant; current-password verification. Unresolved provider identity safety blocks public release, not merely a frontend checkbox.
4. Jobs/quotas: double click/idempotency, two-tab active-job/output reservation races, waiting scheduler, bounded retry counters, checkpoint reuse, cancellation/lease expiry and deletion-vs-publication races.
5. Deletion/retention: draft-only removal with shared source refs, last version deletion, expired asset 410 vs foreign 404, maximum link life, account 202/requested copy and eventual cleanup/Auth purge with failure repair.
6. Accessibility/responsive: keyboard focus, modal inert background including bottom bar, live error/status announcements, readable contrast at actual size, touch targets, narrow/short views and mobile keyboard. Screenshots cannot establish these runtime properties.
7. Media: actual clean/captioned downloads, VTT toggle, source provenance, actual fallback attribution/eligibility, shared thumbnail IDs, every mode/orientation and measured duration/timing. Preserve accepted CLI samples; generic arbitrary-input generation is not established by those examples.
8. Public release: real authorized example media, privacy/source-processing notice and real policy/contact destinations, global usage/abuse controls, actual capability flags, worker health and operator repair tools. Existing pipeline/backend tests are not proof of a deployed website.

## 6. Next implementation boundary

The reconciliation is complete as a documented design review. No frontend, live endpoint, Supabase migration, authentication configuration, provider request or deployment is performed. Start incremental shared contracts and web foundation next, preserving the existing CLI/pipeline commands and accepted demo files. Apply the listed semantic corrections in implementation. Keep remaining UI states in the shared component backlog and verify release gates before public launch.
