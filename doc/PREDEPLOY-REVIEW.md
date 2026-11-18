# Pre-deployment code and security review

**Date:** 12 November 2026  
**Status:** Local remediation verified; hosted security/configuration and public-release acceptance remain pending.  
**Scope:** Current working tree in the application repository, including uncommitted implementation. Education is the first release. Software/Branding execution and Google sign-in remain deferred.

This is a source/configuration review supported by local tests and read-only runtime inspection. It is not an external penetration test, a guarantee of security, a cloud configuration audit, or a complete production readiness sign-off. No application code, dependency, migration, secret, quota, provider setting or hosting resource was changed by this audit. SQL tests use transaction-local fixtures and roll back. Backend tests use synthetic fixtures; no live AI generation was requested.

## Initial audit decision

Complete the correction work below before public deployment. W-30 remains **protected operational health/repair and global usage controls**, not deployment itself. W-31 covers remaining security and hosted deployment acceptance. Keep the existing W identifiers and completed evidence; this review is a follow-up before those milestones, not a replacement tracker.

No new confirmed cross-user data exposure, arbitrary code execution or secret leak was found in the inspected paths. That observation does not establish their absence in every possible execution path.

## Initial findings and correction order

### SEC-01 — P2: authentication throttling is not shared across instances

**Evidence:** `apps/web/src/lib/auth-security.ts:17–31`; the API calls `allowAuthAttempt` for email sign-in/sign-up. A process-local Map counts eight attempts per email per minute, caps distinct keys at 2,000 and expires entries. Supabase also supplies its own Auth protections.

**Impact:** Different Vercel instances and cold starts have independent counters. Changing email addresses also avoids a per-email bucket. The application throttle alone does not establish a shared public abuse limit. Public direct Supabase Auth endpoints are another path and must be tested/configured independently.

**Correction:** Add shared, bounded account/IP/action controls at an appropriate trusted boundary and verify hosted Auth limits/direct requests. Use trusted client-address attribution; do not trust arbitrary forwarded headers. Preserve generic errors and avoid logging passwords or complete addresses. No paid service or CAPTCHA provider was selected by this review.

**Acceptance:** Multiple instances share the same limits; rotating identifiers cannot exhaust the service; direct Auth behavior is documented/tested; expiry and unavailable-limiter behavior are bounded. Do not claim Supabase's existing controls are absent merely because the application Map is local.

### SEC-02 — P2: authenticated draft creation has no metadata quota

**Evidence:** `supabase/migrations/20261027000006_ownership_storage.sql:94–123` and `20261104000003_project_drafts.sql:41–64`. `save_project_draft` can insert a project with expected version zero; `create_project_draft` delegates to it. Both are executable by `authenticated` in the running database. Neither enforces an account draft-count or metadata budget. `private.bounded_object` limits an individual JSON object to 128 KiB, but does not bound the number of objects. File-storage quotas do not count this PostgreSQL metadata.

**Impact:** One registered account can repeatedly create drafts; unique idempotency keys also create persistent receipt rows. A Next.js-only rate limit would not cover the directly callable RPCs. No bulk creation attack was executed against the user's database.

**Correction:** Enforce creation limits atomically at the database write boundary, including all insert-capable RPCs. Review whether the older `save_project_draft` primitive still needs direct browser execution; its security-definer wrappers can call it without a browser grant. Define bounded receipt retention and maintain strict input contracts without deleting live recovery receipts. Preserve draft edits, lost-response reconciliation and existing ownership checks.

**Acceptance:** Repeated and concurrent creates cannot exceed the agreed limit through either API or direct authenticated RPC; replay does not consume another slot; foreign ownership and normal saves remain correct. Choose the actual cap explicitly during implementation rather than inventing a product allowance here.

### SEC-03 — P2: provider budgets reset for each new job

**Evidence:** `supabase/migrations/20261107000002_generation_recovery.sql:172–183`; the dispatch guard checks counters on the current job and operation. Enqueue creates a new job with fresh processing budgets. No shared per-user/global time-window provider admission or dispatch budget was found.

**Existing protection:** One active job per user, one processing slot, storage reservations, retained-output caps, finite per-job attempts/repairs/time, durable dispatch receipts and fail-closed handling of uncertain requests are present. These should be preserved.

**Impact:** These limits control concurrency and one job's work, but not cumulative requests across new jobs. Repeated failed generations, or successive completed/deleted jobs, can consume the shared provider allowance over time. Provider-side quota rejection is not the same as application-wide fair-use admission. Only explicitly provisioned accounts currently have sufficient generation capacity; this is a public-release gate, not evidence of an unrestricted current anonymous endpoint.

