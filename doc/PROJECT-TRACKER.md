# AI Video Generator — project tracker

**Last updated:** 4 November 2026

**Current phase:** Local email signup/signin and persisted profile-name updates verified. Existing Education/Software pages remain UI previews; cloud generation is not connected.
**Current milestone:** W-05 email signup/signin and editable display name Complete (local). Next: W-06 Google login, callback and identity isolation, then W-07 session expiry/signout/protected routing. Branding UI remains Planned; Education/Software UI completion does not complete their backend features.
**Approved requirements:** [PRD](PRD.md)  
**Project instructions:** [AGENTS.md](../AGENTS.md)

This is the working record of completed features and remaining work. It distinguishes verified behavior from planned functionality. The initial local education CLI has produced a real 60-second MP4. The complete web application and remaining V1 work are not finished.

## 1. Status meanings

| Status | Meaning |
|---|---|
| Complete | The described deliverable exists and its evidence is recorded |
| In progress | Implementation has begun but acceptance checks are not finished |
| Planned | Agreed work has not yet been implemented |
| Blocked | A specific external dependency or decision prevents the task; name it |

The tasks below are intentionally not assigned a percentage. Documentation and credential setup do not establish completion of AI generation or rendering.

## Application implementation board — maintained after every feature

This is the single progress source. Visual approval and implementation completion are separate. Complete means the stated acceptance checks passed; In progress means work started; Planned means not started; Blocked requires a specific dependency. Keep historical pipeline evidence below. No percentage is inferred from mockups.

| ID | Small feature / milestone | Status | Completion evidence / dependency |
|---|---|---|---|
| W-00 | Requirements, UI review and contract reconciliation | Complete — design only | PRD, approved screenshots, UI-RECONCILIATION.md |
| W-01 | Next.js workspace, shared palette/font and shell preview | Complete | Web lint/typecheck/build passed; six desktop/mobile browser checks passed; 18 pipeline tests passed. Local preview only. |
| W-01V | Dashboard desktop/mobile and shared-shell visual alignment | Complete — user accepted compact refinement | Confirmed Stitch layout, original static SVG illustrations, responsive cards/chrome; screenshots reviewed; eight browser checks and production build passed. Sample data only. |
| W-01P | Create video/My videos/Settings visual layouts | Complete — visual previews; user review pending | Stitch-based selection/library/settings layouts, desktop/mobile screenshots, 16 Chrome checks, production build; sample data only. Mode form UI slices are tracked separately in W-10U/W-12U; backend remains planned. |
| W-02 | Shared buttons, fields, status/error messages and accessible dialogs | Complete — shared UI foundation | Stitch-based text/textarea/select/password/checkbox/radio fields; associated hints/errors; pending/disabled buttons; status/notice/retry components; Settings integration. 26 desktop/mobile browser checks, lint/typecheck/build and 18 pipeline tests passed. Loading/retry verified with explicitly local simulations; real backend operations remain Planned. |
| W-03 | Browser-safe shared input/auth/job contracts | Complete | Pure Zod schemas and inferred types for all three modes; strict draft/complete input, preferences/acknowledgments, auth requests and safe user/job/error DTOs; current previews consume shared rules. Generated OpenAPI 3.1 component catalog/freshness check. 16 new contract + 18 pipeline tests and 44 desktop/mobile browser checks passed; lint/typecheck/isolated production build passed. No backend/auth/DB implementation. |
| W-04 | Supabase local schema, migrations and ownership policies | Complete — local foundation | Ten migrations / 33 RLS tables; 134 pgTAP assertions, concurrency checks (including held-open validation vs scene move) and 38 DB/Zod OAuth return-path comparisons passed. Initial seven-file fresh/incremental dumps match; eighth/ninth forward repairs applied without reset. Immutable scene-plan membership and restricted terminal plan purge; generated DB types/freshness verified. Localhost-only Docker services, private buckets, pgAdmin guide. Auth/API/queue/actual media integration remain later features. |
| W-05 | Email signup/signin and editable display name | Complete — local | Stitch-based auth screens; real Supabase SDK cookie sessions/verified user; active-profile RLS and version-checked name RPC; exact Origin + finite session-bound CSRF; generic failures and 12–128-character passwords. Desktop/mobile real signup/signin, persistence, conflicts and isolation verified. 37 Node tests, 50 browser cases covered including corrected-case reruns, lint/root/web types, contract freshness and production build passed. Google/explicit signout/expiry remain W-06/W-07. |
| W-06 | Google login, callback and identity isolation | Planned | Same-account rules, direct Auth collision tests, cancellation/errors |
| W-07 | Session expiry, signout and protected routing | Planned | Safe return paths; no mutation replay; durable jobs continue |
| W-08 | Dashboard with real project/usage/worker data | Planned | No fixture presented as real state; correct capacity/reservations |
| W-09 | Draft creation/edit/save and mode selection | Planned | Optimistic versions, incomplete draft save, explicit Generate only |
| W-10 | Education form | In progress — UI complete | W-10U verified; real capabilities/voice playback, authenticated draft save and generation integration remain Planned. |
| W-10U | Education input-form desktop/mobile UI | Complete — UI only | Live Stitch references; required topic/audience/intended use, optional objective/notes, duration/orientation/Kore/English, unchecked acknowledgments and retention. 34 desktop/mobile browser checks, web lint/typecheck/build and 18 pipeline tests passed. Page-local input only; real save/playback/generation disabled and explained. |
| W-11 | Private media upload/retry/remove | Planned | Actual media limits, partial uploads, owned access and shared-source safety |
| W-12 | Software showcase form | In progress — UI complete | W-12U verified; real private upload/media validation, draft save, voice playback and generation integration remain Planned. |
| W-12U | Software showcase desktop/mobile form UI | Complete — UI only | Live Stitch references; blank name/description/features, shared 4,000-character budget, Intended use, empty upload area with limits/privacy notice, shared settings and unchecked acknowledgments. 42 desktop/mobile browser checks, web lint/typecheck/isolated production build and 18 pipeline tests passed. No actual file selection/upload/save/generation. |
| W-13 | Product branding form | Planned | Required product image/name; optional description/brand details |
| W-14 | Durable generation queue and atomic capacity reservations | Planned | Idempotency, one active job/user, three retained outputs, race tests |
| W-15 | Local worker adapter, leases and heartbeats | Planned | Outbound-only assignment, checkpoint reuse, stale lease fencing; preserve CLI |
| W-16 | Education generation end to end | Planned | Real owned request to verified result; both orientations; no manual pipeline approvals |
| W-17 | Four-stage progress, offline and provider waiting | Planned | Server states, known retry times only, refresh/reconnect |
| W-18 | Needs-input, failed-job retry and bounded recovery | Planned | Correct new revision vs same-job retry; no reset of budgets |
| W-19 | Cancel confirmation, stopping and cancelled | Planned | Worker acknowledgment and no late publication |
| W-20 | Result player and MP4/SRT/VTT downloads | Planned | Private expiring URLs, captions toggle, actual attribution and Ready verification |
| W-21 | Revisions, regenerate and alternate orientation | Planned | Old expiry preserved, separate output slot, valid source reuse |
| W-22 | Captioned MP4 export and its wait/failure/ready states | Planned | No new AI, extra bytes/no extra slot, unchanged expiry |
| W-23 | My videos, drafts, empty and expired states | Planned | Safe owned summaries and correct library/slot counts |
| W-24 | Delete draft/version and retention cleanup | Planned | Shared assets preserved; active export cancellation; tombstones and cleanup races |
| W-25 | Settings profile and password change | Planned | Name-only save; current password verification; Google-only variant |
| W-26 | Account deletion and fresh reauthentication | Planned | Password/Google proof, explicit Delete, 202 request receipt, eventual purge |
| W-27 | Public landing page and unavailable/access-help states | Planned | Approved responsive screens, actual authorized sample, no private data |
| W-28 | Software and branding generation adapters | Planned | Generic source-grounded automation, recordings, product visuals; six-mode/orientation release set |
| W-29 | Shared failures, conflict handling and accessibility pass | Planned | Network/save/delete errors, grant expiry, narrow/short viewport and keyboard checks |
| W-30 | Operator health/repair and global usage controls | Planned | Protected operational tooling, sanitized errors, no blanket private-media access |
| W-31 | Release content, security and deployment | Planned | Real policy/contact destinations, auth isolation, retention/security tests, explicit deployment authorization |

**Update rule:** On every feature, record the date, what changed, checks actually run, known limitations and exact next feature. Update both this board and the relevant legacy milestone below. A scaffold page never completes a product feature.

## 2. Completed foundation

