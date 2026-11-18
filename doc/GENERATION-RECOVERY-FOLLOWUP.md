# Generation recovery and progress correction — 12 November 2026

This is a correction to W-16/W-17/W-18/W-19/W-20 before W-30, requested after a real Education generation stopped several times.

## Diagnosis and limits

Read-only inspection found three failed requests followed by a successful fourth request. Repeated Generate clicks submitted distinct jobs; they did not resume the failed request. Provider calls were recorded as successful, so the historical stops were in processing/validation after those calls. The two story-stage failures did not preserve invalid raw responses; their exact rejected fields cannot be established retrospectively.

The saved voice-stage failure did preserve Whisper timing. Its final caption extended 360 ms beyond the measured 12.64-second audio. The old strict validator allowed only 150 ms. The new Whisper-specific boundary step clamps an overshoot of at most 500 ms only when the word starts before the real audio ends, then runs the unchanged strict validator. Larger overruns, words outside the audio and overlapping/invalid intervals still fail. Words and start times are preserved; audio is not stretched. The saved failed sample passes offline with this correction; its original files were not changed.

Known final story-validation and caption-timing failures now use existing bounded recovery categories. Provider refusals, authentication/configuration errors and uncertain outcomes are not silently retried. Existing attempt, repair, resource and cost limits remain authoritative. Safe worker diagnostics record the failed stage and allowlisted validation categories without raw input, narration, provider responses or credentials. Historical generic failures are not reclassified automatically.

## User flow

1. Fill the Education form, acknowledge processing and choose Generate. A confirmed submission opens `/projects/<id>/progress`, which contains no input form.
2. Follow Step 1–4, actual stage status and prepared narration-scene counts. The narration percentage measures completed scenes only; there is no invented overall percentage or completion estimate. Check status is a read, not a new generation.
3. On a recoverable failure, choose Retry generation. This keeps the same job, frozen input, revision and valid completed checkpoints within remaining limits. A lost retry response exposes Check retry request, using the same idempotency key. Unsafe/exhausted failures show an explanation and disabled Retry unavailable action.
4. Cancel generation has a pale green background, visible border and existing confirmation. Cancellation preserves the saved draft.
5. Edit saved draft opens the editor separately. Latest progress remains available by link. Choosing another generation requires explicit confirmation about additional AI usage. A lost original submission is reconciled before treating newer edits as another request; those edits remain in the form until saved.
6. Ready opens the existing pinned Watch and download result. Dashboard Education projects with a generation open progress; saved drafts still open the editor.

Local authentication permits the exact owned progress return route. Ownership checks and the existing API/database contracts remain enforced; no database migration is required.

## Manual acceptance

- Generate from a saved valid Education input: progress opens without the editor below it; reloading preserves status.
- Open the draft from progress, then return via View progress and recovery. Repeated Generate requires confirmation; Keep editing creates no request.
- For an eligible stopped request, Retry keeps the same reference and saved input. For an unsafe failure, read the explanation rather than submitting repeated fresh generations.
- Check Cancel visibility on desktop/mobile; dismiss its dialog, then confirm cancellation on a disposable request if desired.
- When Ready, follow Watch and download and verify playback/captions/download. The existing successful user video was preserved.
- Disconnect/reconnect the browser: last known status remains; background checks do not discard edits in a separately open editor.

The automated evidence is recorded in PROJECT-TRACKER.md. Browser checks use synthetic jobs and injected failures, not new provider generation. A worker must be running for actual queued requests; restart `npm run worker:run` after a machine shutdown. W-30 remains the next planned implementation task.

## Follow-up: story retry receipt conflict

A newer request exposed a separate retry defect: a successful-but-invalid story response was not reusable as a valid story, yet retrying its identical provider operation was correctly blocked by the database. Future requests now save sanitized rejected-pass receipts keyed to the plan dependency hash. A restart continues with the remaining distinct correction under the existing two-repair maximum. Valid stories remain cached; uncertain outcomes do not authorize another call. Transport errors distinguish reconciliation conflicts from actual lease expiry. Historical requests without these receipts stay operator-reviewed; do not reset their counters or repeatedly create fresh requests to work around the guard.

103 backend tests and root types pass locally. Live generation was not rerun. Model/voice listing checks confirm configuration access, not remaining Gemini quota or ElevenLabs synthesis credits; check the respective provider usage dashboard before live release acceptance. See the dated tracker for exact evidence and remaining gates.

## Follow-up: zero-duration Whisper boundary tokens

A later live request produced a zero-length first-word interval at the exact start of the following measured interval. The Whisper-specific adapter now groups such boundary words into the adjoining real interval without dropping text or inventing per-word duration. Isolated/negative/overlapping/out-of-bounds intervals still fail; the general validator is unchanged. Both actual saved narration samples pass offline with full script-word coverage. 105 backend tests and root types pass. Same-job Retry remains eligible and reuses the story, completed scene checkpoint and cached audio; remaining unfinished voice/render work is not represented as complete.