**Correction:** Add conservative durable user/global window budgets, safe operational pause and audited reconciliation in the W-30 work. Check eligibility before actual external dispatch, count uncertain dispatches conservatively, preserve retries/checkpoints and do not expand existing provider/storage allowances.

**Acceptance:** New job IDs cannot reset the shared window; concurrent admission/dispatch cannot overspend it; genuine checkpoint reuse makes no new provider request; an unavailable budget service fails closed and communicates a useful waiting state.

### SEC-04 — P2: dependency advisories remain unresolved

**Evidence:** Fresh `npm audit --json --ignore-scripts` reports **16 affected package entries: 8 high, 8 moderate, 0 critical**. Entries include transitive dependants; this is not 16 independent demonstrated exploits.

- `package.json:62` pins Remotion bundler 4.0.538. The lockfile contains nested Zod 4.5.4 in Remotion packages; application Zod is already 4.6.7. The affected dependency is not fixed by simply changing the top-level Zod version.
- [Zod resource-exhaustion advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) lists versions below 4.6.6 as affected.
- The lint chain includes minimatch 10.2.6 through typescript-eslint. [Minimatch amplification advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249) lists the relevant patched boundary as 11.0.1.
- The registry audit offers a compatible Remotion bundler upgrade to 4.0.543. This is a candidate, not a verified upgrade. One offered lint remediation would downgrade eslint-config-next; do not apply it blindly.

**Impact:** The Remotion packages belong primarily to worker/build/studio tooling, and the minimatch path is development lint tooling. A browser-accessible exploit was not demonstrated. Application payload ceilings and the patched application Zod reduce some exposure but do not eliminate the vulnerable nested dependencies.

**Correction:** Select compatible updates, keep the Remotion package set aligned, inspect the lockfile diff and repeat the advisory scan. Run renderer regression using cached/synthetic inputs, backend/SQL checks and relevant web checks; do not spend provider quota to validate an upgrade.

**Acceptance:** Remove the affected versions or document a specific, reviewed residual exposure. Do not run `npm audit fix --force` or downgrade the accepted renderer/framework automatically.

### SEC-05 — P2: browser-facing pages have no application security-header baseline

**Evidence:** `apps/web/next.config.ts:4–9` defines no response headers. Read-only GETs against the current production build at `/` and `/sign-in` showed no CSP, frame restriction, nosniff, Referrer-Policy or Permissions-Policy. API responses do set nosniff and private/no-store. No permissive CORS response header was observed.

**Impact:** The browser lacks defense-in-depth against framing, content interpretation and unintended referrer/capability exposure. This does not establish an existing XSS or clickjacking exploit; React escaping, same-site cookies and CSRF protection already help.

**Correction:** Add a compatible production header baseline, including framing restrictions and a tested CSP. Account for Next.js scripts, local fonts, private Supabase media, blob/caption playback and development requirements. Verify actual hosted HTTPS/HSTS behavior; absence of HSTS on local HTTP is not itself a vulnerability.

**Acceptance:** Desktop/mobile sign-in, forms, uploads, sample, private player, captions and downloads still work; forbidden framing is blocked; hosted policy does not introduce unsafe broad origins or break Next.js script execution.

## Verified in this audit

| Area | New local evidence | Limits |
|---|---|---|
| Backend regression | All **113 tests passed** | Includes simulated provider, recovery, cancellation, validation, private workspace and retention paths; not a fresh live provider render |
| Database security/integrity | All **681 assertions in 19 SQL files passed** | Existing rollback-only suite; no reset or migration. Fresh-install/upgrade verification on a disposable database was not repeated |
| Type/lint/contracts | Root TypeScript, full web ESLint and API catalog freshness passed | No new build, full browser suite or hosted checks in this audit |
| API probes | Six passed: cross-origin mutation 403; missing CSRF 403; oversized body 413; invalid JSON 400; wrong content type 415; worker missing token 401 | No brute force, live provider dispatch or real user mutation |
| Database permissions | Every public application table has RLS; no public application function executable by anon; every inspected public/private security-definer function has configured search_path | Not proof every ownership branch is correct under every race |
| Privileged boundaries | Worker control/execution, private-media descriptors and cleanup RPCs are not executable by anon/authenticated | Service credential remains powerful and must stay server-only |
| Storage | Both sources and artifacts buckets private; size limits present; exact allocation policies and owner-scoped grants inspected | Hosted bucket/CORS configuration, egress allowances and native decoder hostile-file tests remain |
| Secret scan | 329 current text files, 218 reachable historical text blobs and 19 existing browser JS files checked; no pattern hits or matches for the current private values compared | Bounded pattern/exact-value scan, not proof about every binary, external log, unreachable Git object or historical unknown credential. No values printed |
| Data access | Existing owner/foreign-user/anonymous SQL tests passed; API verifies getUser, uses RPC/SDK parameters and sanitizes errors | No claim of an external penetration test |
| Rendering/AI | Structured allowlisted data, no found app/worker eval, Function constructor or unsafe HTML sink; native commands use argument arrays; dispatch/checkpoint fences and bounded retries inspected | Live arbitrary-topic quality and provider availability remain separate acceptance gates |
| Index/accounting | No unindexed public foreign-key prefix found in local catalog query; global/user byte and retained-output aggregates agree | Not an EXPLAIN/load study; storage byte limits are not database metadata/provider budgets |
| Architecture/UI | Existing shared shell, controls, account menu, dialogs and usage formatter present; live navigation selects real routes; previews remain isolated fixtures | No exhaustive visual/device acceptance repeated |