| ID | Deliverable | Status | Evidence and limits |
|---|---|---|---|
| F-01 | Approved PRD | Complete | `doc/PRD.md`, approved V1 baseline |
| F-02 | Initial architecture | Complete | `doc/INITIAL-ARCHITECTURE.md`; design only, not tested implementation |
| F-03 | Prototype plan | Complete | `doc/PIPELINE-PROTOTYPE-PLAN.md`; order amended to education first |
| F-04 | Plain-language explanation | Complete | `doc/START-HERE.md` |
| F-05 | Local project and setup entry points | Complete | Root `package.json`, `README.md`, `scripts/check-setup.mjs` |
| F-06 | Private environment configuration | Complete | Ignored root `.env`, shareable `.env.example`; no secrets recorded here |
| F-07 | Gemini authentication/model discovery | Complete | Read-only listing accepted the key and listed configured planner/TTS models; generation subsequently verified in M1/M2 |
| F-08 | ElevenLabs fallback configuration | Complete | Restricted approved key, configured Alice voice and model |
| F-09 | Short ElevenLabs speech test | Complete | Live test returned audio and 43 character timing entries; not a full narration or video test |
| F-10 | Git secret exclusion | Complete | `git check-ignore .env` succeeded; `.env` absent from untracked output |
| F-11 | Local setup instructions | Complete | `doc/LOCAL-SETUP.md` records commands, current results and limitations |
| F-12 | Agent guidance and progress tracking | Complete | Root `AGENTS.md` and this tracker created; maintain as development proceeds |

## 3. Milestones and order

| Milestone | Outcome | Status | Done when |
|---|---|---|---|
| M0 | Requirements, design, configuration | Complete | Foundation evidence above exists |
| M1 | Topic → validated educational script/storyboard | Complete | Real Gemini response is parsed, validated, saved locally, and inspected for a coherent 60-second explanation |
| M2 | Narration and caption timing | Complete | Real Gemini speech works; fallback behavior is tested; measured audio and valid synchronized captions exist |
| M3 | Teacher, diagrams, video render | Complete | Mouth cues drive a reusable 2D teacher; a valid narrated educational MP4 is produced |
| M4 | Pipeline quality and recovery | In progress | Landscape/portrait, duration, captions, source consistency, bounded retries, resume and cancellation satisfy the prototype checks |
| M5 | Detailed application architecture | Complete (documented design) | doc/SYSTEM-ARCHITECTURE.md covers schema, API contracts, auth, queue, storage, deployment and PRD traceability; implementation/testing remain |
| M6 | Full web application and cloud integration | In progress — scaffold, contracts and local DB | Landing/auth/dashboard/input/progress/library work with Supabase and local worker |
| M7 | Remaining video modes and private release | Planned | Software and branding work; all three modes/orientations and release checks pass; Vercel deployment verified |

## 4. Video-pipeline feature backlog

| ID | Feature | Status | Acceptance evidence needed |
|---|---|---|---|
| P-01 | TypeScript worker/CLI foundation | Complete | Executable local entry point and type checking |
| P-02 | Environment/media dependency doctor | Complete | Check actual native/render dependencies without exposing keys; current setup script only checks configuration/providers |
| P-03 | Topic/audience/preferences validation | Complete | Reject invalid lengths, duration, language and format; save immutable valid input |
| P-04 | Gemini educational planning adapter | Complete | Live topic produces narration, scene order, on-screen text and supported diagram/teacher instructions |
| P-05 | Runtime storyboard schema | Complete | Validate model JSON and bound supported layouts/text/parameters; malformed responses repaired or rejected |
| P-06 | Content-quality checks | In progress | Coherent age-appropriate explanation; unsupported details flagged; self-review not marketed as fact verification |
| P-07 | Local artifacts/checkpoints/events | Complete | Stage output saved safely, resumable and excluded from Git |
| P-08 | Gemini narration | Complete | Actual speech synthesis tested, audio decodes, matches script and has measured duration |
| P-09 | ElevenLabs automatic fallback | In progress | Qualifying failure triggers configured eligible fallback; complete voice track stays consistent |
| P-10 | Male/female voice previews | Planned | Audition real available voices using bounded cached samples |
| P-11 | Sri Lankan English suitability | Planned investigation | Listen to regional options and local names; no guaranteed accent commitment |
| P-12 | Remotion/Whisper.cpp transcription | Complete | No-Python local installation and actual timing output validated on Windows |
| P-13 | Caption normalization/export | Complete | Valid word/group intervals, actual-speech match, readable SRT/VTT and correct scene offsets |
| P-14 | Rhubarb mouth cues | Complete | Non-Python executable yields valid cues and rests during silence |
| P-15 | Reusable 2D teacher | Complete | Mouth shapes, gestures and expressions render consistently using timing data |
| P-16 | Educational diagram library | In progress | Supported diagrams accurately convey the initial topic with labels/arrows/steps |
| P-17 | Measured frame timeline | Complete | Actual audio drives 30-fps scenes; no clipped words or cumulative timing drift |
| P-18 | Remotion MP4 renderer | Complete | Decodable educational output with intended visual/audio streams |
| P-19 | Portrait and landscape layouts | Complete | 720×1280 and 1280×720; safe text/caption/teacher placement |
| P-20 | Preview/export caption variants | Complete | Clean video plus timed captions; requested burned-in export verified |
| P-21 | Duration and output verification | In progress | Final 60–90 seconds and chosen-target tolerance; inspect playback and representative frames |
| P-22 | Retry/resume/cancel/invalidation | In progress | Demonstrate restart recovery, bounded calls, voice-change invalidation and no cancelled publication |
| P-23 | Findings and benchmarks | Complete | Record live vs mock runs, versions, elapsed time, output size, memory where measurable and limitations |

## 5. Application backlog after pipeline validation

| ID | Feature | Status |
|---|---|---|
| A-01 | Detailed database/API/worker architecture | Complete — architecture approved; separate API/DB design deliverables created for review; implementation pending |
| A-02 | Next.js/TypeScript/Tailwind application foundation | Complete — W-01 verified; product features remain planned |
| A-03 | Landing page and real example videos | Planned |
| A-04 | Public email/password and Google sign-in, sessions and method-aware reauthentication | Planned — design updated |
| A-05 | Verification/reset email delivery | Removed from V1 by explicit user decision; no SMTP dependency |
| A-06 | Dashboard, project list, drafts and settings | Planned |
| A-07 | Adaptive creation forms and private uploads | Planned |
| A-08 | Supabase PostgreSQL records and ownership policies | Complete — local schema/policies verified in W-04; hosted deployment and API integration remain planned |
| A-09 | Private Supabase Storage and scoped access | In progress — private buckets/exact allocation RLS verified; actual uploads, decoding and signed-read API remain W-11/W-20 |
| A-10 | Durable jobs, worker claims, heartbeat and progress | Planned |
| A-11 | Video preview/download, revision and regeneration | Planned |
| A-12 | Retention, deletion, storage/usage reservations and caps | Planned |
| A-13 | Software screenshot/recording understanding and layouts | In progress — one reviewed landing-page screenshot sample verified; general uploads/recordings remain |
| A-14 | Product branding inputs and animation layouts | Planned |
| A-15 | Accessibility, error handling and operator controls | Planned |
| A-16 | Vercel deployment and secure local-worker connection | Planned |
| A-17 | Ownership, privacy, quota, recovery and three-mode release tests | Planned |

## 6. Current limitations and dependencies

- A real local education video now exists. TypeScript orchestration, local artifacts, Gemini narration, Whisper captions, Rhubarb cues, original vector teacher and Remotion rendering have been exercised. Web visual previews and shared controls are implemented; real account/data integration and deployment remain unimplemented.
- Live script generation passed with gemini-3.5-flash-lite; live narration passed with gemini-3.8-flash-tts/Kore. The larger planner returned timeouts/HTTP 503 and was replaced by the verified smaller configurable planner.
- The fallback voice is Alice, a British English female voice. Full solar narration succeeded and the user accepted the sample; Sri Lankan English suitability remains unverified.
- The fallback key expires 30 days after 23 October 2026 and is capped at 1,000 credits per refresh period. Do not silently renew, expand or purchase credits.
- Whisper.cpp 1.6.0/base.en, Rhubarb 1.14.0, FFmpeg/FFprobe and installed Chrome rendering are available and exercised on Windows. No Python is used.
- Full-application Google OAuth, Supabase configuration and hosting setup are future verification tasks; they do not block the first local script-generation milestone.
- Free API quotas may temporarily stop live tests. Preserve valid outputs and report the limit rather than switch to paid access.

## 7. Remaining validation: M4 (deferred alongside application work)

The M1 planning slice below is complete. The user accepted the education/software samples and requested full application architecture next. Caption-boundary/lip-sync measurements, 75/90-second options and reliability checks remain release tasks, not a reason to generate more videos now. The following list records the implemented first slice:

1. Establish the TypeScript worker entry point and runtime input/storyboard schemas.
2. Accept topic, audience, English language, target duration and aspect ratio.
3. Call Gemini to create one structured educational script/storyboard using supported scene types.
4. Validate the response and save input, storyboard, events and a result report under an ignored local run folder.
5. Add meaningful invalid-input/malformed-response tests and execute one bounded live test if free quota allows.

**Initial sample:** “How a hydroelectric power station generates electricity,” for beginners, 60 seconds, landscape. M1 produced inspectable JSON/script; M2 and M3 have now also produced real narration, captions, teacher cues, diagrams and an MP4. Remaining quality/reliability work is recorded in M4. These are implementation milestones, not mandatory user approvals between the final app's four automatic stages.

## 8. Validation ledger

| Check | Most recent recorded result | What it does not establish |
|---|---|---|
| `npm run setup:providers` | Passed authentication/model/selected-voice checks on 23 October 2026 | Synthesis quota, regional accent or rendered video quality |
| Short ElevenLabs synthesis | Passed; audio and 43 character timing entries returned | Full Gemini-to-MP4 pipeline or production fallback logic |
| Setup script syntax | `node --check` passed during setup | TypeScript pipeline correctness |
| Secret exclusion | `.env` ignored by Git | Full application security |
| Document links | Original guide/architecture links checked; Desktop PRD-relative links adjusted during setup | Application functionality |

Do not replace recorded history with a claim of a fresh live check unless the command was actually rerun. Add evidence after implementation rather than checking backlog items based on design alone.

## 9. Activity and decisions

| Date | Change |
|---|---|
| 23 October 2026 | PRD finalized; Next.js/TypeScript/Node.js/Tailwind, no Python, no music, Supabase storage/auth/metadata and Vercel web hosting agreed |
| 23 October 2026 | Initial architecture, prototype plan and plain-language guide created |
| 23 October 2026 | Working project moved to Desktop `ai-video-generator` with `doc` documentation folder |
| 23 October 2026 | User changed first prototype from software to topic-based education; other two modes remain in V1 |
| 23 October 2026 | Gemini environment configured, restricted ElevenLabs fallback key approved/created, voice selected and short synthesis verified |
| 23 October 2026 | User requested maintained agent instructions and feature tracking; `AGENTS.md` and this tracker added |

## 10. How to maintain this file

- Update it when substantive work or decisions change project status.
- Record evidence with Complete; name remaining checks with In progress.
- Keep one clear current milestone and next task.
- Keep credentials, raw provider data and personal source material out of the tracker.
- Preserve scope changes in the decision log and update the relevant requirements/design documents when needed.

## Latest implementation evidence — 23 October 2026

- See [prototype findings](PROTOTYPE-FINDINGS.md) and [usage](PIPELINE-USAGE.md) for current results and limitations.
- Live demo: 4 scenes, 107 spoken words, 52.08 seconds of Gemini audio in a 60.011-second landscape MP4, 100% normalized transcript word coverage, 308 teacher mouth cues.
- Type checking and 12 automated tests passed. HTTP fallback tests are mocked; the earlier short ElevenLabs synthesis was live. Caption boundary accuracy and subjective lip-sync quality remain unmeasured.
- Landscape-captioned, portrait-captioned and landscape-clean exports all passed full decoding, 30-fps, dimensions, audio-stream and duration checks; see local-runs/education-demo/verification.json. Real output frames were inspected, including the clean export without captions.

- Final export checks: all three real MP4s passed full decoding and stream verification. Remaining M4 work includes additional topics/durations, detailed caption/lip-sync quality, forced interruption/cancellation testing and stronger artifact recovery. No frontend, Supabase integration or deployment has been implemented.

## Visual direction update — 23 October 2026

The user accepted the sample voice, captions, lip syncing and video quality, but requested illustrative objects in a natural scene instead of presentation-like slides, with light backgrounds. Prioritize a solar-energy scene prototype before software or branding. See [solar storyboard](SOLAR-VISUAL-STORYBOARD.md). Hand-authored storyboard and reusable SVG/Remotion preview component added; live pipeline integration and synchronized video remain pending. Next: inspect five still previews and obtain visual feedback before generating speech or MP4. No provider calls are authorized as part of the still-preview step.

### Solar preview evidence

- Complete: four 1280×720 landscape PNGs and one 720×1280 portrait PNG rendered locally using Remotion; representative landscape/portrait frames visually inspected and clipping/label overlap corrected.
- TypeScript checking passed after the final code changes. No AI provider calls, audio synthesis, or MP4 renders were performed in this preview task.
- See `local-runs/solar-visual-preview/preview-report.json` and the gallery in `doc/SOLAR-VISUAL-STORYBOARD.md`.
- Still in progress: visual acceptance, integration with AI scene planning, actual timed motion, narration-driven close-ups, captions and mouth cues for the new solar visuals. Stills do not prove motion or sync quality. The earlier live demo is preserved.
### Solar video implementation — in progress

The user approved the still-preview visual direction and authorized generation. Added an explicit solar-energy input style, four allowlisted visual values, runtime scene-order validation, a solar renderer using actual scene/caption/mouth timings, subtle camera movement and live power-flow/appliance animation. Existing diagram demos remain compatible. Type checking and 14 tests passed before live generation. One transient planner connection failure was followed by a successful bounded retry; the cached Gemini plan has four scenes. One wording correction was recorded in the run before TTS. Narration/render verification is in progress; no completed solar MP4 is claimed yet.

### Completed solar landscape video — 23 October 2026

- Real output: local-runs/solar-demo/landscape-captioned.mp4, 60.011 seconds, 1280×720, 30 fps, 5,069,736 bytes. Final MP4 fully decoded; six extracted scene frames inspected, including panel emphasis, captions and the final evening/rest state.
- Four validated solar scene instructions and 111 words from Gemini planning, with a recorded wording qualification before speech. Primary Gemini speech first hit the 120-second response download timeout; its next unavailability routed to the configured ElevenLabs Flash v2.5/Alice fallback. One complete 51.919813-second narration track was saved; caption timing comes from provider character alignment with normalized word coverage 1.0; 301 Rhubarb mouth cues were generated from actual audio.
- Caption-timed evening transition stops sunlight/power markers and switches appliances off while the lesson explains nighttime solar limits. A final silent visual recap extends the 51.92-second voice to the 60-second target; teacher rests after speech.
- Final correction rerender reused the existing timeline/audio/captions/cues with no AI calls. All 15 tests and TypeScript checking passed. HTTP failure-routing tests use mocks; this solar run exercised live fallback.
- Reproducible commands: npm run pipeline:solar; npm run pipeline:solar:verify. The original education demo remains preserved. Solar portrait has still-layout evidence only; no new portrait MP4 was produced.
- Next: user playback review of this solar video. Solar-specific visuals do not establish generic topic rendering, other two video modes, full app readiness or measured human lip-sync/caption-boundary accuracy.

## Make My Marriage software showcase — in progress

The user supplied a 1320×16384 mobile landing-page screenshot and requested 30–40 seconds. This sample-specific duration is an explicit exception to the baseline 60–90 seconds. The page describes a wedding-planning workspace, not matchmaking. Reviewed screenshot regions cover the hero, multi-event/task/budget planning, guests/RSVP/documents, and bride/groom/joint collaboration. Sample names and metrics are labeled illustrative. Four reviewed crops are provided to Gemini only after explicit user approval for the image upload and script narration. Initial automatic approval review blocked the upload; nothing was sent by that rejected action, and the user then explicitly approved it. One later Gemini connection failure is recorded; bounded recovery is in progress.

Added a separate short-showcase schema/renderer/CLI with exact source-quote validation, measured speech/caption timing, image scrolling and no teacher. Existing education constraints remain unchanged. Type checking and 17 tests passed before the live run. This mapping is specific to the supplied screenshot; no arbitrary screenshot support, signup functionality test, or complete software pipeline acceptance is claimed yet.

### Software showcase evidence — 23 October 2026

- Complete sample: local-runs/marriage-showcase/landscape-captioned.mp4, 35.52 seconds, 1280×720, 30 fps, 4,336,016 bytes; full decode passed and five real scene frames inspected. Final SHA-256 is recorded in verification.json.
- Four screenshot crops were analyzed by Gemini after explicit upload/narration permission. After one connection failure and invalid draft lengths/evidence, the retained Gemini draft was locally reviewed/shortened to 76 words; this includes editorial intervention and is not evidence of fully autonomous arbitrary screenshot planning.
- One complete 34.8-second Gemini TTS/Kore voice track was generated; ElevenLabs was not used. Local Whisper.cpp supplied timing. One reviewed bride-or-groom homophone correction preserved its measured interval; raw recognition remains saved. Normalized script/caption coverage is 1.0 after that correction (raw 0.973684). No tempo change was needed.
- Final caption correction reused the saved plan, speech and alignment; console confirmed all three stages reused. No extra AI requests for the correction render. The cached resume/render/verification took 143.287 seconds; this excludes initial AI calls, development and prior failed attempts.
- Type checking and all 18 tests passed. .env, screenshot crops and generated audio/video remain ignored by Git. No teacher, music, portrait export, live signup test or invented application screens were added.
- Guide: [software showcase](SOFTWARE-SHOWCASE.md). Next: user playback review; then one branding example with supplied product images and verified benefits. General software input handling, recordings, automatic region selection, full application architecture, UI, Supabase and Vercel integration remain unfinished.

