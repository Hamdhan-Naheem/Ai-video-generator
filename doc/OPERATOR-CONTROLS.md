# W30 protected operational controls

Essential showcase operations use a protected API and a private Node command-line tool. The advanced admin screen, worker credential creation/rotation, arbitrary provider-outcome reconciliation and automatic hosted maintenance remain separate work. This is local acceptance, not a production sign-off. You will perform deployment yourself with the W31 instructions.

## What is available

| Action | Behavior |
|---|---|
| Health | Online/enabled worker state and credential expiry, queue counts, expired assignments, storage accounting totals, cleanup backlog and observed provider states |
| Daily budget | Actual application dispatch counters: 12/account and 24 globally per UTC day; failed/uncertain dispatches count. External provider credit/token balances remain **unknown** |
| Job inspection | At most 25 job summaries per page: IDs, stage, status, lease, consumed budgets and stored complete-checkpoint count; no titles, scripts, prompts, personal notes or media links |
| Pause/resume | Version-checked flags for new generation admission and new worker claims; current assignments continue. This is not cancellation and does not raise budgets |
| Expired-assignment repair | Requires paused claims, exact displayed lease token, matching job/slot/worker/instance and both leases expired. Reuses the existing fenced state machine |
| Audit | At most 25 mutation summaries per page. Accepted mutations record actor, request ID, fixed reason code and safe control/state metadata; reads do not append unbounded audit events |

Health is a database view, not an external provider probe. Provider observations older than 15 minutes become unknown. Missing/expired worker credentials, offline workers, uncertain requests, blocked cleanup and accounting drift require investigation. Accounting agreement compares database totals; it does not prove that every object in Storage has been inventoried. A maximum of 50 worker summaries and 50 current-day account budget summaries are returned.

## Authorization and passwords

Every HTTP action verifies the Supabase user and active protected `profiles.role='operator'`. The database repeats the role/status check. A role in signup metadata, a request body, a cookie supplied without verification or a worker token cannot grant this access. Operators still cannot browse other users' projects/media through ordinary owner routes. Direct privileged table access stays denied.

No real account was promoted and no production password/key was created for W30. The acceptance accounts are disposable and removed. During setup, the database administrator must deliberately grant operator status to an approved **Auth user UUID**, independently verified as yours. Never grant by a self-declared email address or automatically make the first signup an operator. W31 will walk you through that setup; no public grant-role endpoint exists.

The CLI uses that operator's existing email/password through the normal application sign-in endpoint and its shared auth limiter. It creates an in-memory cookie jar, obtains fresh CSRF tokens and attempts local-session sign-out in `finally`; it does not save cookies/refresh tokens or sign out your separate browser session. No Supabase service-role key is needed by the operator tool. Private service authority is used only by the local test fixture harness.

Create the private `.cache/operator.env` with your editor when an operator account has been explicitly configured:

```dotenv
APP_ORIGIN=http://127.0.0.1:3000
OPERATOR_EMAIL=your-operator-email@example.com
OPERATOR_PASSWORD="your-existing-password"
```

This is a plaintext private configuration file, not encryption. Keep the directory private. On Linux restrict the file to its owner (`chmod 600 .cache/operator.env`); the CLI rejects group/world-readable files. On Windows restrict its Security permissions to your account/administrators. Never paste its contents into chat, screenshots, terminal command arguments, GitHub or Docker image build arguments. `.cache` is ignored and excluded from the worker image. The CLI accepts only these three configuration fields; do not copy provider/server `.env` files into it.

Local CLI requests use exactly `http://127.0.0.1:3000`. Hosted origins require root HTTPS and explicit `--allow-hosted`; redirects are refused. Cookies and credentials go only to the configured application origin, not to model providers. Browser mutations retain same-origin/CSRF checks, JSON/body limits and private/no-store responses.

## Read health and jobs

From the repository root with Node 24 and the app running:

```powershell
npm run operator -- --command health
npm run operator -- --command workers
npm run operator -- --command jobs --status running
npm run operator -- --command jobs --before <nextCursor>
npm run operator -- --command audit
```

Use a custom private file with `--config <path>`. Hosted example, **only after you configure and deploy the target**:

```sh
npm run operator -- --config /secure/operator.env --allow-hosted --command health
```

Each invocation signs in and signs out; this tool is for occasional operations, not one-second polling. API/SQL operations share a 60-inspection/10-mutation limit per operator per minute, with a bounded Retry-After. State-conflict mutation attempts count. Structural validation failures are rejected before execution. Normal public sign-in limits also apply. Receipt history is capped at 5,000 per operator, expires after 30 days, and is pruned on operational activity; this task does not schedule a cleanup service. These operational limits do not replace or increase generation/provider/storage budgets.

## Pause and resume

Read health first and note `controls.version`. Generate a request UUID **once**, then retain it if the response is uncertain:

```powershell
$operationId = [guid]::NewGuid().ToString()
npm run operator -- --command controls --expected-version <displayed-version> --claims-paused true --request-id $operationId --reason maintenance
```

To stop new generation submissions too, include `--generation-paused true`. To resume use `false` and the newly displayed version from a fresh health read. Only those two flags can be changed; limits, models, credentials and paid access cannot be edited here. A no-op preserves flags, version and modification metadata, while still producing one audited receipt.

Reason codes: `maintenance`, `provider_outage`, `storage_review`, `release_check`. Free-text notes are deliberately excluded to prevent accidental secret/PII logging.

If a response is lost, rerun the **same request UUID and exact arguments**. Do not regenerate the UUID or edit the payload for that retry. The receipt returns the original result without repeating the mutation; it is historical, so read health again to confirm current controls. Stale versions or changed payloads return conflict and never silently overwrite newer actions. There is no automatic mutation retry.

