# Education generation (W-16)

The local web/worker integration now creates Education videos from saved topics.
Software and Branding forms/uploads remain available, but their generation adapters
are W-28. Google sign-in remains deferred. This is local verification, not a deployment.

## Start the application and worker

Use Node 24. Start Docker Desktop, then run from the repository root:

```powershell
npm run db:start
npm run db:migrate
npm run web:dev
```

In another terminal:

```powershell
npm run worker:run
```

The canonical address is `http://127.0.0.1:3000`. Sign in and open
`/projects/new?mode=education`. `/preview/*` remains a disconnected design preview.
`worker:run` enables the Education executor. `worker:start` is a control-only
heartbeat and does not claim generation jobs. Do not run dev and build together.

The parent worker uses the existing ignored `.cache/worker/connection.json`.
Its isolated execution child loads the ignored root `.env` for the existing
Gemini/planner/TTS configuration. Provider credentials never go to the browser or
web server. The web server retains its existing server-only Storage credential.
No new provider credential, paid plan or billing upgrade is configured here.

## Account allocation and activation

The implementation does not automatically enlarge account allowances or turn off
the existing generation/claim pauses. The upload-only 120 MB account allowance is
smaller than the 160 MiB admission reservation; an Education-only account may not
yet have an allowance. Generation remains unavailable until reviewed local setup.

Preview an allocation for an existing local sign-in account:

```powershell
npm run education:configure -- --email your-local-sign-in-email --bytes 200000000
```

This is read-only. After reviewing the exact account allowance, add `--enable`
to apply it. The command requires verified light-video evidence, a valid existing
worker and an idle queue. It keeps the original global budget unchanged, preserves
stricter existing output limits, audits the local change, and enables Education
only. It changes application storage allocation, not provider credential limits.
Do not copy private email addresses, tokens or `.env` files into documentation.

Keep `worker:run` running and refresh the form after activation. Availability
requires a recent executing-worker heartbeat as well as configured account/global
capacity. Connection alone does not prove provider quota is currently available.

## What happens after Generate

1. Required content/settings and both rights/AI-processing acknowledgments are
   checked. The current form is saved before its immutable request is admitted.
2. PostgreSQL reserves existing capacity and returns a durable job receipt.
   A lost response is reconciled with the original key/payload; edits made while
   waiting stay in the form. A later Save changes the draft, not the queued input.
3. The worker validates the frozen text-only Education input, builds a bounded
   four-to-six-scene plan, and narrates/measures each scene. Provider timestamps or
   local Whisper.cpp supply actual captions; Rhubarb supplies actual mouth cues.
4. Scene audio is concatenated at measured, frame-aligned boundaries. Remotion
   renders a clean H.264/AAC video, with a teacher and light illustrative layout.
5. Full decode, 720p dimensions, 30 fps, duration, audio, caption/script coverage
   and mouth-cue checks must pass. The API confirms scoped private artifacts and
   stores a verified clean export before atomically publishing Ready.

The project page shows minimal processing status and, when Ready, links to the
private video and SRT/VTT. Each media link is authorized afresh, is private/no-store
and has at most a 60-second signed lifetime. Results expire after seven days.
The full progress/result-player/version/library/cancellation workflows remain
their later numbered milestones; no invented progress percentage is shown.

## Budgets and recovery

- The original 24-attempt lease safeguard remains intact. W-16 uses a stricter
  23-dispatch ceiling so the last permitted dispatch can still be recorded and
  finalized. Every real HTTP retry has its own durable grant. Two shared content
  repairs and the original 30-minute active-time budget remain enforced.
- Dispatch replay never authorizes another call. Unknown outcomes stay charged
  and cannot be blindly repeated. An eligible separately budgeted fallback may
  replace the complete scene set, keeping one voice throughout. The web fallback
  is restricted to personal-learning use; auth/configuration/safety failures do not
  trigger a fallback bypass. Live W-16 acceptance used Gemini/Kore; fallback HTTP
  behavior has mock coverage, not a new live ElevenLabs acceptance run.
