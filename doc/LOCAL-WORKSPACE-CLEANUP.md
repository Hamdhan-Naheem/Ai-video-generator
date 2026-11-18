# Local web-worker workspace cleanup

W-24 local lifecycle slice, implemented locally on 12 November 2026. This complements [private Storage retention](MEDIA-RETENTION.md); it does not alter Storage quotas, grants, PostgreSQL rows or the wider version/account-deletion backlog.

## Commands

Use Node 24 from the repository root:

```powershell
npm run workspace:cleanup
npm run workspace:cleanup -- --apply
npm run workspace:watch
```

Default is a read-only preview. `--apply` executes one bounded cycle; `workspace:watch` repeats nonoverlapping cycles every 60 seconds. Default batch 25, supported range 1–100. A cursor rotates through records so retained entries do not starve later jobs. Run the watcher alongside the render worker and the separate private Storage watcher. Restart after reboot/process shutdown; this is not an installed Windows service. Reload the worker after upgrading to apply the new preparation/execution locks. No new credential or paid service is required. Hosted metadata requires explicit `--allow-hosted` plus separately authorized configuration; hosted operation is unverified.

The runner reads existing ignored server-side Supabase configuration. It makes bounded outgoing metadata reads, with redirects refused, and logs aggregate counts only. No media URL, prompt, key, filename or token is logged. `eligible` can include already-cleaned ID tombstones; `removed` counts actual removed folders. A failed/unsafe result is preserved and reported, not forced. Physical cleanup requires the maintenance process to run; it is not an exact deletion-time guarantee.

## Scope and protection

- Updated worker preparation and execution register an ID-only record in `.cache/worker-workspaces/records/<jobId>.json`. Only the exact corresponding `local-runs/web-<jobId>` tree can be removed. Records contain job/project/revision IDs and creation time, not input text or credentials.
- Original CLI runs, accepted demos, public samples, `.cache/worker/connection.json`, downloaded models/browser tools, test media caches and arbitrary OS temporary directories are outside scope. Unregistered legacy web folders are counted and preserved. They must be reviewed separately; this is not a retroactive purge of old development data or old renderer OS bundles. Never register a folder based on its name alone.
- `.keep-workspace` inside a registered job folder pins it for deliberate preservation. Remove that pin only after reviewing why it was retained.
- Every deletion checks actual server job/project/revision identity and status twice. Missing jobs, unreachable metadata, invalid timestamps, active leases and clock differences above five minutes preserve the folder. Unknown jobs are not assumed deleted or disposable.
- Successful jobs wait until both their seven-day result period and any later revision expiry have passed, plus a five-minute boundary margin. Failed/cancelled/Needs input jobs wait beyond 48 hours plus that margin. All folders also need 48 hours without filesystem modifications/creation changes. Queued/running/waiting jobs are never eligible. Frozen remote checkpoints remain the durable recovery source; the supported failed-job retry window is protected.
- Per-job locks live outside the removable tree. Preparation, execution, failure summaries and cleanup cooperate through the same lock. Competing writers/cleaners cannot enter concurrently. The lock does not expire just because time passes. Only exact nonce-specific owner records with an OS-confirmed dead PID are reclaimed, with empty-directory-only removal and ownership validation before work. Live/reused PIDs, malformed owners and ambiguous locks stay blocked. This conservative behavior can require operator review; do not remove a live lock to make progress.
- Root paths, records and candidate trees reject symlinks/junctions, special files and mount crossings. Each tree scan is limited to 10,000 entries and 16 levels. Immediately before recursive removal, absolute targets are revalidated under the exact local-runs root, the server state is reread, and the quiet-period/tree checks run again. Local OS administrators remain trusted; this is not a sandbox against someone who can rewrite the application or its filesystem.
- Cleanup leaves the ID-only record so a late stale-writer remnant can be detected on a later cycle. Partial deletion is retried under the same checks. No Storage usage credit is released by local-file cleanup.

## Renderer handling

Web renders explicitly put Remotion's copied-public-assets bundle in `<registered job>/.render-bundle`, disable that bundle's build caching and public-directory symlinking, and remove the bundle in `finally` on success/failure. An interrupted process may leave it inside the protected job tree for later cleanup. The original CLI renderer behavior is preserved. Shared tool/model caches and historical unowned OS temp directories are not swept indiscriminately.

## Verification

Run `node --import tsx scripts/check-workspaces.ts` against the isolated local Supabase stack. It creates/removes its own synthetic Auth/job/files. Actual metadata reads prove identity/status/server-clock handling. Both test clocks are advanced to simulate elapsed quiet time; no claim of a real 48-hour wait is made. Actual Remotion landscape/portrait stills use silent synthetic audio and verify that copied-audio bundles disappear. This is not new narration, a full video generation or hosted acceptance.

`test/workspaces.test.ts` covers read-only preview, eligible deletion/late remnants, active states, recovery/result periods, clocks, live/dead/corrupt locks, competing stale-lock reclaimers, unknown/offline/changing server state, pins/recent writes, path escape/junctions/linked metadata, bounded rotation and bundle cleanup after failure. Full root regressions cover existing adapter/checkpoint/cancellation behavior. Accepted demos are preserved.

W-30 protected operational checks and W-31 hosted security/scheduling/remote/load acceptance remain. Full W-24 version/project deletion remains unfinished. Review legacy unregistered folders and any historical unowned temporary artifacts before release; do not claim every local copy has been erased.