## Accepted samples and application architecture — 24 October 2026

- User accepted education and Make My Marriage software output and explicitly deferred an additional branding demo to conserve API usage. All three modes remain V1 scope; generic automation and the six mode/orientation release combinations are not yet validated.
- Created [system architecture](SYSTEM-ARCHITECTURE.md): modular Next.js web/Node worker boundaries, shared contracts, per-scene narration migration, Postgres queue and fencing, database entities/constraints/RLS, API inventory, private uploads, retention/reservations, auth, failure recovery, deployment and PRD acceptance mapping.
- User approved a maximum 60-second lifetime for previously issued media URLs after deletion. App visibility/new access stops immediately; previously downloaded bytes cannot be recalled. Recorded this clarification in the PRD.
- User deferred SMTP provider selection; confirmation/recovery delivery remains a prerequisite for tester onboarding. No provider or account was provisioned.
- Architecture is design completion only. M4 remains in progress, and web/database/worker integration remains planned. Historical entries above describe their original state, superseded by this current decision record.
- Documentation-only work: reviewed PRD and existing findings/source configuration, checked official platform documentation and local links/requirement coverage. No AI generation, TTS, MP4 render, dependency install, database migration or deployment was performed.
- Exact next task: create the application workspace and shared contracts without breaking existing CLI examples; use fixtures for the first web flow, then implement reviewed SQL migrations/RLS and two-user ownership tests.
## Separate API and database design — 24 October 2026

- User explicitly approved the system architecture and chose this order: database/API design, Google Stitch UI, reconciliation, then implementation. This supersedes earlier recommendations to scaffold the application immediately after architecture.
- Created [database design](DATABASE-DESIGN.md): typed table dictionary, relationship diagram, composite ownership constraints, job/revision/asset/export/invitation/cleanup states, index plan, RLS/grants, short transactions and consistent lock ordering, accounting, retention, and ordered schema migration/rollback strategy.
- Created [API design](API-DESIGN.md): authentication/session/recovery/reauth flows, strict input/DTO contracts, endpoint requests and responses, errors/idempotency/pagination, user/operator/worker surfaces, leases/heartbeats, provider attempt accounting, artifact transfer, publication, deletion and contract tests.
- Detailed refinements include versioned plans for bounded correction, clean/burned export records, repair/replay records, exact upload allocation identity, and server-side Storage cleanup without giving the worker privileged storage credentials. These refine architecture internals without changing the agreed product scope.
- SMTP selection remains deferred. Supabase/Vercel account limits, actual RLS/storage permissions and migration execution remain future implementation verification tasks.
- Documentation checks cover local links, code-fence balance, JSON examples, functional PRD IDs and consistency of shared state/limits. No API, database, migrations, UI, credentials, provider synthesis or deployment was implemented/executed in this task.
- Next: user reviews both designs; then prepare Google Stitch screen/design brief when instructed. Reconcile approved UI actions against the API/DB before application coding.

## Authentication revision 1.1 — 24 October 2026

- User accepted the other designs and requested public email/password plus Google sign-in, no invitations and no SMTP. After clarification, explicitly approved no email verification or self-service password-reset emails in V1. Email-only forgotten passwords have no automatic recovery; no implicit Google-based recovery promise.
- Updated PRD, architecture, API and DB active sections, authentication acceptance criteria, routes/DTOs, identity/reauthentication tables, migration/index plan and tests. Earlier invitation/SMTP entries above are historical and superseded.
- No invitation table, token, index, endpoints or invite gate in the new baseline. Google callback/reauth flows and protected ordinary-role profile creation replace enrollment logic. Signed-in password change requires current password; no password setup for Google-only identities.
- Provider automatic identity linking with unverified local email is an explicit release verification gate; no account merging or ownership transfer by matching email text. Public access remains quota-limited and private by user ID.
- Documentation only: no live Auth setting, OAuth credential, migration, application code or generation request changed. Next: Google Stitch UI brief/design, then reconcile before implementation.

## UI visual-direction exploration — 24 October 2026

- User requested simple, elegant, distinctive UI with restrained color and minimal gradients, and asked to access Google Stitch before selecting a fixed palette.
- Connected Stitch access verified. Created separate private project AI Video Studio — Visual Directions (11898319746861427028), preserving the Make My Marriage project.
- Created one AI-generated comparison board for Forest & Ivory (Manrope), Ink & Mist (Plus Jakarta Sans), and Plum & Stone (DM Sans). Forest & Ivory is recommended, not selected. No application theme is finalized or applied across pages.
- Recorded proposed hex tokens, spacing, corner radii, typography, semantic states and calculated text/button contrast in doc/UI-VISUAL-DIRECTIONS.md. These calculations are token checks, not full accessibility certification.
- Visual inspection found an invented 1080p output label and an overlapping input annotation; requested a focused correction to 720p and uncluttered inputs, also removing an unrequested keyboard-submit hint.
- Next: user chooses a visual direction, then save its design-system tokens and design dashboard/feature screens incrementally. Existing PRD, API/DB and authentication scope remain unchanged. No video-generation or narration request was made; Stitch design generation is a separate operation.
- Final corrected board inspected: screen 6aba4e5151c749cca63d86f854cd73d8 in project 11898319746861427028. All specimens now show 720p, topic inputs are clear, and the unrequested keyboard hint is removed. Palette selection remains pending.

## Dashboard and selected visual foundation — 24 October 2026

- User selected the recommended Forest & Ivory palette and requested dashboard/visual foundation only, with a calm, uncluttered hierarchy. Other UI feature pages wait until this feature is reviewed/finalized.
- Created and applied the Forest & Ivory design-system asset assets/3283859971905571040 in existing private Stitch project 11898319746861427028. Palette: #F7F6F2 canvas, #235B4E primary, #202722 text; Manrope typography, flat fills, restrained components.
- Added doc/DESIGN-SYSTEM.md and doc/UI-DASHBOARD.md with tokens, visual rules, desktop hierarchy, fictional data, UI-to-API mapping and pending responsive/empty/state follow-ups.
- Dashboard generation requested for three mode tiles, two recent-project examples, compact availability and 1-of-3 retained-output notice; draft example does not consume output capacity. UI examples are not new videos or backend records.
- No creation form, auth screen, result page, implementation, database migration, deployment or video-generation API call is part of this task. Final desktop screen inspection/identifier is recorded below when available.
- Final dashboard draft generated and visually inspected: b32301ed129c4bc798ebd747119ae9af (project 11898319746861427028). Focused cleanup removed out-of-scope notification/help icons, theme-name subtitle and repeated capacity notes. Mode options and recent-project status/actions remain clear; fictional 720p metadata and retained-slot count are consistent. Design-note links checked. User desktop review pending; no further feature screens generated.

## UI review and contract reconciliation — 25 October 2026

- User reviewed desktop/mobile dashboard, three adaptive forms, shared generation/wait/failure/cancel/results, caption export states, library/empty/expired/delete variants, authentication/help/errors, Settings/security/deletion, session-expired/unavailable and landing screens through manual Stitch screenshot review. These are visual approvals, not implemented/tested web features. Latest manual screen IDs/source exports were not captured; do not imply old automated Stitch IDs are these approved outputs.
- Created [UI reconciliation](UI-RECONCILIATION.md): screen-action-data traceability, discrepancies, implementation defaults, remaining UI component states and verification gates.
- Updated PRD/API/DB/architecture/visual foundation: full-name mapping (already present), mode input preservation, draft-only removal, safe library summaries, account-deletion request semantics, intended-use control and shared shells. No new generation mode, paid dependency or changed retention.
- Important corrections for implementation: show Account deletion requested after 202; expose intended use; keep product description optional; disclose limits/actual fallback voice and restrictions. Minor screenshot asset/token drift will be fixed centrally in code.
- Auth identity collision and Google fresh same-account proof remain release gates, not solved by mockups. Public landing privacy/source terms/contact and genuine authorized samples remain release content work.
- Validation: checked document links/contract anchors and changes against the approved flow; no migration, endpoint, UI, OAuth config, live AI call or deployment performed. Existing tests were not rerun for documentation-only work.
- Next: user reviews reconciliation findings; implement shared contracts and minimal web foundation incrementally, retaining existing CLI commands and demo artifacts. Use [reconciliation](UI-RECONCILIATION.md) as acceptance checklist; no need to generate every minor error state separately in Stitch.

## Color consistency confirmed — 26 October 2026