## Remaining acceptance beyond these findings

1. Protected W-30 operational health, safe repair, pause and audit controls; no blanket private-media browsing.
2. CI automation is not present in this repository. Add checks appropriate to the workflow; document a temporary manual release gate if CI is intentionally deferred.
3. Verify migrations on an isolated disposable database, never reset this user's local application database for review.
4. Hosted Supabase Auth configuration, allowed origins, provider state, private Storage settings, grants, quotas and backups/restore arrangements must be checked after provisioning.
5. Vercel environment separation, HTTPS headers, log privacy and error monitoring; separate local worker connectivity, startup and credential expiry/rotation procedure.
6. Maintenance scheduling/availability and documented legacy/unowned local-file handling. Existing watchers and their processes were not stopped by this review.
7. Real Education first-attempt generation and playback/download acceptance with an explicitly bounded input; verify relevant provider availability/free allowances without promising 90-second completion time. This audit did not consume AI quota.
8. Relevant desktop/mobile regression after fixes, staged concurrency/load tests with bounded mock work and no provider spending, queue latency and worker-offline recovery. Passing unit tests does not prove support for 100 concurrent generators.
9. Verify current disclosure of Education-only scope, creator-computer availability, seven-day access, deferred features and support/privacy requests; preserve the public-demo consent already recorded.

## Remediation — 12 November 2026

| Finding | Current state |
|---|---|
| SEC-01 | Application shared limiter verified locally; direct hosted Auth settings/edge verification remain W-31 |
| SEC-02 | Local draft/receipt/generation/allocation metadata bounds verified, including direct RPCs and grandfathered fixtures |
| SEC-03 | Local cross-job daily dispatch/admission budgets verified; safe cached-only retry preserved; remaining operational controls are W-30 |
| SEC-04 | Remotion patch set and targeted lint dependency fixed; fresh npm audit reports zero known advisories |
| SEC-05 | Nonce CSP and browser-header baseline verified locally, including real private playback/captions/downloads; hosted verification remains W-31 |

The initial evidence/advisory counts above describe the pre-fix audit. Current safeguards and manual checks are in [SECURITY-CONTROLS.md](SECURITY-CONTROLS.md). Confirmed auth transitions also replace the document to avoid a reproduced overlapping router-navigation failure and clear prior identity state.

Acceptance: 116 backend tests; 721 SQL assertions in 23 rollback-only files; root/web types and production build; full source/e2e/config lint with final touched-file checks; generated API/DB freshness; three real competing-connection limit checks; zero known dependency advisories. Twenty-four distinct desktop/mobile checks passed across scoped runs, including final auth-boundary/capacity/header/CSRF/menu/playback checks and earlier deletion/library pagination/MP4/SRT/VTT checks. Initial browser failures were investigated; the auth transition was corrected, and the lifecycle test now asserts a confirmed response with a bounded navigation wait matching the request deadline. Affected cases reran successfully. Patched Remotion rendered both orientations of two topic fixtures and produced two short silent MP4s, both fully decoded; these were synthetic, not live AI videos.

No paid activation, provider call, data reset, real user media deletion, allowance increase, key rotation, commit/push or deployment. The concurrency fixture cleanup's reserved SQL alias was corrected, its precisely scoped leftovers were removed, and the complete test reran cleanly. Existing data/accounting and final fixture removal were checked. The local web app and one refreshed Node 24 worker are running; maintenance watchers remain in place.

## Next work

Continue remaining essential W-30 protected operational health/repair and usage controls, then W-31 hosted/direct-Auth/edge/header/storage/backup/monitoring, remote generation and staged load acceptance. Local remediation does not complete R-05, full W-24, external penetration testing or deployment. No claim of support for 100 concurrent generators or vulnerability-free software is made.
