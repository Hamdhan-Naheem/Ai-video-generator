# AI Video Generator — project instructions

## Read first

1. Read `doc/PROJECT-TRACKER.md` for actual implementation status, current priority, and the next milestone.
2. Read `doc/PRD.md` for the approved V1 requirements.
3. Read `doc/README.md` for the document map. For web tasks, read `doc/WEB-DEVELOPMENT.md` and `doc/DESIGN-SYSTEM.md`; for pipeline tasks, read `doc/PIPELINE-USAGE.md` and `doc/LOCAL-SETUP.md`.
4. Read `doc/SYSTEM-ARCHITECTURE.md` for the current full-application design. Consult `doc/INITIAL-ARCHITECTURE.md` and `doc/PIPELINE-PROTOTYPE-PLAN.md` for historical prototype detail. Their original software-first examples are superseded by the user's education-first instruction and the update banners.

The tracker records progress; it does not override product requirements. Direct user instructions take precedence. Record material new decisions in the tracker, and update affected documents when needed.

## Product and development order

- First working prototype: educational topic and audience → AI script/storyboard → AI narration → timed captions → 2D teacher mouth cues and diagrams → MP4.
- The initial hydroelectric prototype and accepted solar/software samples already exist. Do not restart these completed tasks or make new provider requests merely because an older plan describes them as next steps. Both landscape and portrait remain V1 requirements.
- The local CLI and web Education generation are verified locally through W-16, including email sessions, owned drafts, queue and worker execution. Production deployment and release hardening remain unfinished; R2 is deferred from the first release. Continue the current small milestone in the tracker.
- The full product retains three generation modes, but the first recruiter-showcase release enables Education only. Software/Branding generation and Google sign-in are deferred for this release; preserve their existing forms/drafts and show Coming soon with a future-release explanation rather than promising the next deployment. See doc/EDUCATION-RELEASE.md.
- English only, 60–90-second output, 720p portrait/landscape at 30 fps. No background music, cinematic footage, billing, subscriptions, or voice cloning in V1.

## Technology constraints

- Application and worker code: TypeScript and Node.js.
- Web app: Next.js/React with Tailwind CSS.
- No Python scripts, services, environments, or Python-based lip-sync workflow.
- Non-Python native helpers invoked by Node.js are permitted. Validate Windows installation for Whisper.cpp, Rhubarb, and renderer dependencies before claiming they work.
- Gemini performs planning and primary TTS. ElevenLabs is the selected eligible free-tier narration fallback; no Kokoro.
- Use Remotion for animation/rendering, its caption utilities and local Whisper.cpp integration for timing, and Rhubarb for teacher mouth cues.
- Remotion displays timed mouth changes; it does not alone derive phoneme-accurate lip sync. Caption timestamps are not mouth-shape cues.
- Use validated structured scene data and allowlisted components. Never execute arbitrary LLM-written code, shell commands, HTML, or external URLs.

## Secrets, usage, and providers

- Root `.env` is private and ignored. `.env.example` contains placeholders/nonsecret configuration only.
- Load keys locally/server-side; never expose them in `NEXT_PUBLIC_` variables, browser bundles, chat, command output, logs, screenshots, or committed files.
- Check whether a key exists without printing its value. Sanitize provider failures and avoid dumping raw request/response bodies.
- Never activate paid billing, buy credits, raise credential access/usage limits, rotate/create credentials, or publish externally without applicable authorization.
- Current ElevenLabs key is restricted to TTS and voice/model reads, 1,000 credits per refresh period, with 30-day expiry from 23 October 2026. Do not silently expand it.
- Cache/reuse valid completed stages and narration. Keep prompts focused, requests bounded, and retry counts finite. Do not regenerate everything to verify a small change.
- A successful model/voice listing does not prove synthesis access, free quota, accent quality, or full video generation.
- Treat Sri Lankan English as a preference pending actual voice testing, not guaranteed support.
- Never route a safety refusal or invalid configuration through another provider to bypass the error. Stop clearly if no eligible free provider is available.

## Persistence and execution