- The parent process owns the real monotonic lease clock and 20-second heartbeat.
  Rendering runs in a child so bundling cannot stall that clock. Lease loss stops
  its process tree; a parent disconnect stops the orphan. Every child dispatch,
  artifact operation and finalization also checks the exact server-side fence.
- Validated plan/audio/timing checkpoints survive leases. Local cache reuse checks
  input/model/voice dependencies, byte hashes, measured duration, script coverage
  and cue bounds. A stale process cannot publish into a newer assignment.
- Artifact upload ceilings are charged before write access is issued. Failure
  releases unused reservation, not potential late-upload/physical byte charges.
  General orphan/retention cleanup and automatic failed-job retry remain W-24/W-18;
  never delete metadata or decrement charges before verifying physical removal.

Education has no uploaded source files in V1. Software/Branding uploads still show
received until their worker media-decoding adapters are implemented. This milestone
does not establish that arbitrary uploaded recordings/images have been validated.

## Verification and manual QA

```powershell
npm test
npm run db:test
npm run web:lint
npm run web:typecheck
npm run web:build
npm run education:verify
```

The final command is a no-provider private transfer/checkpoint/expired-lease smoke
test, requiring the app at the canonical origin and an idle, paused local stack.
`--live` is an explicit opt-in that can consume existing provider quota. The
restricted `--reuse-run=web-<UUID>` fixture option validates this task's exact public
hydroelectric source and cached speech/timings; it blocks provider dispatch and is
not a product cross-account reuse feature. Do not run it against private user media.

Acceptance produced real 75.008-second landscape and portrait outputs with Gemini
Kore speech, five scenes, 19 caption groups and 429 mouth cues. The original live
planning/TTS/native-timing outputs were reused for the corrected light renders;
both corrected jobs passed private publication without new provider requests.
Ignored `.cache/w16-live-*.json` and each run's verification/provenance files record
the evidence. Temporary accounts, private Storage objects and charges were cleaned up after
physical deletion; local verification media remain ignored for review.

Manual checks after account activation:

- Save/reopen an Education draft; confirm topic, notes, voice, duration and format.
- Confirm missing required fields/consents prevent submission. Generate should save
  first and keep the real profile and `/projects/<UUID>` route.
- Refresh/reopen a processing project and verify it recovers the same job. Stop
  the worker to check waiting/recovery; do not create another request to fix it.
- Review the completed video, audible speech, scene boundaries, teacher, captions
  and both orientations. Download SRT/VTT and check their timing against the audio.
- Check another account cannot open the project or its private result links.
- Confirm Software/Branding generation and preview persistence remain disabled.

The hydroelectric environment and both layouts were visually inspected. Other
topics use light flow illustrations derived from validated scene labels; bespoke
environments for arbitrary topics are not established. Automated verification does
not prove factual correctness, a regional accent, perfect lip sync or human-rated
caption quality. Review generated educational claims before sharing.


Current local activation (6 November 2026): the user approved the existing account allowance increasing from 120000000 to 200000000 bytes within the unchanged 400000000-byte global budget. Education-only controls were enabled and audited. The existing worker credential and provider limits were not changed. On a different checkout/account, use the read-only proposal and explicit reviewed activation above.


## W-17 progress and manual checks — 7 November 2026

Open an owned Education project with a generation request. Four steps show the recorded processing stage; narration counts mean prepared audio/caption/timing scenes, not rendered-frame percentage. New drafts with no request do not fabricate progress. Earlier stages may repeat during bounded corrections; editing the draft does not alter the frozen request.

- Refresh/reopen the project: recover the same job without clicking Generate again. Check status performs a read only.
- During an active request, switch tabs and return: status rechecks on visibility/focus. Online running jobs poll every five seconds; waiting/unavailable jobs every fifteen. Hidden tabs pause and terminal recurring polling stops. A Ready result is rechecked at its known expiry.
- Temporarily disconnect the browser: last known status and unsaved inputs remain. Reconnect or use the read-only retry notice; do not create another generation to refresh status.
- A disconnected executor appears unavailable after the server heartbeat/lease window (up to the existing 90-second threshold), even if another worker is online. The request remains saved; UI polling itself does not claim/reconcile jobs.
- A durable provider-waiting state shows retry eligibility only when stored by the server; unknown means unknown, with no completion-time promise or quota-exhaustion testing needed. This milestone adds the waiting display, not a new provider scheduler/retry implementation.
- Failed/needs-input/cancelled/expired states have safe messages. Failed-job retry is W-18, cancellation W-19 and the full result player W-20; do not infer those commands from the progress display.

