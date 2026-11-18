# Local worker control and Education execution

W-15 supplies opaque worker authentication, fenced leases and heartbeat control. W-16 adds the per-scene Education executor and private verified publication. See [Education generation](EDUCATION-GENERATION.md) for current setup, activation, acceptance evidence and manual QA. Software/Branding execution remains W-28.

## Start locally

Use Node 24 and run these commands from the repository root with Docker Desktop
running. Existing users/data are preserved; do not run db:reset.

```powershell
npm run db:start
npm run db:migrate
npm run web:dev
```

In a second terminal:

```powershell
npm run worker:provision:local
npm run worker:start -- --once
npm run worker:start
```

Provision once, then reuse the existing file. The local setup command creates an
audited enabled worker and a 30-day opaque credential; it does not create provider
credentials. PostgreSQL stores only its SHA-256 hash. The plaintext connection
file is ignored at `.cache/worker/connection.json`. Never share, screenshot or
commit this file. Existing active credentials are reused, never silently rotated.
Expired/revoked credentials stop the worker and require an explicit operator
replacement procedure; rerunning setup does not replace them automatically.

The configured local origin is exactly `http://127.0.0.1:3000`. Start the web app
there, rather than mixing localhost or port 3001. Future nonlocal connections
require a root HTTPS origin. No inbound worker port is opened. The control parent does not load the root provider `.env` or receive a Supabase service key. W-16 loads provider configuration only in its isolated execution child. The API uses the
existing server-only service credential from the ignored web configuration.

`worker:start -- --once` verifies a control-only heartbeat, then exits. It does not claim work. Use `worker:run` for the Education executor. With claims paused,
it should report that its heartbeat was verified. It is not proof that generation
works. The long-running process keeps the heartbeat fresh; Ctrl+C stops it.
Dashboard online/offline reflects recent connectivity, not executor readiness.

To disable this local worker and revoke its credential explicitly:

```powershell
npm run worker:revoke:local
```

Revocation prevents future claims/callbacks. The private file is preserved, and
the database reclaims any abandoned assignment after its lease expires. Do not
delete another worker's records or manually overwrite the singleton processing slot.

## Lease and cache behavior

- Protocol 1 uses a 90-second server lease and 20-second active heartbeats. Each
  process has its own instance UUID. The same instance can recover a lost claim
  response; another instance cannot take that still-live assignment.
- Expiry closes the previous run and advances a monotonically increasing fence.
  Old callbacks fail with LEASE_LOST. Elapsed time and provider/repair counts
  survive reclaim. User deactivation/deletion/cancellation prevents renewal.
- Local TTL safety uses a monotonic clock and stops on a failed heartbeat; late
  responses cannot revive an expired local lease. Infrastructure outages back off
  to five minutes. Invalid/revoked credentials fail visibly rather than looking idle.
- Input metadata is cached under ignored `local-runs/web-<job UUID>`; mutable
  preparation records are under `attempts/<lease token>`. Atomic checkpoint writes
  validate both schema and exact immutable manifest content before reuse. There is
  no crash-stale job lock file, and accepted CLI demo directories are untouched.
- W-15 receives durable checkpoint metadata, not artifact bytes. Its preparation
  cache is not a completed AI stage or uploaded durable checkpoint. The W-15 preparation cache alone is not completion evidence. W-16 worker:run executes the real pipeline and publishes Ready only after verification.

W-16 implements scoped artifact transfer, validated stage checkpoints, bounded provider dispatch and verified Education publication. Software/Branding uploads still await their worker decoding adapters. Existing upload-only user limits
may be below the 160 MiB generation reservation; setup never raises those limits.

## Verification

```powershell
npm test
npm run db:test
node scripts/check-worker-control.mjs --http
```

The HTTP check requires the app running at the canonical local origin. Worker
integration checks require no active/queued jobs, an idle processing slot and both existing pauses on.
They create disposable UUID-scoped metadata only, race actual PostgreSQL sessions,
restore pauses before each admission/claim transaction commits, and remove their
own records/reservations. They need 160 MiB of existing free global allowance and
never enlarge it. Tests do not call Gemini, synthesize audio, render video or read
private user media. SQL fixture checkpoint metadata is explicitly synthetic.

Manual checks: run `--once`, then keep the worker running and refresh Dashboard;
stop it and wait over 90 seconds before refreshing to see offline. Confirm real
profile/draft navigation still works and Generate remains disabled. Inspect
workers, worker_credentials, worker_slots, jobs and job_runs in postgres/public;
do not expose credential hashes/private snapshots in browser views or screenshots.

## Registered local workspaces — 12 November 2026

Updated preparation, Education execution and failure-summary writes register and exclusively lock their job workspace. The separate `npm run workspace:watch` process prunes only eligible known terminal work after retention/recovery and local quiet periods. Web-render copied-audio bundles stay inside the registered job and are removed after rendering. Restart the worker after upgrading. Original demos, credentials, tools and unregistered legacy folders are preserved. See [local workspace cleanup](LOCAL-WORKSPACE-CLEANUP.md) for preview/apply commands, lock recovery and release boundaries.

## Linux packaging — 13 November 2026

The approved Linux x86_64 Docker prerequisite is documented in [Linux worker](LINUX-WORKER.md). It is separate from the Windows installer and does not itself provision/pair a hosted worker. Keep existing local credentials/private data; do not run two claiming workers with the same local setup to test the image.
