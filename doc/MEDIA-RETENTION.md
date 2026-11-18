# Private generated-media retention

W-24 Storage-retention slice, verified locally on 12 November 2026. PostgreSQL remains metadata/queue/accounting; binary media remain in private Supabase Storage. No R2 migration, paid activation or provider call. Full W-24 version/project deletion and hosted release work remain unfinished.

## Run with Node 24

From the project root:

```powershell
npm run media:cleanup
npm run media:cleanup -- --apply
npm run media:watch
```

The default is a bounded read-only preview. --apply runs one cycle; media:watch repeats nonoverlapping bounded cycles every 60 seconds until Ctrl+C. Default batch is 25; --batch accepts 1–100. Preview counts are bounded candidates, not an unlimited inventory. --owner UUID restricts every sweep/claim/acknowledgment to one account. An eligible backlog may take multiple cycles.

The watcher is separate from the render worker and loads private SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY from existing ignored configuration (explicit environment overrides local files). It makes direct outgoing Auth/Storage/RPC calls, with finite timeouts and redirects rejected. Browser clients and renderer worker tokens do not gain cleanup permission. No new secret or worker credential is needed. Hosted targets additionally require --allow-hosted and separately authorized hosted configuration; hosted setup has not been performed.

Automatic physical cleanup requires this private watcher and Supabase to be available. Run it alongside the local worker, and restart it after stopping/rebooting. Expiry-based access denial works even while maintenance is offline; physical cleanup and storage reclamation resume when maintenance returns. Stop the watcher before database/retention integration tests, whose deliberately eligible synthetic fixtures require isolation. This is a local process, not an installed Windows service or hosted scheduler.

## Safety and accounting

- Sweep marks successful expired revisions/exports Expired and clears only the matching latest pointer. Frozen titles/input and safe recorded duration/provider metadata remain readable to the owner. Editable drafts, valid results and other users are preserved.
- Reconcile expired output-slot deltas under the same quota locks as admission. Admission may already have retired a slot; expiry must not subtract it twice. Physical bytes remain charged until confirmed deletion.
- Queue only expired artifacts from stopped producers, with no active project job, future revision retention, live checkpoint/revision or live export reference. Original source uploads use their existing separate cleanup path; its 24-hour partial-TUS accounting is unchanged. Failed-job recovery remains protected for 48 hours.
- Respect artifact retention plus a conservative 24-hour late-transfer window after the producer finishes. The installed Storage SDK documents two-hour signed upload permits. Never remove an object while a live producer can still legitimately write it.
- Claim an immutable exact object under a 60-second, runner-bound increasing fence. Mark Deleting before external I/O so new references cannot adopt it. Storage deletion uses the Storage API, not raw deletion of storage.objects.
- A successful API removal plus absent Storage metadata is required before releasing the exact original artifact charge. Unknown/inconsistent charges block cleanup. Mark Deleted, invalidate dependent checkpoints and record one durable debit only after confirmation. Old runner acknowledgments, lost responses, competing processes and repeat sweeps cannot release twice.
- Failed I/O keeps bytes charged and records durable exponential backoff. Five claims exhaust automatic attempts and leave a Blocked task for operator review. After repairing the cause, a privileged operator can use npm run media:cleanup -- --apply --retry-task <UUID> (optionally --owner <UUID>). The RPC revalidates eligibility/accounting before resetting attempts. Logs contain aggregate counts/safe codes, not object paths, keys, prompts or private signed URLs. Inspect state/safe_error_code in the private cleanup_tasks table for backlog diagnosis.

## Verification and remaining boundaries

661 pgTAP assertions, 79 Node tests, existing real concurrency/worker/expiry regressions, root/web types, web lint, production build, generated type/contract freshness and whitespace passed. Real local Auth denies ordinary cleanup RPC calls. Scoped integration uploaded six tiny synthetic lifecycle files, waited for actual expiry, removed them through Storage, checked bytes before/absence afterward, and verified exact accounting, independent concurrent claims, abandoned leases, injected Storage failure and lost final acknowledgment. Files are synthetic byte payloads, not newly generated/decoded video or speech. SQL absence tests use transaction-local metadata simulation. No new AI generation or teacher-video verification was performed.

Existing W-23 desktop/mobile expiry/missing-file behavior was regression checked. Viewport-gated private thumbnails explicitly load eagerly after mounting to avoid development LCP diagnostics printing signed media links. Verification output redacts private links. Original local CLI demos and local-runs checkpoints are untouched; safe pruning of web-worker local workspaces remains a launch lifecycle check, not a claim of this Storage cleanup slice. Hosted credentials/scheduling/Storage behavior and public security/load acceptance remain release work. Full version/project/account deletion is separate.


Local verification command (stop the watcher first): `node --import tsx scripts/check-media-retention.ts`. It refuses hosted targets and creates/removes its own clearly synthetic account/files. The private watcher was started locally on 12 November 2026 after a zero-candidate preview; restart it after process shutdown/reboot. For a watcher launched in your terminal use Ctrl+C. The Codex-launched background watcher can be stopped by asking Codex to stop that specific cleanup process.

## Separate local-file lifecycle — 12 November 2026

Registered web-worker folder pruning is now a separately verified local slice; see [Local workspace cleanup](LOCAL-WORKSPACE-CLEANUP.md). Its watcher removes eligible local copies, not Supabase objects or accounting charges. Run both maintenance processes when needed. Legacy/unowned files and hosted operation remain release review items; this does not complete full version/project deletion.

## Explicit completed-video deletion — 12 November 2026

Owner-confirmed deletion hides one completed Education revision and schedules its artifacts through the same private watcher. The logical saved-video slot is released on acceptance; bytes remain charged until confirmed Storage removal. Explicit deletion can make that producer’s artifacts eligible before default seven-day expiry, but preserves the conservative 24-hour late-upload window, active-job checks and references from other revisions. Check cleanup status remains Pending while recent/shared files are protected or I/O is retrying. Ordinary users cannot claim/run cleanup. Existing downloaded/signed-link/local/provider copies retain their documented boundaries. See [video deletion guide](VIDEO-DELETION-ACCOUNT.md).