- Prototype: filesystem JSON/checkpoints and media under ignored local run directories; no PostgreSQL or browser localStorage is needed initially.
- Approved deployment target (7 November 2026): hosted Supabase PostgreSQL for metadata/jobs, Supabase Auth for users and private Supabase Storage for binary media; Vercel web/light APIs and a separate worker. R2 is deferred for the showcase, superseding the 6 November target; Neon/Amazon RDS are not required. Retain the locally verified Storage integration and existing migrations/data. Hosted setup and verification are still required; no storage migration is authorized or needed by this decision.
- Vercel hosts the eventual web app/lightweight API; the creator's local worker performs heavy processing and rendering through outgoing connections.
- Preserve completed validated checkpoints across restarts. A provider/voice change invalidates narration and dependent timing/render data.
- Separate actual provider calls from mocks. Label sample/fixture outputs explicitly. Never present simulated speech, guessed timestamps, or a mock render as a successful live pipeline.
- Publish Ready only after verification; cancellation/deletion prevents late publication. Do not silently drop teacher animation, captions, or portrait support to make a test pass.

## Workflow and checks

- Inspect existing files and Git state before edits; preserve user work and configuration.
- Use the existing project layout as it evolves. Do not introduce the complete frontend or cloud infrastructure during a pipeline-only task without a task reason.
- Run checks relevant to the change. Add meaningful tests for timing, validation, provider failures, recovery, and security behavior as those capabilities are implemented.
- For document-only changes, verify links and consistency; no live provider requests are needed.
- For live tests, use small bounded inputs and record whether the result was live or mocked, the model/tool versions, quality, and limitations. Never log keys.
- Report what changed, what was actually checked, and what remains unverified. Avoid claiming work is complete based solely on a plan, configuration file, or dependency install.

## Education showcase release — 6 November 2026

- W-17 progress, W-18 recovery, W-19 cancellation, W-24D draft deletion and availability messaging are verified locally. W-20 private results and W-23 retained-video listing/reopening are verified locally. The W-24 private Storage-retention slice is verified locally; operate the private watcher as documented in doc/MEDIA-RETENTION.md. W-27 public landing/help/release content is verified locally. W-29 shared failures/accessibility is verified locally. Registered local-workspace lifecycle is verified locally; see doc/LOCAL-WORKSPACE-CLEANUP.md. Essential W-30 operational controls are verified locally; next is guided user-run W-31 deployment preparation and remaining R-05 checks in doc/EDUCATION-RELEASE.md. R-03/R-04 are Complete locally and R-02 R2 integration remains deferred; do not mark a parent milestone Complete from a partial slice. Full W-24 remains unfinished.
- Keep job state, ownership, quotas, leases and asset manifests in PostgreSQL; binary files live in private Supabase Storage. Keep provider/storage secrets server-side. The separate worker remains required and local availability must be disclosed. No Cloudflare credentials are needed for this release.
- Preserve private access, maximum 60-second media grants, seven-day successful-media retention, existing budgets, both orientations and 60/75/90-second options. No paid activation, hosted-worker purchase or deployment is authorized by documentation approval.
- Record hosted target architecture separately from locally verified behavior. Preserve accepted deletion/Coming soon evidence; a documentation or provider decision does not complete hosted setup, automatic retention cleanup or deployment. Verify per-file upload and separate storage/egress limits before release without increasing current budgets.

## Maintaining project progress

- Update `doc/PROJECT-TRACKER.md` after each substantive implementation milestone or material decision.
- Mark a feature Complete only when its stated acceptance evidence exists. Use In progress, Planned, or Blocked with a concrete reason otherwise.
- Keep a dated activity log, current milestone, validation evidence, unresolved technical dependencies, and exact next task.
- This file contains durable project guidance. Update it only when workflow, constraints, or settled decisions change; do not turn it into a transcript.
- Keep user-facing explanations concise and understandable to a general software engineer. Ask only when missing information blocks safe progress or would materially change scope.

## Implemented CLI references

- Read doc/PIPELINE-USAGE.md for working commands and doc/PROTOTYPE-FINDINGS.md for live versus mocked verification.
- Use npm run typecheck and npm test for code checks. npm run pipeline:verify fully decodes all three existing demo exports without AI calls.
- Demo aliases share local-runs/education-demo. Custom inputs require a new run ID. Explicit export commands rerender; script/audio/alignment/cue checkpoints are reused.
- Current planner is the verified gemini-3.5-flash-lite. Primary TTS remains Gemini; do not automatically switch to a more expensive model.

## Education visual direction

