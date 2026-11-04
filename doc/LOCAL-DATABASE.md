# Local Supabase / PostgreSQL

W-04 adds the application database foundation. Supabase runs PostgreSQL, Auth, private Storage, the REST gateway and Studio in this application's own Docker stack. It is a separate instance from other PostgreSQL databases on this computer. The web UI remains a fixture preview until W-05 and subsequent integration tasks.

## Start and inspect

Use Docker Desktop (Linux containers) and Node 24. From the repository root:

```powershell
npm ci
npm run db:start
npm run db:status
npm run db:test
npm run db:types:check
```

The pinned Supabase CLI is a development dependency. First start downloads official images and takes longer; subsequent starts reuse images and the local database volume. `db:start` verifies a dedicated Docker network and actual localhost port bindings. Docker Desktop on this machine ignored the network's default binding; the wrapper recreates only this project's three published services with explicit `127.0.0.1` mappings, preserving named volumes, mounts and gateway files. It does not alter global Docker settings or other projects' containers. Use the npm wrappers rather than raw `supabase start`/`db reset`, which can restore wildcard port bindings. This workaround was verified with Docker Engine 29.5.3 (API 1.54), Docker Desktop 4.77.0 and Supabase CLI 2.122.0. No hosted Supabase project, external AI service, paid service or deployment is needed.

| Tool | Local address |
|---|---|
| Supabase Studio | http://127.0.0.1:55423 |
| Supabase API | http://127.0.0.1:55421 |
| PostgreSQL | `127.0.0.1:55422` |
| Migration shadow DB port, when needed | `55420` |

In Studio, open Table Editor / Database to inspect `public` tables. `auth.users` and `auth.identities` belong to Supabase Auth; passwords are never stored in a custom application table. The `private` schema contains authorization/integrity helpers and is not exposed through the Data API. Foreign keys make the relationships inspectable in Studio and pgAdmin.

To use pgAdmin, register a new server named **AI Video Studio — local**. On Connection use host `127.0.0.1`, port `55422`, maintenance database `postgres`, username `postgres`, and the local development database password. Retrieve local connection details privately with `npx supabase status`; its output also contains development API keys, so do not paste it into chat, screenshots or committed documents. Inspect Databases → postgres → Schemas → public → Tables. Use pgAdmin's ERD tool to view foreign keys. This connection is unrelated to any pre-existing PostgreSQL server registered in pgAdmin.

`npm run db:stop` stops only this application's Supabase containers and preserves the volume. Keep Docker running while using Studio or database tests. No local mail server, SMTP delivery, Google credentials or provider calls are required for W-04.

## Versioned schema

SQL migrations under `supabase/migrations` are the source of truth; commit them with `config.toml`, SQL tests, the database command script, generated types and this guide. Do not commit `.temp`, `.branches`, signing keys, `.env` files, Docker volumes, caches or CLI logs. The nonsecret local configuration is not production configuration.

The ten migration batches cover:

1. Profiles, protected signup trigger, OAuth/reauthentication records and deletion lifecycle.
2. Owned projects and immutable revision requests, optimistic draft versions and scoped relationships.
3. Workers, leases/slot structure, jobs, attempts, safe events and bounded repair/replay records.
4. Plans/scenes, media, upload allocations, checkpoints, references, timings and exports.
5. Usage accounts/reservations/ledger, cleanup, rate limits, audits and idempotency.
6. Explicit user read policies, restricted mutation primitives and private Storage allocation policy.
7. Integrity guards, foreign-key indexes and safely paused nonsecret defaults.
8. Restricted terminal account-purge support for validated plans and OAuth destination alignment.
9. Immutable scene-plan membership, closing concurrent validation/reparenting races.
10. Permit draft metadata edits after an unchanged latest result expires; preserve fresh pointer assignment checks.

Every application table enables RLS at creation. Anonymous users have no application reads/writes. Active users can read only their own nondeleted data and safe job/event columns. The operator role does not grant access to other users' private media. Internal tables have no browser read policy or grant. Direct application DML is denied to browsers. Authorization uses immutable Auth user IDs, never email matching.

`update_display_name` and `save_project_draft` are narrow SQL primitives for later API integration: actor comes from the verified JWT, role/status cannot be assigned, profile/project locks serialize changes, and expected versions reject stale writes. These do not complete W-05 or W-09. Draft JSON deliberately permits incomplete input; API validation must enforce the versioned shared contracts before saving, and complete validation/acknowledgments must run before generation.

Storage permits browser INSERT only for the exact live, reserved source allocation belonging to the active owner and live draft. It rejects arbitrary names, output uploads and overwrite. Supabase's protected Storage owner retains managed table grants; RLS supplies no browser SELECT/UPDATE/DELETE policy, so these grants expose no rows and cannot authorize signed reads or overwrites. Server-side download authorization and actual uploaded-media decoding/verification remain W-11/W-20 work; MIME/byte metadata is not proof of file content.

Cross-owner/project foreign keys protect references even from accidental privileged writes. Revision inputs and retention timestamps are immutable; validated plans/scenes cannot be edited; unavailable assets cannot gain references. Ready metadata requires consistent export/artifact evidence, but actual media verification and transactional publication are later worker/queue work.

Generation and claims start paused. The global byte allowance is **zero until explicitly configured** from the chosen storage plan. Defaults record the approved three retained outputs, one active job/user, one processing slot, seven-day retention and 60-second signed reads. Schema constraints are not a completed admission/cleanup engine: atomic quota accounting, claim/heartbeat fencing, provider dispatch, finalization, cancellation and physical cleanup remain W-14 onward.

