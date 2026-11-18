# Video deletion, usage and account controls

The Education library and pinned result pages provide a Delete video action. It removes one generated revision; saved drafts, other results and the approved public sample are preserved.

## Deletion behavior

- Confirmation names the frozen title and version and initially focuses Cancel. Dismissing the dialog makes no request. Pending deletion keeps the dialog non-dismissible.
- The user-authenticated DELETE endpoint uses the exact owned project/revision and expected immutable version. It rejects foreign/deactivated accounts, invalid versions and active generation in that project. Extra fields and unsupported queries are rejected; same-origin CSRF is required.
- Deletion atomically clears the matching latest-ready pointer, hides the revision, expires ready exports and schedules cleanup. The logical saved-video slot is reconciled once. The mutable draft/input stays intact. A repeated request safely returns the same deletion status, including after a lost reply.
- New media grants stop immediately. Already downloaded bytes cannot be recalled; previously issued signed links can remain valid for their remaining lifetime, at most 60 seconds.
- Physical files are removed by the existing private media watcher. Byte charges remain until Storage deletion and absence are confirmed. The conservative 24-hour late-upload window after producer completion is preserved; shared references and active jobs also prevent premature removal. Recent videos may therefore remain charged while cleanup is pending. This is not instant storage reclamation.
- Check cleanup status reports pending or complete for the owned deleted revision. Cleanup I/O failure/backoff and operator-required reconciliation keep bytes charged. No browser or ordinary account gains cleanup/table privileges.
- Local worker copies follow their separate registered-workspace retention policy. Deleting a video does not bypass that recovery/quiet window or erase every provider/local/downloaded copy immediately.

## API and migration

- `DELETE /api/v1/projects/{project}/results/{revision}`: `{expectedVersion: positive integer}`; returns `{deleted:true,revisionId,cleanupState:"pending"|"complete"}` with 202 while pending or 200 when complete.
- `GET /api/v1/projects/{project}/results/{revision}/deletion`: owned safe cleanup receipt; no object keys, signed URLs or credentials.
- Migration `20261112000002_delete_video.sql` adds owner-only RPCs and extends the existing cleanup eligibility helper for explicitly deleted producers. Deferred export invariant reads run as the internal function owner with direct execution revoked from ordinary roles. No existing user result is deleted by applying the migration.

## Usage display and account menu

The dashboard uses decimal units matching configuration: 200,000,000 bytes = 200 MB. Saved videos and used storage are prominent; zero reservations are under How usage works. Nonzero reservations remain visible. These application allowances are distinct from Supabase plan limits. Stored bytes include generated video/audio/caption/supporting assets, not just the downloadable MP4.

The desktop profile and mobile avatar are accessible disclosure buttons with Account settings and Sign out. Escape closes the menu and restores focus; outside click dismisses it. Sign out reuses the existing local-session API with shared confirmation in both menu and settings. Cancelling leaves the session intact; confirming signs out this device, not active generation.

## Manual checks

1. Use a disposable video. Dismiss Delete video with Cancel/Escape and verify it remains.
2. Confirm deletion: the card/player disappears, the draft remains, new access is denied, and the saved-video slot updates. Check cleanup status; storage may stay charged during the safety window.
3. Try the account control on desktop/mobile. Test Escape/outside click, Account settings, Cancel sign-out and confirmed sign-out.
4. Check usage appears as MB/GB rather than large raw byte counts. Expand How usage works for reservation details.

See PROJECT-TRACKER.md for automated evidence. Hosted retention scheduling, full project/account deletion and W-30 operational repair remain separate release work.