- User feedback supersedes the initial dark node-diagram presentation style: prefer light backgrounds, topic-specific illustrated environments and animated objects that demonstrate the narrated mechanism.
- Solar still previews and the subsequent live landscape sample were accepted; evidence is in doc/PROTOTYPE-FINDINGS.md. Preserve existing demos and reuse saved stages. Do not regenerate the sample unless a current task requires it, or claim the original hand-authored still previews came from live AI generation.
- Keep the accepted narration/caption/mouth-cue system. A solar-specific visual component does not establish support for arbitrary educational topics.

## Short software showcase exception

- User requested a 30–40-second Make My Marriage showcase from one supplied full-page mobile screenshot. This sample-specific duration supersedes the original 60–90-second baseline for this task only.
- Use actual screenshot crops and source-supported feature claims; fictional sample statistics are not real results. No teacher is needed for software videos. Do not imply that signup or authenticated workflows have been tested from this landing-page image.
- The screenshot region mapping is reviewed and specific to this sample; do not claim arbitrary software screenshots work without more implementation and testing.

## Application architecture phase — 24 October 2026

- Education and software samples are accepted by the user. Defer additional live branding generation to conserve API usage; all three modes and both orientations remain V1 scope and require later acceptance.
- Use doc/SYSTEM-ARCHITECTURE.md for application design. Distinguish documented architecture from implemented/tested features.
- Preserve existing full-track prototype commands/artifacts. The application follows the PRD's per-scene narration design and requires continuity/timing validation during migration.
- Private media links may have a maximum 60-second lifetime, explicitly approved by the user. Deletion hides results and blocks new access immediately; never promise recall of downloaded bytes.
- Authentication baseline revised: public email/password + Google sign-in; no invitations, SMTP, verification emails or self-service password-reset emails in V1 (explicit user approval). Do not reintroduce the old email-delivery gate.
## Approved design sequence — 24 October 2026

- The user approved SYSTEM-ARCHITECTURE.md and requested separate DATABASE-DESIGN.md and API-DESIGN.md. Use these detailed contracts together; design completion does not imply migrations or endpoints are implemented.
- The database/API review, UI review and reconciliation are complete as design work; implementation is now authorized. Follow the tracker for the current feature. A future design-only request does not itself authorize cloud provisioning.
- Preserve the PRD baseline and user-approved architecture. Record material design refinements in the tracker and ask only when they require a product/cost change.

## Authentication revision 1.1 — 24 October 2026

- Email/password registration has no email verification; disclose no automatic recovery for forgotten email-only passwords. Google recovers Google credentials, not arbitrary app accounts.
- No manual identity linking/unlinking or email changes in V1. Treat email addresses from password signup as self-declared; Supabase implicit confirmation is not mailbox proof. Verify provider automatic-linking/pre-registration collision behavior before public launch, including direct Auth calls.
- Preserve private user-ID ownership and all global/per-user generation limits with public signup. Method-aware fresh reauthentication protects sensitive actions.
- Read the latest dated revisions of PRD, SYSTEM-ARCHITECTURE, API-DESIGN and DATABASE-DESIGN; historical invitation/SMTP and R2-first-release requirements are superseded.

## Selected UI foundation — 24 October 2026

- User selected Forest & Ivory in Stitch. Follow doc/DESIGN-SYSTEM.md: warm ivory #F7F6F2, forest #235B4E, text #202722 and Manrope, flat restrained styling with generous whitespace.
- Main UI flows have been reviewed; see doc/UI-RECONCILIATION.md. Design previews remain fixtures, not functioning application screens or real generation evidence.
## Incremental application implementation — 26 October 2026

- User explicitly authorized the application scaffold and requested one small feature at a time. Maintain doc/PROJECT-TRACKER.md as the single progress source: status, evidence, remaining work and exact next task after every feature. Do not mark a screenshot or placeholder as a working feature.
- App code lives in apps/web; preserve existing root CLI commands and accepted media artifacts. Shared contracts and worker extraction follow incrementally.
- Desktop/mobile share all color tokens, including #F7F6F2 canvas. Breakpoints alter layout, not the palette. Reuse shell, forms, icons and dialogs.
- Run pipeline regression checks plus appropriate web lint/typecheck/build/browser checks. Local preview is unauthenticated scaffolding and must be labeled; never imply actual account/project/worker integration.
- No cloud deployment or live provider generation is included in scaffold authorization.