Automated evidence: 474 SQL assertions, 60 unit tests and eight unique desktop/mobile cases passed across corrected reruns, plus types/lint/build/catalog/type checks. UI tests use temporary unclaimable durable job fixtures and simulated network/visibility events; no live video or provider request was generated for W-17. Original W-16 accepted media remain unchanged. Stitch waiting references were read and desktop/mobile layout checked with the current shared palette.


## W-18 recovery and manual QA — 7 November 2026

On an owned stopped Education request, recovery guidance now distinguishes eligible temporary failures, input corrections, expired work, exhausted limits and operator review. Retry generation uses the frozen request and valid compatible checkpoints, keeping all consumed limits; it does not include unsaved draft edits. Edit input focuses the existing topic field without resetting the form. Correct content, save and explicitly Generate for a new request. New requests still obey user/global storage/output/provider limits; this is not a free quota grant.

Manual checks (use existing failures; do not exhaust real quota or force AI errors merely to test):

- Needs input shows Edit input and clear guidance, with no same-job Retry. Topic/audience/notes and unsaved edits survive navigation to the form.
- An eligible temporary failure shows Retry generation and warns that the saved request is used and additional provider usage may occur. Repeat clicks do not create extra jobs/revisions/output charges. Refresh recovers that same request.
- An uncertain retry response offers Check retry request. Preserve the original request until confirmed; focus/reconnect must not unlock a duplicate Generate. Network errors keep the draft.
- Budget-exhausted or expired-media guidance offers input review/new deliberate generation rather than resetting the old job. Unknown historical/unsafe/provider-uncertain failures show operator guidance, not blind retry.
- Confirm no retry on Ready, cancelled or currently active requests. Check private ownership with a second account only against your own test fixtures.

Verification used synthetic durable failed-job/checkpoint states, real local Auth/admission/retry/receipt transactions, simulated lost network responses and mocked worker/provider transports. Eight recovery desktop/mobile cases plus two progress regression cases passed across final reruns; 520 SQL / 64 unit tests and types/lint/build/freshness passed. No fresh AI synthesis or video render was needed. Cleanup restored claims pause and removed fixtures. Actual failed-to-Ready live regeneration after this change has not been newly exercised; earlier W-16 outputs remain the live evidence. Cancellation is W-19; full result/player/library remains W-20/W-23.


## W-19 cancellation and manual QA — 7 November 2026

- Open an owned active Education request. Cancel generation opens the shared confirmation; Keep generating/Escape/close sends no cancellation before submission. Keyboard focus starts on Keep generating. Check desktop/mobile scrolling and reachable buttons.
- Confirm cancellation for an unassigned worker/provider-waiting request: it becomes Cancelled. The draft and unsaved input remain. Review input focuses the current topic without starting generation; cancelled jobs have no Retry/Undo.
- A live assigned request first shows Stopping, retaining its active slot until worker acknowledgment or current authority expiry. Refresh restores that state. The worker stops its guarded child and releases; an expired disconnected assignment can be reconciled by the visible cancellation checks or another worker heartbeat. Do not promise an instant stop or a completion countdown.
- If a response is lost, Check cancellation repeats the same target operation. Repeated clicks/reloads must not duplicate release, create a new revision or publish a late result. A result that already completed before cancellation keeps its Ready history instead.
- Previous successful videos keep their expiry. Provider requests already accepted may still consume usage, and allocated bytes remain charged until actual cleanup. Cancellation releases unused reservations, not historical usage.

The visible Stopping view rechecks every fifteen seconds while online/visible; ordinary progress GETs remain read-only. With every worker offline and the browser closed, durable cancellation still blocks publication; final status/bookkeeping reconciles on the next owned cancellation check or worker heartbeat. Background hosting/scheduler deployment is not claimed.

