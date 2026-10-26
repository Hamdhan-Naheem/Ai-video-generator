# AI Video Generator — project tracker

**Last updated:** 26 October 2026  
**Current phase:** Incremental application implementation authorized. First milestone: web scaffold and shared responsive foundation; cloud integration remains planned.
**Current milestone:** W-02 shared UI foundation completed and verified against Stitch Education/Settings references. Next: implement the Education input-form UI using these controls, then Software and Branding forms. Backend contracts/auth/persistence/generation remain Planned.
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
| W-01P | Create video/My videos/Settings visual layouts | Complete — visual previews; user review pending | Stitch-based selection/library/settings layouts, desktop/mobile screenshots, 16 Chrome checks, production build; sample data only. Mode input forms and backend remain planned. |
| W-02 | Shared buttons, fields, status/error messages and accessible dialogs | Complete — shared UI foundation | Stitch-based text/textarea/select/password/checkbox/radio fields; associated hints/errors; pending/disabled buttons; status/notice/retry components; Settings integration. 26 desktop/mobile browser checks, lint/typecheck/build and 18 pipeline tests passed. Loading/retry verified with explicitly local simulations; real backend operations remain Planned. |
| W-03 | Browser-safe shared input/auth/job contracts | Planned | Mode schemas, display name, intended use, acknowledgments, budgets and error DTO tests |
| W-04 | Supabase local schema, migrations and ownership policies | Planned | Two-user RLS/transaction tests; no browser privileged credentials |
| W-05 | Email signup/signin and editable display name | Planned | Real session flow, generic errors, configured password policy, no verification/reset email |
| W-06 | Google login, callback and identity isolation | Planned | Same-account rules, direct Auth collision tests, cancellation/errors |
| W-07 | Session expiry, signout and protected routing | Planned | Safe return paths; no mutation replay; durable jobs continue |
| W-08 | Dashboard with real project/usage/worker data | Planned | No fixture presented as real state; correct capacity/reservations |
| W-09 | Draft creation/edit/save and mode selection | Planned | Optimistic versions, incomplete draft save, explicit Generate only |
| W-10 | Education form | Planned | Audience/topic, notes, intended use, shared settings/consent validation |
| W-11 | Private media upload/retry/remove | Planned | Actual media limits, partial uploads, owned access and shared-source safety |
| W-12 | Software showcase form | Planned | Name/description/features and screenshot/recording validation |
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
| M6 | Full web application and cloud integration | In progress — scaffold | Landing/auth/dashboard/input/progress/library work with Supabase and local worker |
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
| A-08 | Supabase PostgreSQL records and ownership policies | Planned |
| A-09 | Private Supabase Storage and scoped access | Planned |
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