## Tests and regeneration

`npm run db:test` includes a 38-case PostgreSQL/shared-Zod OAuth destination comparison and runs pgTAP in a rollback transaction with synthetic users, followed by real concurrent PostgreSQL sessions testing optimistic conflict, rollback and the single-active-job constraint. Fixtures use reserved test IDs and `.invalid` emails; no provider calls or stored media bytes are involved. Do not run this development suite against a shared/hosted database. The command is fixed to this local container and verifies its localhost port bindings first.

For pending forward migrations on the existing local database (preserves data):

```powershell
npm run db:migrate
npm run db:test
npm run db:types
npm run db:types:check
```

For explicitly disposable schema rebuilds:

```powershell
npm run db:reset -- --confirm-local-reset
npm run db:test
npm run db:types
npm run db:types:check
```

**Reset deletes this application's disposable local database, including any local test accounts and media metadata.** It explicitly uses `--local`; no remote URL or linked project is accepted by the wrapper. Use migrations for databases containing work you need to preserve. Never use `docker volume prune` or remove other projects' volumes.

Generated `shared/database/database.types.ts` describes database storage, not the public JSON API. Continue using `shared/contracts` for browser-safe DTOs, decimal-string counters and input validation. Never import server credentials or raw internal tables into the frontend.

`npm run db:verify-migrations -- --confirm-local-reset` resets this disposable stack fully, then resets to the first migration and applies the rest incrementally. It compares schema-only dumps (including application constraints, functions, policies and grants), preserves localhost bindings after resets and leaves the full schema installed. Run `db:test` afterward. Do not edit migrations after applying them to a shared environment; add a forward migration.

## Remaining integration gates

Next is **W-05: real email signup/signin and editable display name**, using these profiles and policies. Configure server/browser Supabase clients separately, generic auth errors, password policy and real-session tests. V1 has no verification or reset-email UX. Google login, automatic identity-link/pre-registration collision tests and session routing follow W-06/W-07; they are not established by this local SQL suite. Production credentials, limits, migration deployment, backups and release security review are future explicit steps.

References: [Supabase local development](https://supabase.com/docs/guides/local-development), [database tests](https://supabase.com/docs/guides/local-development/testing/overview), [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security), [project database design](DATABASE-DESIGN.md), [tracker](PROJECT-TRACKER.md).

## Missing development dependency

If db:start reports that node_modules/supabase/dist/supabase.js cannot be found, the local Supabase CLI dependency is not installed. A dependency installation that omits development packages also omits this CLI. From the project root run:

```powershell
npm install --include=dev --include=optional
npm run db:start
```

Wait for npm to finish downloading the platform binary before retrying startup. The same repair applies to “No matching Supabase CLI binary package found”; include optional packages so the Windows executable is installed. This restores the project dependency; it does not reset the database. No global CLI installation is required. Use Node 24 for the complete project toolchain. The reported MODULE_NOT_FOUND failure was caused by the absent package, not by the Node 22 version shown beneath the error.

If npm reports an error opening package-lock.json after installing files, check npm run db:start separately: the CLI may already be restored. Do not reset the database to repair an npm filesystem error. Confirm the lockfile is writable before a full reinstall. The 27 October repair verified the pinned CLI, startup/status, Studio and all 34 regression tests even though the broad installer could not save that existing lockfile.


## Restricted validated-plan purge (review repair)

Validated plans/scenes remain immutable during ordinary use. Migration 008 adds public.purge_revision_plans(uuid), executable only by the server service role. It requires account-deletion status purging, a deleting profile with a deletion timestamp, tombstoned project/revision and no active owner jobs. The function locks rows before clearing the selected-plan reference and deleting scenes/plans; existing timing references must be cleaned first. Normal updates/reopening stay blocked. This is a building block for W-26, not a public account-deletion endpoint or proof of fresh reauthentication/physical cleanup.

The same migration aligns oauth_flows.return_path with GoogleSignInRequestSchema: /dashboard, /videos, /settings, /projects/new and /projects/<canonical UUID>. Existing /create rows are mapped to /projects/new; new unsupported destinations are rejected. The SQL suite verifies actual constrained inserts, while db:test checks predicate parity against the real shared contract.


## Scene membership (review repair)

Migration 009 prohibits changing an existing scene's plan_id, even between candidate plans. Insert a new scene row to reuse content in another plan; candidate content can still be edited within its existing plan. This removes the unlocked-source reparenting path while preserving validated immutability and migration 008's restricted terminal purge.

db:test now includes a deterministic two-session validation/move regression in addition to 134 pgTAP assertions and the previous concurrency/contract checks. Validation stays uncommitted until the move has been rejected, then the test checks that the validated source retains all four scenes. It creates only synthetic records and removes them through the authorized purge path afterward; it does not reset your database.


The November 4 expiry regression also runs through db:test: scripts/check-draft-expiry.mjs commits a valid synthetic ready result, waits for its real short remaining retention to expire, and saves through the authenticated draft RPC before any cleanup. It verifies persistence, expired-result read denial, optimistic conflicts, rejected expired reassignment and tombstone checks, then removes its own random-UUID metadata fixtures. No triggers are disabled, no retention is rewritten, and no Storage bytes or AI calls are involved.