- User confirmed the approved desktop background and corresponding colors must apply identically on mobile. Recorded exact token parity in DESIGN-SYSTEM.md section 8; mobile mint-tinted screenshots are not the implementation color reference.
- No new design round required. Next implementation milestone remains shared contracts/web foundation and reusable shell/components, followed by backend/auth/storage integration and the education flow. Preserve existing CLI pipeline and accepted artifacts.
- This update changes documentation only; it does not establish a running website or authorize deployment/provider generation.
## W-01 scaffold started — 26 October 2026

- User authorized small feature-by-feature implementation and continuous status updates. W-00 through W-31 above are the application implementation checklist.
- Baseline before changes: root TypeScript check passed and all 18 pipeline tests passed (provider tests mocked; no live AI).
- Added apps/web workspace, approved shared tokens/local Manrope, responsive shell and explicitly labeled development-preview routes. Product features remain Planned.
- Read-only Stitch inventory captured 80 screens plus desktop/mobile dashboard HTML references; generated HTML is reference-only and is not executed or copied as app logic.
- Dependency/browser/build verification pending. No Supabase configuration, provider generation or deployment.

## W-01 scaffold completed — 26 October 2026

- Implemented apps/web (Next.js/React/TypeScript/Tailwind) with shared Forest & Ivory tokens and locally served Manrope. Desktop sidebar and mobile bottom navigation share routes/icons; both use #F7F6F2 canvas. Preview routes are explicitly labeled and contain no actual account/project data.
- Preserved root pipeline commands, React 19.3.1 and Remotion 4.0.538. No live AI, Supabase configuration, provider-key reads, cloud provisioning or deployment.
- Validation: pipeline TypeScript and all 18 tests passed; web lint (zero warnings), typecheck and production build passed. All six Chrome desktop/mobile browser tests passed: route navigation, palette parity, keyboard skip link, missing-page recovery, minimum navigation target size and 320px mobile touch navigation. Desktop/mobile screenshots visually reviewed. Removed the development indicator that overlapped mobile navigation.
- Runtime: verified using the available Node 24.19.0 runtime; system Node 22.12 is below a lint dependency's engine requirement. See WEB-DEVELOPMENT.md for the local command.
- Dependency release follow-up: npm audit reports eight high package entries stemming from one Zod advisory (GHSA-mrhx-c7xc-m3w5) in existing Remotion dependencies. Do not blindly apply the offered renderer downgrade; resolve via compatible updates and renderer regression checks before release. ESLint 9 deprecation also needs a compatible React-plugin/tooling upgrade. These remain release gates under W-31, not completed security work.
- Exact next feature: W-02 shared buttons, inputs, validation/error messages, status badges and accessible dialogs; verify keyboard/focus, loading/disabled states and responsive behavior before marking done. Authentication, upload, persistence, generation and the final product Dashboard remain Planned.

## Repository/documentation review — 26 October 2026

- Reviewed application folders, documentation, ignore rules and both AGENTS.md files. Added doc/README.md and doc/REPOSITORY-CONTENTS.md to separate current reading, historical references and commit/local-only guidance.
- Corrected root AGENTS.md instructions that could restart completed prototype/solar work or imply implementation was still waiting for design review; added Node 24/web verification and repository guidance. Marked outdated START-HERE/UI-DASHBOARD context explicitly.
- No source/media deletion, folder relocation, staging, commit or push. Application files remain untracked. Ignore checks confirm root credentials, dependencies, run artifacts, caches, installer archive and web outputs are excluded. This was not a complete public-content/secret audit.
- Validation: checked changed local Markdown file links and guidance against existing commands/tracker. Documentation-only; no provider calls or code test reruns needed. W-02 remains the next implementation feature.

## Stitch/scaffold comparison — 26 October 2026

- User correctly identified that the scaffold did not match their designs. Reviewed live Stitch references and running local pages; recorded concrete discrepancies in [UI implementation audit](UI-IMPLEMENTATION-AUDIT.md).
- Technical scaffold completion and previous functional checks do not imply visual completion. All four preview pages currently use generic scaffold content. Dashboard lacks the reference hero/mode/project/retention sections; Create, My videos and Settings remain placeholders.
- Added W-01V as the next correction before W-02: Dashboard desktop/mobile plus shell, with matched-width visual verification. Product/backend features remain planned. Palette parity stays #F7F6F2 on desktop/mobile.
- No UI code or Stitch design changed during this review. No pipeline/provider tests needed; local pages were captured/read in Chrome. Existing functional results remain historical evidence, not visual approval.

## Confirmed Stitch Dashboard implemented — 26 October 2026

- User explicitly confirmed the shown Stitch desktop/mobile Dashboard and authorized implementation. Replaced generic Dashboard foundation cards with the designed hero/illustration, three video-type cards, recent Ready/Draft project cards, slot/retention summary and matching mobile composition. Updated shared sidebar/header/profile/availability and bottom navigation.
- Reused reviewed static vector geometry from desktop/mobile references as local SVG assets after inspecting/rejecting active markup; did not execute generated HTML or import CDN scripts. Mobile hero is a code-native rendering of the compact waveform reference. The same solar thumbnail is used across breakpoints; portrait phone artwork is an illustrative fixture.
- Sample profile, worker availability, projects, dates and capacity are explicitly labeled. Sample Open video/Continue actions are disabled with an explanation. Creation and library navigation works; mode choices retain a mode query parameter, but the destination is still a placeholder. No actual project, account, job or media integration is claimed.
- Validation: root TypeScript and 18 pipeline regression tests passed (provider HTTP tests mocked); web lint/typecheck and production build passed. All eight desktop/mobile Chrome tests passed after final artwork refinements, covering navigation/query destinations, palette parity, 320px overflow/touch navigation, keyboard skip link, 404 recovery, sample labels, image loading and disabled sample actions. Screenshots reviewed against confirmed Stitch composition; user review remains pending.
- Existing CLI/media/dependency versions preserved. No live AI calls, Supabase configuration, generation, cloud changes, commits or deployment. W-08 (real backend Dashboard data) and other page implementations remain Planned.
- Next: user reviews the running Dashboard, then W-02 shared controls/dialogs. Reuse the confirmed layouts for later pages instead of generic scaffold cards.

## Compact Dashboard shell refinement started — 26 October 2026

- User requested less sidebar-to-content space, smaller sidebar icons/text and a slimmer top bar. Measured the original gap at 328px on a 1920px viewport, caused by the centered 1120px content container.
- Changed desktop content to fill the workspace with a 24px gutter; sidebar 224→192px, labels 14→13px, icons 20→17px and top bar 64→48px. Mobile header is 52px, with its existing 16px content gutters and shared colors. Navigation targets retain their 44px minimum.
- Complete: screenshots reviewed at desktop/mobile widths; measured desktop gutter is 24px at 1440/1920px, mobile gutter 16px at 320/390px, with no horizontal overflow. Root TypeScript/18 pipeline tests and web lint/typecheck/production build passed. Eight existing Chrome checks passed against the production preview using an isolated ignored config because another development server was active. Initial dev-launch/temp-config failures were test setup issues; no application assertion failed in the successful final run. Local preview restarted on port 3001. Next feature: W-02 shared controls/dialogs after review.


## Remaining three page references retrieved — 26 October 2026

- User accepted the refined Dashboard and requested exact Create video/My videos/Settings Stitch references before implementation. Added UI-PAGE-HANDOFF.md with desktop/mobile identifiers, mode/auth variants and required corrections.
- Displayed original mobile creation/library/settings and desktop library exports; incomplete desktop education/Settings exports were supplemented with safe local source-rendered previews. Reference confirmation remains pending. No application code or Stitch design changed.
- Next: after confirmation, implement these layouts incrementally with reusable controls; keep compact chrome, palette parity and clear preview boundaries. Backend milestones retain their planned statuses.

## Create video selection page added in Stitch — 26 October 2026

- User clarified the Create video entry page had never been designed; previously listed creation screens are mode-specific forms. Verified against the live inventory before generation.
- Created desktop 290babb026054769bcca94dbdcb96fd7 and compact mobile efb389600f7648988f179731eaf5ea34; screenshot/source checked and shown. Initial mobile c26ba2043d1342f7b2b8725a213a46c2 is superseded by the compact revision after its reported edit was not reflected in exported content.
- Three choices only: Education / Software showcase / Product branding, each opening the existing form. No generation starts on selection. Shared colors/compact navigation retained; runtime must reuse existing approved logo/icons.
- Design drafts await approval. Updated only UI-PAGE-HANDOFF.md and this tracker; no application code or tests changed. Next: user review, then implement selection entry before the three forms; continue feature by feature.

## Three Stitch-based page previews implemented — 26 October 2026

