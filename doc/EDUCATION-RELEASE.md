# Education showcase release plan

**Decision date:** 6 November 2026; storage revised 7 November 2026
**Status:** Supabase Auth/PostgreSQL/private Storage selected for first release. W-17/W-18/W-19 progress/recovery/cancellation, W-24D deletion and availability messaging verified locally; W-20 private results and W-23 retained-video listing/reopening verified locally; private Storage-retention cleanup verified locally; registered local-workspace lifecycle verified locally; legacy review and hosted deployment pending. R2 deferred.
**Progress authority:** [Project tracker](PROJECT-TRACKER.md). Preserve the original W-IDs and recorded acceptance evidence.

## Deployment target and implementation boundary

| Responsibility | Approved target | Current evidence / remaining work |
|---|---|---|
| Website and short JSON/control APIs | Vercel | Local web application verified; production configuration/deployment pending |
| Authentication and application records | Hosted Supabase Auth and PostgreSQL | Local Supabase migrations/session/ownership/queue verified; hosted setup and checks pending |
| Binary videos, audio, captions and uploaded media | Private Supabase Storage | Retain existing locally verified uploads/artifacts/results/cleanup; hosted bucket/policy/limit verification pending |
| Gemini, timing and Remotion rendering | Separate Node.js worker | Local Education execution verified; creator computer must be online |

PostgreSQL remains the database and durable queue; private Supabase Storage holds binary files. R2, Neon and Amazon RDS are not required. The 6 November R2 target is superseded by the 7 November Supabase decision; no storage migration has been implemented or is needed to retain the current adapter. Hosted worker infrastructure, paid services, account activation and publishing require applicable authorization; this document does not authorize them. Do not connect the production website to a database reachable only on the creator's localhost.

## First release scope

- Email/password access, owned Education drafts/settings and confirmed saved-draft deletion.
- Education generation: English; 60/75/90-second targets; 720p landscape/portrait at 30 fps; automatic planning, narration, measured captions, teacher cues and verified publication. Actual web acceptance so far is 75.008-second landscape/portrait; other duration targets still need appropriate release checks. Topic-specific illustration quality remains limited by supported templates, not unrestricted AI-generated scenes.
- Clear progress/waiting/offline/reconnect, bounded recovery/retry and safe cancellation. Preserve completed work and budgets across failures.
- Private result playback, MP4/SRT/VTT download, reopening generated results and visible expiry/unavailability.
- Ownership, server-side admission/limits, maximum 60-second read grants, seven-day successful-media retention, deletion/tombstones, cleanup retries and no late publication. Keep current account/global/provider limits; do not silently expand them.
- Desktop/mobile share the approved design palette. Provide truthful public sample/help/contact content and test keyboard and small-screen core flows.

Software showcase and Product branding generation are deferred. Keep existing forms, owned drafts and code; show **Coming soon** and **Generation will be available in a future release.** Do not promise the next deployment or enable unsupported API submissions. Google sign-in, advanced versions/regeneration, alternate-orientation management, burned-caption export, expanded settings/account UI and advanced operator dashboards are later backlog. Initial Education creation still supports both orientations. Deferral does not remove basic resource/privacy/security obligations or essential operational cleanup.

## Build sequence and acceptance

1. **R-00 documentation alignment:** update requirements/architecture/DB/API/agent guidance and tracker. Complete as documentation only.
2. **W-24D saved-draft deletion — Complete locally:** accessible confirmation, owner/state checks, atomic protection against concurrent generation, retry feedback, list removal and safe cleanup of unreferenced files. Preserve other users' and shared assets; full W-24 is not complete from this slice.
3. **R-02 private R2 integration — Deferred for showcase:** preserve this ID/history; no R2 integration or Cloudflare credential setup is required for the first release. Do not mark it Complete. Revisit only if later usage justifies a separately approved migration.
4. **R-03 progress/recovery/cancellation — Complete locally:** W-17/W-18/W-19 are verified with local Auth/API/SQL/controlled-child evidence. Hosted acceptance remains pending. Verified essential behavior includes reconnect/refresh and worker failure, finite retries, lease fences and cancellation/publication races.
5. **R-04 results/library — Complete locally:** W-20 private player/downloads and W-23 owned listing, lazy private thumbnails, cursor pagination, exact-revision reopening after draft removal, empty/expired/unavailable/retry and preserved draft navigation verified with synthetic media and actual local Auth/Storage. Hosted real remote acceptance remains R-05. The W-24 private Storage-retention slice is verified locally; next is W-27 public landing/help/release content.
6. **R-05 release hardening/deployment:** remaining essential retention/cleanup, protected operational controls, unavailable-mode messaging, public content, production origins/cookies/CSRF, secrets, hosted Supabase migrations/RLS/private buckets and worker pairing. Verify owner isolation, limits, delete/cleanup races and a real remote Education run/play/download. Check both orientations and supported duration targets, including a fresh timed 90-second run before making speed claims. Verify every media file fits hosted upload limits and monitor stored bytes separately from monthly cached/uncached transfer. No allowance increase is automatic. Clearly separate cached fixtures, mocked providers and real fresh generation evidence.

Keep full original milestones and their evidence. Mark deferred features explicitly rather than Complete. Only record an implementation slice Complete when its acceptance checks pass; merge its evidence into the relevant W-milestone as work proceeds.

## Worker availability and cost decisions

Initial deployment uses the existing local outgoing worker: no inbound port/tunnel required. Queue state persists in hosted PostgreSQL; the web request returns before generation finishes. Show actual worker availability; do not promise background completion while the machine is off or uninterrupted recovery without verification. Unattended recruiter generation needs a separately approved hosted worker and resource benchmark.