## Repository and web-tooling guidance

- The application repository root contains apps, src, scripts, test, examples and doc. Earlier ChatGPT delivery/staging folders outside this repository are not application dependencies; do not copy or publish them wholesale. See doc/REPOSITORY-CONTENTS.md.
- Commit source, tests, configuration, package-lock.json and useful documentation. Keep credentials, local-runs, node_modules, caches, builds and browser reports ignored. Never treat .gitignore alone as proof that a public release has been reviewed.
- Use Node 24 for web tooling (verified with 24.19.0); see doc/WEB-DEVELOPMENT.md. The older system Node 22.12 is below a lint dependency requirement.
- Web checks: npm run web:lint, npm run web:typecheck, npm run web:build and npm run web:test. Root npm run check combines pipeline checks and web lint/typecheck/build; browser tests are separate. Do not run dev and build concurrently against apps/web.
- Do not force dependency fixes that downgrade the accepted renderer. Track the known dependency advisories and tooling deprecation until compatible updates pass appropriate checks.

## Visual implementation fidelity

- The user reported that generic scaffold pages do not match Stitch. Read doc/UI-IMPLEMENTATION-AUDIT.md. Technical scaffold completion does not mean page designs are implemented or visually approved.
- W-01V implements the confirmed Dashboard desktop/mobile composition and the user accepted its compact refinement. The remaining three page references are recorded in doc/UI-PAGE-HANDOFF.md; user confirmation precedes their implementation with W-02 shared controls. Follow the confirmed Stitch reference structure and approved reconciliation for later pages; do not replace designed page content with generic foundation cards.
- Verify visual layout at comparable desktop/mobile widths as well as functional checks. Preserve desktop/mobile token parity and clearly identify fixture identity, projects and processing availability until backend integration.


## Shared abuse and metadata safeguards — 12 November 2026

- Use the implemented shared PostgreSQL auth limiter, not a process-local Map as the public-release control. Never trust arbitrary forwarded IP headers outside the configured Vercel boundary. Keep direct Supabase Auth/hosted verification as a release gate.
- Preserve the lower user-approved metadata/new-job/daily-AI bounds in doc/SECURITY-CONTROLS.md, exact ownership, global-first locking, dispatch receipts and conservative byte reservations. Do not increase credentials or allowances without authorization. A retry does not create a new job budget, and cached-only recovery must not require a new AI allowance.
- Preserve per-document nonces, private media origin restrictions and document replacement after confirmed auth actions. Native expiry and unsaved-edit handling remain separate.
- Keep Remotion package versions aligned and verify the targeted lint dependency override when updating. No automatic force-fix/downgrade or provider calls are needed to test a dependency patch.

## Linux worker preparation — 13 November 2026

- User approved Linux x86_64 Docker packaging, native-tool/offline render checks and resource measurement before remaining W-30. Follow doc/LINUX-WORKER.md; pipeline:tools remains Windows-only. ARM, hosted pairing, cloud/trial provisioning, billing and fresh AI calls are not authorized by packaging approval.
- Keep credentials/private media out of Docker build context and image layers. Use separate runtime read-only connection/provider-file mounts, preserve outbound HTTPS control and existing leases/checkpoints/limits. Report actual cgroup resource evidence separately from fresh live generation or hosted acceptance.

## Protected operator controls — 13 November 2026

- Essential W30 API/private CLI is Complete locally; follow doc/OPERATOR-CONTROLS.md. Advanced admin UI and broader credential/outcome administration remain deferred. The user will perform deployment; next is W31 runbook/preparation and hosted acceptance, not autonomous cloud activation.
- Never auto-promote real accounts or trust signup metadata for operator authority. Preserve early role rejection before global resource locks and locked rechecks. Keep internal operations private, user media owner-scoped, flags versioned, exact receipts bounded, and budget/fence/checkpoint history intact. Unknown provider outcomes require review, not a reset/refund.
- Operator CLI passwords belong only in a private owner-readable config, never arguments/logs/browser bundles/images. Use the documented TypeScript-enabled npm launcher, ephemeral cookies/CSRF and local-session signout. Do not treat local acceptance or stored provider counters as hosted sign-off/live provider balance.