- User authorized the new selection page and requested verification/implementation of My videos and Settings. Retrieved desktop/mobile references for all three from the existing Stitch project; no new Stitch generation or design edits were required.
- Replaced the generic preview content with: (1) Create video selection and three working mode query links, (2) My videos saved/draft cards, capacity/retention and contextual preview actions, (3) Settings profile/security/session/deletion panels. Retained the compact 192px sidebar, 48px desktop/52px mobile header, 24px desktop/16px mobile gutter and shared ivory/forest tokens.
- Mode links display their selected destination and an explicit upcoming-form notice; the Education/Software/Branding forms are not implemented by this milestone. Existing Dashboard mode links still work. Unknown modes show a clear selection error.
- Library and Settings use clearly labeled fixtures. Library playback/actions open informational previews; Continue editing opens the selected Software destination without claiming a draft was loaded. Profile editing validates a trimmed 1–80 character name and updates page-local sample state only, resetting on refresh. Read-only email remains readable. Account/password/signout/delete operations are unconnected and their submit actions remain disabled. Google-only settings, actual profile persistence and library empty/expired/delete behavior remain later features.
- Shared Button/Notice/Modal components added. Modals dim/inert the full background, start focus on Cancel/Close, explicitly loop Tab/Shift+Tab, close with Escape and restore focus. The first browser run caught native-dialog Tab escape; fixed the focus loop. Two test selectors were also narrowed to main content to exclude Next.js route announcements.
- Final checks: root TypeScript and 18 pipeline tests passed (provider tests mocked); web lint, TypeScript and production build passed. All 16 desktop/mobile Chrome checks passed against the production preview, including new mode navigation, profile validation/reset, dialog focus/Escape, disabled account submissions, shared palette and 320px overflow checks. Desktop/mobile screenshots visually reviewed. No live AI, auth/storage/DB/cloud changes, deployment, commits or new dependencies.
- Changed files grouped: four page/control components (create-video.tsx, video-library.tsx, settings.tsx, ui.tsx), workspace-pages.css, shared icons/chrome, app layout/section route, two browser-test files, four local SVG assets; documentation updated in PROJECT-TRACKER.md, UI-PAGE-HANDOFF.md, WEB-DEVELOPMENT.md and the historical UI-IMPLEMENTATION-AUDIT.md status banner. AGENTS.md was not edited.
- Next: user reviews these three implemented visual previews. Complete reusable creation fields/validation and implement the Education input form first, then the Software/Branding forms; keep backend contracts/auth/persistence separate and mark features complete only with actual acceptance evidence.


## W-02 shared controls completed — 26 October 2026

- Retrieved live Stitch Education desktop/mobile (95651f3752184e0bbe8544e097b813ab / 594496ae09684f1881d4a67d67288791) and Settings desktop (8438188bc1b943b3b0e170260c961155). Inspected source and the mobile screenshot. Used the desktop labels and approved handoff corrections where the mobile export has missing labels; retained the compact shell and identical #F7F6F2 desktop/mobile canvas. No Stitch designs changed.
- Added reusable labeled text, textarea, select, password, checkbox and native radio-card fields with required semantics, linked hints/errors, controlled textarea counters, readable read-only/disabled states and keyboard selection. Settings now uses the shared text fields while retaining page-local sample name behavior.
- Extended shared buttons with pending labels/spinner and disabled handling; notices support info/success/warning/error and retry callbacks; status badges combine text and icons. Accessible native dialogs retain forward/reverse focus trapping, initial focus, Escape/close and focus return. Password visibility retains input value and keyboard focus. Reduced motion disables the spinner animation.
- Added /preview/controls as an explicitly labeled component review page, separate from the Education form and regular navigation. Async failure/retry is a local simulation with preserved inputs; no backend request, draft save, account change, voice playback or video generation is claimed.
- Browser verification caught a validation-induced layout shift that cancelled dialog clicks and a password toggle below the 44px touch target. Fixed submission timing and the touch target. Removed unsupported radio aria-invalid; the group retains error semantics and descriptions.
- Final validation: web lint with zero warnings, standalone web TypeScript and production build passed; root TypeScript and all 18 pipeline regression tests passed (provider requests mocked). All 26 Chrome desktop/mobile checks passed, including validation associations/limits, native keyboard choices, pending/disabled states, simulated failure/retry without mutation requests, password visibility, dialog focus/close/discard, reduced motion, palette parity and 320px short-viewport checks. Desktop/mobile screenshots reviewed. Runtime used Node 24.22.1.
- Scope: W-02 is complete as shared UI infrastructure. W-10 Education form and the other complete product features remain Planned. No dependency changes, live provider calls, cloud configuration, deployment, Git commit or push.
- Exact next feature: Education input-form UI at /preview/create?mode=education, matching the recorded Stitch structure with required intended use, settings, optional details and unchecked acknowledgments. Reuse W-02 controls; keep real save/generation unavailable until contracts/auth/persistence are implemented.

## W-10U Education form UI completed — 26 October 2026

- User authorized the Education input-form UI as the next small feature after W-02. Retrieved live Stitch Education desktop 95651f3752184e0bbe8544e097b813ab and mobile 594496ae09684f1881d4a67d67288791. Inspected desktop/mobile source and mobile screenshot; implemented the two-column desktop and stacked mobile structure with the accepted compact shell and identical #F7F6F2 canvas. Restored missing mobile labels, added required Intended use and removed unverified extra voice choices per reconciliation.
- Added EducationForm at /preview/create?mode=education: topic (300 characters), three audience levels, Personal learning/Promotional intended use, collapsible learning objective (500) and reference notes (10,000), 60/75/90 seconds, landscape/portrait frames, Kore English, fixed language, automatic-feature information, source-rights/AI-processing acknowledgments and seven-day retention. Text inputs start blank; acknowledgments start unchecked.
- Reused W-02 controls. Required errors appear after touching a field; native input limits and keyboard choices work. Optional fields retain values when collapsed; preferences do not clear source text. DOM order follows mobile reading/tab order: source, settings, acknowledgments/actions. Extracted only the reviewed static teacher/board SVG from the desktop source; no reference scripts or generated HTML were executed.
- Explicit UI boundary: values are page-local and reset on leaving/refresh. Save draft, Preview voice and Generate stay disabled with accessible explanations even after valid input. No storage, upload, account, audio or provider operation is simulated as a successful product action. Full W-10 remains In progress; W-10U is the completed UI slice.
- Verification caught and fixed a duplicate voice-hint ID that gave the playback button the wrong accessible description; corrected the optional-details test selector and desktop panel alignment. Final web lint (zero warnings), TypeScript/build and root TypeScript passed; 18 existing pipeline tests passed with provider HTTP mocked. All 34 desktop/mobile Chrome tests passed, including four new Education scenarios per viewport: defaults/navigation, touched validation/limits/optional value retention, disabled real actions/no mutation or media requests, responsive palette/layout/order and duplicate-ID checks. Screenshots reviewed at 1440/390; no horizontal overflow at 320/768/1024 and keyboard access checked on a 320×480 viewport.
- No dependency or AGENTS.md changes, cloud configuration, live AI requests, deployment, commits or pushes. Exact next feature: Software showcase form UI from its existing Stitch references, including clearly unavailable upload/save/generation actions; then Product branding UI, followed by W-03 shared contracts and backend integration milestones.

## W-12U Software showcase form UI completed — 26 October 2026

- User authorized the next Software UI milestone. Retrieved and inspected live Stitch desktop e56dcb5487ae4aadb63745ed699cb60a and mobile 310986568ea94b92a20a92c1c5fc0145, including screenshots and source. Implemented their source/settings structure with the accepted compact shell and identical #F7F6F2 canvas. Restored controls missing from mobile exports, replaced fixture text/files with empty state, and added required Intended use per reconciliation. No Stitch designs changed.
- Added SoftwareForm at /preview/create?mode=software: required software name (120 characters) and factual description, optional feature highlights, a visible combined 4,000-character description/features budget with recoverable validation, Intended use, file area and privacy/limit notices. Source-rights and AI-processing acknowledgments start unchecked. Duration 60/75/90, landscape/portrait, primary Kore English and fixed language match Education. Extracted VideoSettings to share its existing controls, IDs and behavior across both forms; Education regression checks passed.
- Empty upload area shows at least one screenshot/recording required, recommended 3–4 screenshots, up to 8 JPEG/PNG/WebP images at 5 MB each, one MP4/H.264 recording (optional AAC) at 45 MB/120 seconds, 60 MB combined and recording audio muted. These are documented V1 limits, not server-supplied capabilities or implemented decode validation. No fake uploaded thumbnails, file picker, file reads or uploaded success state. Dropping onto the area prevents default navigation and explains that nothing was opened/uploaded. Actual private uploading/validation/retry/remove remains W-11.
- Page-local fields reset on leaving/refresh. Choose files, voice playback, Save draft and Generate remain disabled with accessible explanations. No file is persisted or sent to AI; the privacy note explains that future analysis starts only after acknowledgment and Generate. No teacher or fabricated live interaction is promised for software.
- Verification: actual web lint passed with zero warnings; root TypeScript and all 18 pipeline regression tests passed (provider HTTP mocked). Another user development server was active, so the production build/typecheck ran on an ignored isolated source snapshot using existing dependencies; the first snapshot root could not resolve Next.js, corrected only its temporary build configuration. Source/assets/tests hashes matched the actual repository. Full production build and standalone snapshot web typecheck passed. Port 3001 preview now serves that verified snapshot; the other development server was left running.
- All 42 Chrome desktop/mobile browser checks passed, including eight new Software checks across the two viewports: defaults/navigation, required/whitespace validation and shared text budget/recovery, disabled actual actions and no mutation requests, dropped-file navigation prevention, palette/layout/reading-order/duplicate-ID checks and no overflow at 320/768/1024. Desktop/mobile Software screenshots reviewed; existing Education, shared-control, Dashboard/library/Settings checks retained.
- No dependency, AGENTS.md, cloud/provider configuration, live AI, deployment, commit or push changes. W-12U is Complete as UI; W-12 integration is unfinished. Exact next feature: Product branding form UI from its existing Stitch references, with optional description, required product name/image area, benefits/brand details and the same shared settings; actual upload/save/generation remains separate work.