Evidence: 549 SQL assertions, 67 unit tests, eight unique desktop/mobile cancellation cases across final runs, types/lint/build and freshness checks. SQL uses transactional synthetic job/media state; browser uses real local Auth/API with temporary fixtures and simulated lost responses/expired leases. A controlled real executor child was stopped with AI calls disabled. No actual new video generation/in-flight provider cancellation was exercised; earlier W-16 outputs remain the live rendering evidence. Next task: W-20 private player/downloads, then W-23 retained-video listing.


## W-20 player/downloads and manual QA — 7 November 2026

Open an owned completed Education project at /projects/<id> using http://127.0.0.1:3000, not /preview. The Ready panel now contains the real private video, English captions and MP4/SRT/VTT downloads, actual recorded narration provider and exact availability date. Existing verified W-16 outputs can be reopened without regenerating. Advanced versions, burned captions and full retained-video listing remain separate.

- Play/pause, seek, volume and fullscreen on desktop/mobile. Captions on/off should follow the generated English VTT. No autoplay. Landscape/portrait keep their own aspect ratios.
- Download MP4 and, under More download options, SRT/VTT. Confirm filenames, playable video and readable timed captions. Links are newly authorized for the selected revision, not permanent/public URLs.
- Leave the player paused for over a minute, then seek/play or Reload player. A fresh private grant should retain the playback position; renewal may require pressing Play again if the browser blocks automatic resume. Native errors/stalls retry only within a bounded renewal guard.
- Keep unsaved form edits while testing a temporary connection problem: media errors must not reset topic/notes/settings. No Generate request should result from playback/download/reload.
- Expired/unavailable results show an explanation and no broken player/download controls. An already open result stops at its server-relative expiry. Confirm signout/session loss removes playback; already downloaded files are not recalled. Do not exhaust real AI quota to manufacture failures.
- Narration disclosure must match the recorded result. ElevenLabs fallback output includes attribution/personal-learning restrictions; the UI does not infer a fallback just from currently configured provider settings.

Evidence: 598 SQL assertions, 72 unit tests, 12 unique desktop/mobile cases across passing final runs, root/web types, lint/build and generated freshness checks. Browser media are clearly labelled synthetic 60-second color/tone fixtures, with real local Storage/authentication, actual caption loading and download checksum comparisons. Near-result-expiry timing is simulated; short-token expiry is checked against real Storage rejection, and automatic renewal uses a controlled browser clock. No new live AI video or teacher render was generated. Accepted W-16 media remain unchanged. Hosted browser/transfer/retention checks remain release work. Exact next task: W-23 retained-video listing/reopening.


## W-23 My videos and manual QA — 7 November 2026

Open http://127.0.0.1:3000/videos while signed in. Desktop/mobile My videos navigation shows your actual account, private Education results, recorded usage and retention. Ready cards open the exact revision's existing player; no Generate request is made. Saved drafts remain accessible below and at /drafts.

- Open a Ready result, play it and use its existing MP4/SRT/VTT downloads. Return to My videos; the title/version must describe the frozen result even after a later draft edit. Removing only the editable draft must preserve that result.
- Empty accounts show a create action. Expired/unavailable cards show a neutral placeholder and no Open video/download action; View result explains the state. Review input is offered only while its mutable draft exists. An open library drops the thumbnail/Open video action at its server-relative expiry.
- Use Load more videos when present. Refresh restarts the list; a failed page request retains previous cards and retries that cursor. Counts beside sections describe loaded cards, not a fabricated total. Slot usage is separately timestamped; Refresh for current availability.
- Continue Software/Branding drafts through the library or dedicated Saved drafts page; generation remains Coming soon. Sign out and open /videos or an exact pinned result URL: email sign-in returns to that GET page. Another account must never see or grant access to your result.

Evidence: 616 SQL assertions, 74 Node tests, 12 unique desktop/mobile library/draft cases across final passing runs, types/lint/build and generated freshness checks. Browser media are clearly synthetic temporary fixtures with actual local Auth/Storage access; expiry clocks are simulated and missing-media coverage physically removes a fixture file with the Storage API. No new AI generation. Next is the W-24 successful-media expiry/physical-cleanup slice in R-05, followed by hosted release checks.