Vercel Pro would not itself accelerate this separate worker. Measure fresh per-stage timings before recommending hardware, concurrency or provider-plan changes. Keep jobs and costs bounded; do not represent provider/free-tier access, storage operations or hosting as unlimited or guaranteed free. Verify account eligibility/allowances before provisioning.

## Related contracts

- [PRD](PRD.md): user-facing release requirements; wider three-mode vision retained.
- [System architecture](SYSTEM-ARCHITECTURE.md): Supabase deployment target, trust boundaries and hosted verification boundary.
- [Database design](DATABASE-DESIGN.md): retained schema/entities, Storage verification and deletion accounting.
- [API design](API-DESIGN.md): authorization, direct transfers, receipt checks, grants and draft deletion.
- [Education generation](EDUCATION-GENERATION.md): actual local W-16 evidence and limits.
- [Project instructions](../AGENTS.md): durable workflow constraints.


## Storage decision history

- 6 November: private R2 selected as a proposed target; no integration applied.
- 7 November: user chose Supabase for the first release to retain the locally verified integration. R-02 deferred; W-17 is next within R-03. Current private media, seven-day expiry, 60-second grants, account/global budgets and generation modes are unchanged. Physical retention cleanup and hosted access/transfer/limit checks remain unfinished; deleting expired bytes is required to reclaim space.


### 12 November 2026 — retention operation

Private Storage expiry/deletion/accounting is verified locally; see [maintenance guide](MEDIA-RETENTION.md). The private watcher must run alongside the local worker/Supabase for periodic physical cleanup. Expired access is denied even while it is offline. This does not complete full W-24 or R-05. Next is W-27 public landing/help/release content. Local web-worker workspace pruning, shared abuse limits/security headers, hosted scheduling/worker availability, remote generation/play/download and staged API load tests remain launch gates. No new provider or hosted infrastructure was activated.

### 12 November 2026 — public content

W-27 is Complete locally: approved responsive landing and public help/privacy/terms/contact, real auth navigation, neutral unavailable/access help, and the explicitly authorized public hydroelectric example. See [public-page provenance and limits](PUBLIC-PAGES.md). The original private artifacts and all private user-media access rules remain intact. The public example is intentionally unauthenticated and does not expire as a user project. Next is W-29 shared failures/accessibility release pass; R-05 remains In progress, with all hosted/lifecycle/security/remote-acceptance gates above retained. No deployment was performed.

### 12 November 2026 — W-29 local release pass

W-29 is Complete locally for the Education showcase: bounded/sanitized requests, retained edits on transient failures, explicit conflict reload confirmation and pending-dialog keyboard focus are verified with existing delete/private-player/session recovery. See [Release QA](RELEASE-QA.md). This is not full screen-reader or hosted acceptance. R-05 stays In progress. Next finish the essential W-24 temporary local web-worker workspace/cache lifecycle, then essential W-30 protected operating controls and W-31 security/shared abuse/dependency/hosted configuration, real remote generation/play/download and staged load verification. Current limits and deferred features are unchanged.

### 12 November 2026 — registered local workspace lifecycle

The essential W-24 local cleanup slice is Complete locally. [Workspace cleanup](LOCAL-WORKSPACE-CLEANUP.md) documents scoped preview/apply/watch, guarded server/quiet-period decisions, cooperating worker locks, contained temporary render bundles and conservative legacy preservation. Operational apply deleted no real legacy/demo files. Full W-24/R-05 remain In progress. Next is essential W-30 protected operational health/repair/usage controls, then W-31 security/dependency/shared abuse/hosted configuration and remote/load acceptance. Review unregistered legacy and historical unowned temporary artifacts before release; this implementation does not prove every historical local copy was erased.

### Completed-video deletion/account follow-up — 12 November 2026

The user-approved W-24 completed-Education-result deletion slice, readable usage and shared account-menu sign-out are verified locally. Deletion preserves drafts, blocks new grants, releases the logical slot once and reclaims physical bytes only after safe private cleanup. This does not complete full project/account deletion, hosted retention scheduling or the remaining R-05 deployment/security/availability gates. See [manual checks and limits](VIDEO-DELETION-ACCOUNT.md) and the tracker acceptance entry.

## Linux worker prerequisite — 13 November 2026

The user approved preparing a Linux x86_64 Docker worker and an offline native/render benchmark before remaining W-30, aiming to avoid a personal-PC dependency after hosted acceptance. See [Linux worker](LINUX-WORKER.md) for current evidence. This does not activate a cloud trial, select a final paid host, create credentials, replace Supabase or complete R-05. W-30 operational controls and W-31 hosted pairing/maintenance/remote generation/security/load acceptance remain required. Google Cloud is only a candidate; verify current eligibility/credits/costs and agree an expiry/disable plan before any provisioning.

## W30 essential controls — 13 November 2026

Complete locally: protected operational API/private CLI, safe health/usage/paging, persisted operator limits, versioned pause/resume, exact receipts, expired-lease repair and safe audit. [Setup/evidence](OPERATOR-CONTROLS.md). Advanced admin UI/credential operations stay deferred. R-05 remains In progress and full W-24 remains unfinished. Next is W31 deployment preparation and guided manual hosting: the user performs deployment. Hosted/direct-Auth/edge/origin/cookie/header/secrets/maintenance/legacy lifecycle, actual remote generation/play/download and staged-load/rollback acceptance remain required; nothing is automatically provisioned or declared production-ready here.