## W-03 shared contracts completed; numbered order resumed — 26 October 2026

- User correctly identified that UI slices had been implemented ahead of the numbered board. They authorized returning to W-03. W-10U/W-12U remain completed UI-only milestones; full W-10/W-12 remain unfinished. Current and next task now follow W-03 → W-04 → W-05 rather than automatically starting Branding UI.
- Added shared/contracts with pure existing-Zod schemas, inferred types, shared limits and a browser entry point without server/provider/environment imports. Strict discriminated input variants enforce incomplete versus generation-ready fields, mode isolation, source roles/count/unique IDs, required Intended use, per-field and combined budgets, optional branding description, preferences and exact acknowledgments/current policy. Complete generation requests reference the owned draft version instead of accepting arbitrary source/input replacements.
- Added auth request/response shapes with exact password preservation, signup/new-password versus current-password boundaries, trimmed international display names, redirect allowlist, method-specific reauthentication and no client role input. Safe user/job/error DTOs reject extra credential/provider/debug/storage properties. Large counters stay decimal strings; job time/scene counts are validated. Validation-error projection emits static messages/allowlisted field paths and never echoes submitted secrets or attacker key names. Endpoint authorization, fresh auth proof, ownership/media decode/provider eligibility and text sanitization remain mandatory later work, not guaranteed by schemas.
- Education, Software, Settings and shared VideoSettings now consume shared schemas/limits/durations. Settings supports 80 Unicode code-point names rather than incorrectly limiting supplementary characters to half that count. Source-content budgets preserve existing native UTF-16 behavior. Existing preview persistence/network boundaries remain unchanged.
- Generated shared/contracts/openapi.json as an OpenAPI 3.1 component catalog using input JSON Schemas. Paths intentionally remain empty; this is not an implemented HTTP API. Runtime refinements handle cross-field rules that JSON Schema cannot express. Added contracts:generate/check; root check now verifies catalog freshness. See shared/contracts/README.md for mappings and limitations.
- Verification: 16 contract tests plus 18 existing pipeline tests passed (34 Node tests; provider HTTP mocked), root TypeScript, web lint with zero warnings, standalone web TypeScript, catalog freshness and isolated production build passed. Initial browser build caught .js-to-.ts source resolution differences; corrected explicit shared .ts imports and no-emit compiler options, then passed final Node/browser checks. No new dependency or credential read.
- All 44 Chrome desktop/mobile tests passed, including new international-name validation plus existing Education/Software budgets, field errors, navigation, dialogs and responsive palette checks. Isolated snapshot source/consumer/assets/tests hashes matched actual repository files; it was used to avoid disturbing the separate user development server. Port 3001 preview serves that verified build.
- No Supabase migration/configuration, auth session, storage upload, queue, live AI, deployment, commit or push. Exact next task is W-04: local Supabase schema/migrations/ownership policies and two-user/transaction verification. Branding UI remains planned until a later explicit sequencing decision.


## W-04 local database foundation — 27 October 2026

- User explicitly authorized W-04. Installed pinned Supabase CLI 2.122.0 as a development dependency and started this application's own Docker stack (PostgreSQL 17.11, Auth, private Storage, REST gateway and Studio). Existing n8n/order-postgres-db containers were left alone; no hosted project, deployment or provider request was made.
- Seven versioned SQL migrations create 33 tables for identity controls, projects/revisions, execution metadata, plans/media, accounting and cleanup. Every table starts with RLS and denied browser writes. Composite ownership FKs, immutable requests/retention/object paths, plan/scene validation, unavailable-source guards, safe read columns and exact upload allocation policies are implemented. The Auth trigger ignores requested role/ownership evidence; access is by immutable user ID. Narrow name/draft mutation primitives derive the actor from auth.uid() and use optimistic versions/ordered row locks; their web integration remains W-05/W-09.
- Added safe local commands, generated shared/database/database.types.ts and [local database/pgAdmin guide](LOCAL-DATABASE.md). Studio is http://127.0.0.1:55423; PostgreSQL is 127.0.0.1:55422. No privileged browser credentials were added. CLI start/reset output stays in ignored local logs because it can contain local development keys.
- Docker Desktop ignored the network's default loopback binding. The application wrapper now checks actual mappings and recreates only its three published services with explicit 127.0.0.1 bindings, preserving named volumes, mounts and CLI gateway files. It does not alter global Docker settings. Verified all three mappings; use npm database wrappers rather than raw CLI startup/reset commands.
- A migration delimiter error was caught and repaired before acceptance. Storage grant tests also exposed protected owner-issued grants: Supabase's storage owner cannot be assumed/reconfigured by app migrations. Tests now verify actual RLS denial (no readable/updatable rows) while keeping managed grants intact. No browser Storage SELECT/UPDATE/DELETE policy exists. The tested policy allows only exact reserved source INSERT; this is not proof of uploaded media decoding or signed-download endpoint behavior.
- Verification passed: 93 pgTAP assertions covering two-user isolation, role spoofing, operator isolation, safe columns, disabled/deleting users, tombstones/expiry, composite-FK attacks, immutable revisions/assets/plans, bounded progress/repairs, allocation/overwrite/read denial and optimistic conflicts. Real separate PostgreSQL sessions verify one stale edit loses, failed edits roll back and competing jobs cannot violate one-active-job/user. Fixtures roll back or are explicitly removed; final Auth users/projects/Storage objects are empty.
- Full reset and reset-to-first-migration plus incremental application produce identical application schema dumps including functions, constraints, indexes, policies and grants. Database type generation/freshness passed. Root TypeScript, all 34 existing contract/pipeline tests (provider HTTP mocked), contract-catalog freshness, web lint/typecheck and Node script syntax checks passed. No UI source changed in W-04; previous visual/browser/build evidence remains in W-03 and was not relabeled as new testing.
- Scope boundary: schema structures and SQL integrity guards do not complete quota admission, job claim/heartbeat fencing, provider dispatch, finalization, cleanup, account reauthentication or real Auth sessions. Generation/claims are paused and global byte allowance is zero until intentionally configured. These transactions and integrations follow their numbered features; no live generation occurred.
- Exact next task: **W-05 — email signup/signin and editable display name**, with real Supabase sessions, generic failures, the approved password policy and no verification/reset emails. Google credentials/collision tests remain W-06; do not skip to later form or queue work.

## W-04 startup dependency repair — 27 October 2026

- User reported db:start failure. The ignored startup log showed MODULE_NOT_FOUND for node_modules/supabase/dist/supabase.js; all application-local Docker services were already running and healthy. The package remains pinned in package.json/package-lock.json but was absent from node_modules.
- Restoring development dependencies with npm install --include=dev; added a clear missing-CLI diagnostic and documented recovery. No schema changes, database reset or volume removal. Runtime verification is recorded below after checks finish; W-05 remains the next feature.
- Verified repair: the pinned CLI and Windows binary are restored; npm run db:start and db:status both pass using the user's Node 22.12.0/npm installation. Studio HTTP returns 200. Script syntax, root TypeScript and all 34 existing mocked pipeline/contract tests pass. No schema/database reset was performed.
- Installer limitation: the broad install restored packages but failed while saving package-lock.json (UNKNOWN/open); the existing lockfile is valid and unchanged from W-04. A no-save offline follow-up could not resolve uncached unrelated Remotion registry metadata. No installer is left running. The actual CLI startup/status repair is verified; a future full dependency reinstall should use Node 24 with network access and a writable lockfile. W-05 remains next.

## W-04 review: obsolete staging migrations — 27 October 2026