## Repair an expired assignment

1. Pause new claims and inspect the job. Do not stop a healthy live assignment.
2. Read its exact `leaseToken` as a string; never round it through JavaScript numbers.
3. Wait for both the job and slot leases to expire, then run:

```powershell
$operationId = [guid]::NewGuid().ToString()
npm run operator -- --command reconcile --job <job-uuid> --expected-lease <displayed-token> --request-id $operationId --reason maintenance
```

The operation locks usage globally first, then the owner/slot/profile/project/revision/job, and rechecks state after locking. A live/renewed lease, changed fence, mismatched slot or unpaused claims returns conflict. It cannot force Ready, clear another worker's assignment, erase provider history or refund consumed AI allowance.

Valid expired work becomes queued with preserved checkpoints/reservation and accumulated attempts, repairs and active time. Cancellation takes precedence. Removed/expired inputs and exhausted budgets keep the existing terminal rules. An unconfirmed provider request becomes `outcome_unknown` and the job stops for operator review instead of blindly sending another paid/uncertain request. Unused reservation is released through the existing terminal helper once; already charged artifacts and successful work are retained for their lifecycle cleanup.

Inspect the result and audit, then resume claims only when appropriate. The worker revalidates checkpoints before reuse. Corrupt/orphaned assignments or uncertain provider outcomes need separate investigation; do not delete slot rows, reset counters or mark a request `not_sent` to bypass safeguards.

## Implemented HTTP contract

All paths are below `/api/v1/operator`; responses use the existing `{data}` / safe `{error}` envelope.

| Method/path | Request |
|---|---|
| GET `/health` | No query |
| GET `/workers` | No query |
| GET `/jobs` | Optional `status`, UUID `before` cursor |
| GET `/audit` | Optional UUID `before` cursor |
| PATCH `/controls` | `{requestId,reason,expectedVersion,generationPaused?,claimsPaused?}` |
| POST `/jobs/:id/reconcile` | `{requestId,reason,expectedLeaseToken}` |

Unknown query/body keys and duplicate query parameters are rejected. Role failures use `OPERATOR_REQUIRED`, state/version conflicts use `STATE_CONFLICT`, shared throttling uses `RATE_LIMITED`. Supabase RPC `operator_console(action,payload)` is authenticated and independently role-gated. A bare service-role call is not an operator session. Mutations have per-actor exact-payload receipts and safe audit entries, pruned after 30 days of retention on subsequent operational activity. Existing owner retry/cancel and media-cleanup tools are unchanged.

The wider design's worker provisioning/revocation/rotation, arbitrary tester retry/cancel administration, cleanup-task UI and account-deletion management are not silently exposed by these endpoints. Hosted worker pairing and scheduled maintenance remain W31; advanced administration remains deferred.

## Verification

Complete locally — essential showcase controls, 13 November 2026. Advanced administration and hosted acceptance remain deferred/pending.

- All 124 backend tests passed, including six operator validation/client/API cases and failed-signout credential cleanup. All 770 SQL assertions across 24 transaction-isolated files passed, including 49 operator cases: real authenticated-role access, tester RLS isolation, protected-role checks, no secret projection, pause continuity, stale versions, exact replay, lease fencing, cancellation, uncertain-provider stop, budgets/checkpoints/reservations and throttling.
- Four real concurrent/held-lock checks passed: one receipt/audit for duplicate commands; exactly one last mutation slot; unchanged live controls/metadata; ordinary users rejected without waiting on a held generation lock.
- Seven local production HTTP/CLI checks passed: anonymous/tester denial; strict operator projections; cross-origin/CSRF rejection; no-op/replay/stale version/audit behavior; actual private-config CLI/session independence; immediate role revocation with existing cookies; unchanged real controls/quotas/version/metadata. Disposable accounts, audit/receipt rows and temporary private configs were removed. No real account was promoted.
- Root/web TypeScript, full web lint and production build passed. Generated API/DB types are fresh. All three accepted original Education exports still pass full decode/stream checks. No UI changes required new visual browser acceptance; native hosted behavior remains W31.
- Bounded current-source/browser check: 382 text files including 19 browser JS files checked against 4 existing private values; no matches. No claim about unscanned binaries, all historical artifacts or hosted configuration. Fixture account/private-file counts are zero; active generation count was zero at final audit, with the approved 400 MB global limit and zero reserved bytes unchanged.
- The local app was rebuilt and is running at http://127.0.0.1:3000. No fresh AI request, paid activation, deployment, real-media deletion, DB reset, real-user privilege change, credential rotation, commit or push.

Remaining release work is W31: user-run hosting/configuration, direct Auth/edge/origin/header/cookie checks, hosted worker credentials/maintenance, legacy lifecycle review, real remote Education generation/play/download including duration/resource acceptance, and staged load/rollback/shutdown checks. This is not production sign-off.

Repeat local checks:

```powershell
npm test
npm run contracts:check
node scripts/check-operator-concurrency.mjs
node --import tsx scripts/check-operator-http.ts
```

The HTTP harness requires the isolated local Supabase/app origins, creates random disposable operator/tester identities and a private fixture config, verifies actual authorization/CSRF/no-op/replay/revocation/CLI behavior, and deletes them. The concurrency harness checks duplicate receipts and the last mutation slot without changing real control flags/version/metadata. Database pgTAP coverage is in `supabase/tests/operator.test.sql` and rolls back all synthetic settings/counters/leases. Neither harness executes an AI job or touches real user media.