- Reviewed P1 duplicate-migration finding. The actual application repository supabase/migrations already contained only the seven corrected files 20261027000001–20261027000007. Five obsolete 12-digit copies remained in the earlier delivery/staging workspace under Documents/ChatGPT/Ai video gen/w04-stage/supabase/migrations, a separate Git repository.
- Removed only those five obsolete staging SQL files and verified both directories contain exactly the corrected seven-file sequence. No application migration SQL, live database data or migration history changed; no reset was needed. Commit the actual Desktop/ai-video-generator application repository, not the earlier staging workspace. Existing W-04 acceptance evidence remains valid; W-05 is next.


## W-04 review: validated-plan purge and OAuth destinations — 27 October 2026

- Confirmed both P2 findings in the actual application, not just staging artifacts. Added forward migration 20261027000008_purge_and_oauth_paths.sql; the seven previously applied migrations remain unchanged.
- public.purge_revision_plans is server-only (service_role execution, fixed empty search_path). It locks lifecycle/project/revision/plan rows in order and requires a deleting account with a deletion timestamp, an account_deletions record in purging, project/revision tombstones and no active jobs for that owner. Scene timing references must be removed first. It clears the selected-plan pointer and removes scoped scenes/plans atomically; retries return zero. Guarded DELETE is permitted only for postgres/service_role under those terminal lifecycle conditions. Validated content edits/reopening remain forbidden, including during purge; no spoofable authorization flag was added.
- OAuth CHECK now uses the shared contract's static destinations and canonical UUID project paths, including matching UUID version/variant/sentinel behavior. Legacy /create flow rows normalize to /projects/new during migration. New /create, external, protocol-relative, malformed, query-bearing, fragment-bearing and newline-bearing paths are rejected. Shared request contract itself did not need changing.
- Added 31 pgTAP review regressions (124 SQL assertions total), plus a real PostgreSQL/Zod comparison across 38 destinations integrated into db:test. Verified browser/anonymous purge denial, forged role claim denial, live/cleaning/active-job gates, persistent immutability, authorized removal through the profile foreign-key chain and other-owner preservation. SQL fixtures roll back; no review users/plans remain.
- Added npm run db:migrate for forward local upgrades without resetting data. Applied the eighth migration to the existing local stack. Full reset was not repeated on the user's exploratory database; earlier seven-file fresh/incremental evidence remains historical. Database types regenerated/freshness passed; root TypeScript, all 34 existing mocked contract/pipeline tests, catalog freshness and script syntax passed. No UI source, provider calls, deployment, commit or push.
- Updated matching migration/testing delivery artifacts so a review of the earlier staging copy does not show the obsolete behavior. The actual application remains Desktop/ai-video-generator. Full account deletion/reauthentication/physical cleanup remain W-26/W-24 work, not completed by this SQL primitive. Next feature remains W-05.


## W-04 review: scene reparenting/validation race — 28 October 2026

- Confirmed and reproduced the P2 issue before changing SQL: a service-role move to a candidate destination succeeded while another session held the source plan's uncommitted validation. The deterministic test reported the successful move as a failure, then removed its synthetic fixture.
- Scene reparenting is not a product requirement; changed plans receive new scene rows. Added forward migration 20261028000001_scene_membership.sql, leaving the eight applied migrations unchanged. guard_plan rejects any UPDATE changing a scene's plan_id before selecting or locking a parent. Same-plan candidate edits and new-row content reuse remain allowed. Validated content stays immutable, and the terminal authorized purge path from migration 008 is preserved.
- Added ten pgTAP assertions for candidate/validated source and destination moves, null membership, retained counts, same-plan editing, independent copied scene identities and validated content protection. Added a real two-session regression to db:test: the validator emits a marker while holding an open transaction; only then does the mover run. The validator receives COMMIT after the move result, so there is no sleep-based race assumption. The move must return 23514 rather than a lock timeout, and the committed source must remain validated with four scenes and an empty destination.
- Applied the ninth migration locally without reset. All 134 SQL assertions, existing optimistic-write/rollback/job-cap concurrency checks, 38 OAuth DB/Zod comparisons and the new scene-move race pass. Fixture users/plans are removed; authorized purge tests still pass. No browser/UI, provider, cloud deployment, commit or push changes. W-05 remains next.


## W-05 local email authentication and profile persistence — 3 November 2026

- User authorized the next numbered milestone. Re-read approved auth screenshots and retrieved the corresponding Stitch desktop signup/signin source as reference; implemented shared auth layout/forms using existing field/button/notice primitives, local Manrope and the same ivory canvas on desktop/mobile. Full name, valid email, password bounds/confirmation, password visibility, actual pending states and generic failures are connected. Google is explicitly disabled pending W-06; account-access help sends no reset email.
- Installed pinned @supabase/ssr 0.12.7 and @supabase/supabase-js 2.118.0 in the web workspace with the root lockfile. Cookie sessions use the supported SSR adapter. Each private API request verifies the user through Auth and reads the active profile with the user's RLS permissions; no service-role client or root AI-provider environment is used. Signup metadata supplies only the bounded display name; account role remains the database default and email ownership remains unknown.
- Implemented auth CSRF/signup/signin/session and GET/PATCH me/settings. Exact configured Origin, a 30-minute nonce bound to the current session cookies, 64-KiB request ceilings, private/no-store replies and safe error envelopes protect mutations. The nonce is invalidated after successful login/signup. A bounded per-process limiter supplements Supabase's Auth limits; distributed abuse controls remain a public-release gate.
- /settings reads actual email/name and saves only the name through the existing update_display_name RPC. Two real requests with the same version yield one 200 and one 409; stale edits are retained until an explicit saved-profile reload. Refresh and a second signed-in browser retain the saved name. Rejected role/owner fields and a separate test user verify the endpoint cannot select another owner. No new migration or data reset was necessary.
- /dashboard is a minimal real-account welcome destination, not completion of W-08's project/usage/worker dashboard. Shared shell accepts actual identity without changing fixture previews. Creation/library links still enter clearly labeled /preview pages. Real password changes, account deletion and sign-out are visibly unavailable and remain their numbered tasks. W-07 owns comprehensive protected-route/expiry/signout handling; W-05's private APIs already require a verified active account.
- Added npm run web:auth:local, committed apps/web/.env.example and ignored local connection settings. The helper reads only this local stack's anon key/API URL, never prints credentials and does not overwrite a remote Supabase URL. APP_ORIGIN must match the browser's exact origin and port. Setup/API-slice details are in WEB-DEVELOPMENT.md and API-DESIGN.md.
- Validation: 37 Node tests (18 existing pipeline, 16 shared contract, 3 CSRF/attempt-limit tests); root/web TypeScript, lint and shared-contract freshness; production build. Fifty desktop/mobile browser cases were covered: the first full run passed 45; the five failures were rerun successfully after fixing raw malformed-JSON test encoding, explicitly waiting for help navigation, increasing the bounded cold Auth request deadline to 30 seconds, and allowing the existing multi-page mobile check 60 seconds on this slow machine. Final desktop/mobile signup screenshots were inspected after removing duplicate field margins. Tests used actual local Auth/SQL for signup/signin/persistence/conflict/isolation, not mocked successful accounts. Synthetic .invalid identities/profiles were cleaned up; no AI calls or real user data were changed.
- SDK installation reported 16 moderate dependency advisories; no forced upgrade/downgrade of the accepted renderer was applied. A deployment dependency/security review remains a release gate. No deployment, commit or push was performed. Exact next feature: **W-06 Google sign-in/callback and identity isolation**; obtain/configure Google OAuth credentials only as that feature requires.


## W-04 review repair: draft saves after result expiry — 4 November 2026

- Reproduced SQLSTATE 23514 by committing a valid ready result, allowing its real expiry to pass, then saving as its authenticated owner before cleanup. Added forward migration 20261104000001_latest_result_expiry.sql; no reset or historical migration edits.
- The deferred latest-result guard checks freshness on pointer assignment, while unchanged pointers permit title/input/preferences edits after expiry. Same-project/owner, ready status and tombstone checks remain enforced. Its fixed-search-path security-definer context can inspect the expired revision after the draft RPC returns; direct PUBLIC/anon/authenticated execution is revoked. This does not grant expired media access or extend retention.
- Added scripts/check-draft-expiry.mjs to db:test. Real commits cover live publication, draft persistence after clock expiry, unchanged retention/pointer, expired-result RLS hiding, stale-version conflict, clear/reassign rejection even with a later deferred edit, tombstone rejection and saving after pointer cleanup. Synthetic metadata fixtures are removed; no media/provider calls.
- Validation: all 134 pgTAP assertions, existing concurrent edit/rollback/job-cap checks, 38 OAuth contract comparisons, scene validation/move regression, new expiry regression and database type freshness passed. Existing data preserved. W-06 Google sign-in/callback and identity isolation remains the next feature; no commit or push performed.
