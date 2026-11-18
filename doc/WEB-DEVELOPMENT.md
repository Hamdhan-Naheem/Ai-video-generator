# Web application development

The first application milestone is the Next.js scaffold in `apps/web`. The existing CLI pipeline remains in root `src`, `scripts` and `test`; its commands are unchanged. [Project tracker](PROJECT-TRACKER.md) is the single feature-status source. [UI reconciliation](UI-RECONCILIATION.md) is the implementation checklist.

## Local commands

Run from the project root with Node 24 (validated with 24.19.0). The currently installed system Node 22.12 is below the lint toolchain requirement; use Node 24 for these commands:

```powershell
npm ci
npm run web:dev
```

Open http://127.0.0.1:3000 using that exact origin. Root is the public landing page; `/dashboard` requires sign-in. Live routes are `/dashboard`, `/settings`, `/projects/new?mode=education|software|branding` and owned `/projects/<uuid>` drafts. All three forms support draft saving; Software/Branding support private uploads, and shared settings expose the installed private Kore sample. Education generation is implemented and verified locally, with account allocation/activation described in [EDUCATION-GENERATION.md](EDUCATION-GENERATION.md). Existing pauses remain until that reviewed setup; Software/Branding generation remains later work. `/preview/*` routes are earlier design fixtures with sample identity/data and disabled persistence; Signed-in My videos opens /videos with owned completed Education results, empty/expired/unavailable states, private thumbnails and cursor pagination. Results reopen at /projects/<uuid>/results/<revisionUuid> independently of editable drafts. The existing /drafts page and dashboard Saved drafts shortcut remain; the library reuses that component for editable input. Later dated sections record milestone history; PROJECT-TRACKER.md gives the exact current status.

```powershell
npm run web:lint
npm run web:typecheck
npm run web:build
npm run web:start
npm run web:test
npm run check
```

`check` runs pipeline TypeScript/tests and web lint/typecheck/production build. `web:test` separately starts a temporary local dev server on port 3100 and runs desktop/mobile browser checks using installed Google Chrome. If Chrome is absent, install a supported browser before running this check rather than claiming browser validation passed. Playwright screenshots/traces live in ignored `apps/web/test-results`; reports are not user media. Do not run build and dev against the same web workspace concurrently.

## Structure and boundaries

- `apps/web/src/app`: App Router entry points, shared CSS tokens, development preview and unavailable route.
- `apps/web/src/components`: shared logo, icons, desktop/sidebar and mobile navigation, plus the confirmed Dashboard visual implementation.
- `apps/web/public/illustrations`: static SVG geometry from the confirmed Stitch Dashboard references, reviewed for active content. These are illustrative sample assets.
- `apps/web/src/lib`: typed navigation/content fixtures for the scaffold.
- `apps/web/e2e`: meaningful browser checks for navigation, color parity, keyboard skip link, sizing and 404 recovery.
- `doc/design-reference`: read-only Stitch screen inventory and dashboard reference HTML, not trusted app code. References can contain remote fixture assets/CDN scripts; do not execute them as application logic.

Colors are shared CSS variables in `src/app/globals.css`. Desktop and mobile canvas are both #F7F6F2. Breakpoints never override color tokens. Manrope is served locally from its font package; pages do not fetch Google Fonts at runtime/build time. Each future feature reuses the same shell/components.

Web Next.js/React/Tailwind versions are pinned in `apps/web/package.json`; the root lockfile covers the workspace. React matches the existing installed pipeline version to avoid splitting the proven rendering stack. The web TypeScript configuration is separate from the NodeNext pipeline configuration. Do not import root pipeline/provider modules into browser code. Keep existing root `.env` private; the web app must later use its own carefully scoped configuration. This scaffold does not read root provider keys, connect Supabase or load project media.

Setup references: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Tailwind Next.js integration](https://tailwindcss.com/docs/installation/framework-guides/nextjs). Lint is a separate command from the Next.js build. Dependency metadata was checked at scaffold time; run compatibility/security review before future upgrades instead of blindly updating the media stack.

## Next small feature

Next: W-05 real email signup/signin and editable display name, following verified W-04 local database ownership and W-03 shared contracts. Branding UI remains planned; numbered implementation order has resumed. Education form UI (W-10U) is implemented; full W-10 integration remains unfinished. W-02 shared fields, buttons, notices, status badges, dialogs and loading/failure/retry presentation are implemented and verified. Shared schemas and persistence/auth integration follow incrementally. Mark Complete only after the milestone's actual checks pass. Visual placeholders never count as implemented authentication, uploads, project data or generation.

## Local runtime and dependency follow-up

On this computer, the verified Node 24 runtime is available without changing the system installation:

```powershell
$taskNode = 'C:\Users\TS-0004\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $taskNode --version
Push-Location apps/web
& $taskNode ../../node_modules/next/dist/bin/next dev --hostname 127.0.0.1
Pop-Location
```

The 26 October audit reports eight high-severity package entries sharing one Zod advisory (GHSA-mrhx-c7xc-m3w5) in the existing Remotion dependency tree. The proposed automatic fix downgrades the renderer; it has not been applied. Resolve with a compatible renderer/dependency update and rendering regression checks before release. ESLint 9 is retained for the React lint plugin's declared peer compatibility; its deprecation and a compatible tooling upgrade are tracked release work. Neither issue is evidence that the application is production-ready.

The machine-specific command above invokes Node 24 directly: Windows npm wrappers can use the older Node beside their own installation even after PATH changes. With a normal system Node 24 installation, the root npm commands remain the standard workflow. The final web build/browser checks for the three-page milestone used the bundled Node 24 executable directly.

## Shared controls (W-02)

Open http://127.0.0.1:3001/preview/controls on the current local preview (use your configured port on a fresh server). This developer component review is not a new product navigation destination or the Education form. It demonstrates Stitch-based fields, native choices, password visibility, notices/statuses, dialogs and explicitly simulated loading/failure/retry. Nothing is persisted or sent to providers.

Reuse components from apps/web/src/components/form-fields.tsx and ui.tsx. Pass field errors after validation; hints/errors are associated with controls automatically. Textarea counters require a controlled value. Pass pending and pendingLabel to Button during an actual async operation; pending disables repeat activation. Notice accepts tone and optional onRetry/retrying. Callers supply operation state and persistence; primitives do not invent backend behavior. Settings consumes TextField for its sample profile.

Acceptance coverage is in apps/web/e2e/shared-controls.spec.ts alongside the existing page tests. W-02 passed 26 desktop/mobile browser checks in total, web lint/typecheck/build, and the 18 existing pipeline tests. Education and Software form UIs are implemented; numbered contract/database work takes priority, and Branding UI remains planned. Real auth, saves, uploads and generation remain separate planned work.

## Education form preview (W-10U)

Open /preview/create?mode=education (current preview: http://127.0.0.1:3001/preview/create?mode=education). The form reuses shared controls and the approved Stitch layout with desktop/mobile color parity. Topic, audience, intended use, optional objective/notes, video settings and unchecked acknowledgments are interactive page-local state. Required errors appear after touch; native text limits apply. Optional details retain their entered values while collapsed. Leaving or refreshing clears inputs; this is not a saved draft.

Save draft, Preview voice and Generate are disabled with associated explanations. No actual audio is loaded, mutation request is sent or generation started. Only the configured primary Kore voice is shown; server-driven capabilities/catalog and eligible fallback decisions remain future work. No new upload control is added for Education.

All 34 desktop/mobile browser checks passed, including the new Education cases in apps/web/e2e/education-form.spec.ts; web lint/typecheck/build and the 18 existing pipeline tests also passed. See PROJECT-TRACKER.md for UI completion versus remaining W-10 integration.

## Software showcase preview (W-12U)

Open /preview/create?mode=software (current preview: http://127.0.0.1:3001/preview/create?mode=software). Name, factual description, optional features, Intended use and settings are page-local only. Description/features share a 4,000-character budget; excess text is preserved with an error until shortened. File requirements/privacy are visible before selection, and uploading is explicitly unavailable. There is no file input, read, upload or fake successful thumbnail. Drop handling only prevents browser navigation and announces unavailability. Save/voice/generation remain disabled.

VideoSettings is shared with Education; both reuse the accepted form styles and W-02 fields. All 42 browser checks passed, along with web lint/typecheck/production build and 18 existing pipeline tests. To leave the other active development server alone, this milestone used a hash-matched ignored snapshot under .cache/software-ui-verification-20261026-01 for build/typecheck and the port-3001 production preview. Actual source is still in apps/web; ordinary development uses the existing web:dev command. Rebuild/restart the production preview after future source changes; it does not hot reload.

## Shared contracts (W-03)

The browser-safe shared entry point is shared/contracts/index.ts; web components import it through @contracts. Education/Software validation, profile name checks and video duration choices consume its rules. See [contract guide](../shared/contracts/README.md) for draft/full validation, request/DTO boundaries, character counts and generation commands. No provider/server/credential modules are imported by this entry point.

Run npm run contracts:generate after schema changes and npm run contracts:check to detect stale generated OpenAPI components. Both reuse existing Zod/tsx; no dependency installation is needed. Root check includes catalog freshness. The generated component catalog has no endpoint implementations; cross-field and security checks remain runtime/server responsibilities.

W-03 passed 34 Node tests (16 contract + 18 pipeline), all 44 browser checks, web lint/typechecks/build and freshness validation. The latest port-3001 preview uses .cache/contracts-verification-20261026-01 with hash-matched actual source/shared contracts while another development server remains running. Next work is W-04 database/migration/ownership validation in tracker order, not additional UI work.


## Local database foundation (W-04)

The separate local Supabase stack and SQL ownership tests are implemented. See [local database setup](LOCAL-DATABASE.md) for Docker commands, pgAdmin and Studio, seven versioned migrations, generated types and safely scoped resets. Start with npm run db:start; Studio uses http://127.0.0.1:55423. The preview frontend still has no Supabase client/session wiring; it remains explicitly fixture-based. W-05 introduces real email authentication next. No UI palette, layout or browser credentials changed during W-04.


## Real local email authentication (W-05)

Start Docker Desktop and run npm run db:start. Run npm run web:auth:local once to write ignored apps/web/.env.local from this project's local Supabase status. This helper never prints credentials, copies a service-role key, or reads the root AI-provider environment. The committed apps/web/.env.example lists the three server-side settings. APP_ORIGIN must exactly match the app's origin (including port); local default is http://127.0.0.1:3000. Restart Next.js after changing environment values.

Run npm run web:dev and open /sign-up or /sign-in on port 3000. Full name, email and password create a real local Auth identity and its existing profile trigger. Passwords are preserved exactly; new passwords require 12–128 characters. No confirmation/reset email is sent. Email is self-declared, not proof of mailbox ownership. The /account-access page explains the recovery limitation. Google is deferred by user request and removed from the live authentication screens.

After signing in, /dashboard is a minimal real-account welcome page; real project/usage/worker data belongs to W-08. /settings reads the signed-in identity's email and profile. Saving changes only display_name through the existing update_display_name RPC and expected settings version. Refreshing preserves the saved name. Stale-tab conflicts preserve entered text and offer an explicit reload of the latest saved profile. Email, roles and ownership cannot be changed by this endpoint. The /preview/* routes remain sample-based design fixtures, including the Create/My videos links. No database migration is needed for W-05.

W-05 implements GET /api/v1/auth/csrf, POST /api/v1/auth/sign-up, POST /api/v1/auth/sign-in, GET /api/v1/auth/session, and GET/PATCH /api/v1/me/settings. The initial settings GET is a W-05 projection (displayName, email, authMethods, settingsVersion); usage/defaults arrive with their real features. Private replies are no-store. User identity is verified through Auth and active-profile RLS, with the anon key and user session; there is no privileged database client in the web app. Every mutation requires the exact configured Origin plus a finite cookie/header CSRF nonce bound to the current session cookies. Requests are limited to 64 KiB and errors exclude raw SDK/SQL/password/token data.

The supported Supabase SSR SDK manages cookie chunks and refreshes on these API requests. W-07 still owns explicit refresh/sign-out/session-expiry UX and comprehensive protected routing. Password change and account deletion remain disabled future features. A small bounded per-process attempt limiter supplements Supabase Auth's limits; distributed abuse controls, OAuth collision checks and production configuration remain release gates. This local milestone is not a public deployment.

For real Auth browser checks, start the local DB and configure .env.local, set W05_AUTH_TESTS=1, then run npm run web:test. These opt-in checks create only uniquely named w05-*@example.invalid users and remove those test profiles/identities afterward; they must target this local project's Docker container. Existing browser checks run normally without this opt-in. Tests default to their own server on port 3100 with the matching APP_ORIGIN; optional PLAYWRIGHT_PORT=3000 and PLAYWRIGHT_REUSE_SERVER=1 reuse a developer's already-running local server. Do not run build and dev against the same workspace simultaneously.


### W-05 manual review

1. Open /sign-up on desktop and a mobile width. Confirm the same ivory background, empty fields and full name input. Check invalid email, a short password and mismatched confirmation before using valid details.
2. Create a local account. Check the real welcome page, then open /settings. Change Full name, save, refresh and confirm it persists; email stays read-only.
3. In a separate browser profile/private window, use /sign-in with the same email/password. Check an incorrect password gives a generic error and the correct password loads the saved name.
4. Open Settings in two tabs, save a name in one and attempt saving from the older tab. Confirm it offers the explicit saved-profile reload instead of overwriting silently.
5. Confirm Google sign-in is absent; the later password-change/destructive controls remain unavailable. Account-access help must explain that no reset email can be sent. These tests create local-only accounts; production deployment and complete session/sign-out behavior are separate milestones.


### W-07 email-only sessions

W-06 is deferred by user request. Live signup/signin use email/password only. Settings has working local Sign out; another browser remains signed in. POST /api/v1/auth/sign-out accepts {scope:"local"}, returns 204 and clears local session/CSRF cookies. POST /api/v1/auth/refresh accepts {}, returns {data:{authenticated:true}}, and verifies the active profile after SDK refresh. Both require Origin/CSRF and return safe failures. Existing SDK automatic refresh still applies to authenticated requests. Invalid sessions clear stale cookies; transient Auth failures show retry feedback.

Live account pages hide content until their verified API load succeeds, recheck when a tab becomes visible/focused and every 60 seconds while visible, and handle API 401 without replaying mutations. /session-expired explains signing in again; signin accepts only /dashboard or /settings as return destinations. Preview routes stay public fixtures. No generation-cancellation logic is invoked by session expiry/signout. A revoked refresh session does not promise instant recall of already-issued bearer JWTs; their lifetime is provider-controlled.

Manual QA: check Google is absent on both forms; visit /settings signed out and signin returns there; save a profile name then sign out; confirm refresh/back does not reveal authenticated content; sign in in two tabs and sign out in one; check a separate private-browser session stays signed in. Remove this browser’s cookies while editing Settings, then Save: expect Please sign in again, and after login the saved name must remain unchanged. Try an external next URL: it must return to Dashboard. Temporary network failures should show retry feedback, not a false successful signout. Browser regressions run with W05_AUTH_TESTS=1 and include session-auth.spec.ts; synthetic w07-*@example.invalid users are cleaned up.


### W-08 dashboard and manual QA

Apply npm run db:migrate, then npm run db:types:check for the new read-only dashboard RPC. /dashboard reuses the approved preview composition but reads actual account data through GET /api/v1/dashboard. No new AI keys, Google setup or worker configuration is required. The local generation system remains paused/unconfigured until its later milestones. /preview/dashboard still contains labeled sample projects. Creation/library links enter design previews; saving projects is the next W-09 task.

Manual checks:

1. Sign in and open /dashboard at desktop and mobile widths. Confirm the shared ivory background, compact shell, approved hero/mode cards and no sample projects in the live list. An account without saved projects gets an honest empty state.
2. Read Saved videos, Reserved video slots and storage fields. Missing accounting shows Not configured, with no fake free-capacity claim. The processing computer can be not configured, offline or connected; paused processing is stated separately.
3. Refresh the page and use Refresh. A temporary data failure shows a retry notice; Try again reloads without creating projects or jobs. Returning to a visible tab refreshes server state. Expired output stops counting without a cleanup worker.
4. Sign in as another account in a separate browser. Project names/counts and usage must belong to that account only. An expired session should lead to Please sign in again without replaying an edit.
5. Create video/template/library links remain design previews; generating, editing, playback and downloads are not connected by this milestone. Existing settings/profile/signout should continue to work.

Automated real-Auth coverage: set W05_AUTH_TESTS=1 and run dashboard-data.spec.ts with the local stack; tests insert only owned UUID metadata fixtures and remove them afterward. Actual empty/populated data and two-account isolation use the real API/DB; only transport failure is simulated for the retry UI. Screenshots are ignored .cache/w08-dashboard-desktop.png and .cache/w08-dashboard-mobile.png. Database tests also cover bounded ordering, worker freshness/protocols, inactive/missing identities, source/worker redaction, decimal precision and live/deleted/expired output counts.


### Signup security-cookie troubleshooting

Use the exact APP_ORIGIN address (currently http://127.0.0.1:3000); localhost and 127.0.0.1 are different origins. A signup CSRF 403 occurs before Auth signup and does not prove the credentials were rejected. Valid pre-auth nonces are reused until their original 30-minute expiry; signed-out background account checks preserve them, while session changes/signout invalidate them. Missing-cookie errors identify a blocked/absent security cookie; try the configured address in a regular Chrome window with site cookies enabled if the embedded preview blocks cookies. Do not disable CSRF or loosen the Origin allowlist.


Open http://127.0.0.1:3000/ for the live application. The root now redirects to /dashboard, then signin when needed. /settings is the working profile/signout page. /preview/dashboard and /preview/settings contain sample data and disabled account actions; use them only for design reference. Create video/My videos still use preview routes until their upcoming implementation. Port numbers select a running server; /preview is a URL path, not a special port. The current local app uses port 3000; update APP_ORIGIN to the exact origin if intentionally changing ports.


### W-09 live draft setup and manual QA

Apply npm run db:migrate (twelfth migration) and check npm run db:types:check. Open http://127.0.0.1:3000/projects/new while signed in. The real dashboard and sidebar Create video actions now enter this route. /preview/create remains a sample-only design reference. Existing preview text about disabled Save applies to preview routes; live Education/Software forms have enabled Save draft. Branding currently saves a title/settings shell; its full form is W-13. Uploads, voice samples and Generate are still unavailable. No new keys are required.

Manual checks:

1. Choose Education, leave required generation fields incomplete, and Save draft. Check the saved project URL, default title and version. Refresh and reopen it from Dashboard -> Continue draft; saved content must remain.
2. Change Project title, topic, optional reference notes, duration and orientation; Save, refresh and check every saved field. Consent boxes should remain unchecked on reopening and Generate must remain disabled. Saving makes no AI calls or jobs.
3. Open the same draft in two tabs. Save one, then save different details in the older tab. The stale edit must stay visible with a conflict; another stale Save is disabled. Explicit Reload saved draft replaces it with the saved version.
4. Sign out/in and reopen the same URL. Remove this browser's cookies during an unsaved edit, then Save: signin is required and the unsubmitted edit must not be replayed. The original saved data remains. Browser refresh while dirty warns about unsaved changes; only explicit Save persists.
5. Check Software with blank required details, then its combined 4,000-character description/features budget. Check Branding saves title and orientation while explaining the missing full form. Neither flow uploads files. Unknown modes show the selection choices safely.
6. Use a second account: the other owner's URL must be unavailable and must not reveal title/input. Verify the same ivory canvas, compact shell and readable controls on desktop/mobile. Dashboard recent projects are limited to six; the full library remains a later task.

Run project-drafts.spec.ts with W05_AUTH_TESTS=1 and the local stack for real Auth/SQL coverage. Only generated w09-UUID@example.invalid test accounts, their drafts and idempotency receipts are removed afterward. Tests cover concurrent duplicate create, separate-owner keys, two concurrent edits, source/role rejection and zero jobs/reservations; no provider requests or real user's rows are touched. Ignored screenshots: .cache/w09-education-desktop.png and .cache/w09-education-mobile.png.


### W-10 capabilities and voice samples (5 November 2026)

Live /projects/new?mode=education and reopened Education drafts load authenticated capabilities and voice DTOs. Loading/retry does not erase draft content or block saving partial drafts. The catalog separates selectable draft preferences from actual generation availability; all three generation modes remain disabled, and upload limits are informational until W-11. Save persists the selected voice, duration and orientation using W-09. No new credentials or database migration is needed.

The player requests the fixed authenticated /api/v1/voices/Kore/preview only after a user clicks; it never synthesizes on demand. Optional reviewed audio is read from apps/web/voice-samples/Kore.wav (outside public/, ignored, maximum 2 MB). Missing audio gives previewUrl:null and an explanatory disabled control. The owner approved a 12-second excerpt from the matching education-demo Gemini/Kore recording for signed-in playback. solar-demo is an ElevenLabs recording and must not be labeled Kore. The excerpt remains private, outside public/. A fresh checkout intentionally has no sample until a reviewed asset is explicitly installed. Keep this limitation visible in the tracker; browser tests using a fake Audio implementation establish UI state handling only, not actual speech quality or decode.

Manual QA:
1. Sign in at the configured 127.0.0.1 origin, open Education, and check 60/75/90 seconds, landscape/portrait and Kore. Change choices, save and reopen; they persist.
2. Simulate a failed capabilities request: loading becomes an error with Try again, existing topic/title remains, and Save draft still works. Retry restores options.
3. With no installed authorized sample, Preview voice is disabled and explains why. After a sample is explicitly approved and installed, check audible speech, Stop, Replay, loading cancellation, offline Retry, hidden-tab stopping and navigation/session-loss cleanup. There must be no autoplay or new provider call. Real-audio QA is pending.
4. Check the same ivory mobile/desktop palette and no horizontal overflow. Generate remains disabled, and preview fixture routes retain their old sample-only behavior.

Automated education-capabilities.spec.ts labels mocked Audio explicitly; project-drafts.spec.ts additionally verifies real authenticated catalog access. Run with PLAYWRIGHT_PORT=3000, PLAYWRIGHT_REUSE_SERVER=1 and W05_AUTH_TESTS=1 against the local stack after building/starting the app. Only the existing synthetic W09 fixture users are removed.


### W-10 approved local voice sample installed

Kore playback is now available on the live Education form. node scripts/install-kore-sample.mjs recreates the approved 12-second excerpt from the existing local-runs/education-demo source (no provider call); both source and installed audio remain ignored. Missing local source on a fresh checkout requires supplying the approved asset separately; do not commit tester media or copy the full demo to public/. The fixed API serves the sample after active-account verification.

Real desktop/mobile browser decoding, advancing playback time, Stop, Replay, natural completion and navigation cleanup passed. To repeat: set W05_AUTH_TESTS=1, W10_REAL_SAMPLE=1, PLAYWRIGHT_PORT=3000 and PLAYWRIGHT_REUSE_SERVER=1, then run project-drafts.spec.ts with --grep "approved Kore" against the running local app. Uses synthetic W09 users and existing cleanup. The earlier mocked Audio tests remain error-state coverage; this new opt-in test uses actual Chrome Audio.

Manual check now: sign in, open /projects/new?mode=education, choose Preview voice, listen to the excerpt, Stop, and Replay. Audio must not autoplay. Generation remains disabled. No new browser/device listening-quality assessment is claimed by the automated playback checks.


### W-11 private uploads (local implementation)

Setup from the repository root: run node scripts/database.mjs migrate, node scripts/configure-local-uploads.mjs and restart/rebuild the web app using Node 24. The local-only helper verifies the expected loopback Supabase stack, writes its existing service credential only into ignored apps/web/.env.local, and initializes a 400,000,000-byte local global budget only when previously zero. New upload accounts receive a 120,000,000-byte user ceiling; existing user/operator limits are preserved. This local disk test allowance does not configure or verify a cloud free-tier allowance. Keep remote uploads closed until an operator sets verified remote quotas and a server-only credential. No AI keys are needed.

Open /projects/new?mode=software or ?mode=branding, Save draft first, then Choose file. Software accepts JPEG/PNG/WebP and MP4; Branding currently adds product images to its title/settings shell (full form W-13). Each selection allocates/attaches a source immediately, independently of unsaved text/settings. Choose Save draft to persist text/settings. Images upload directly with real progress; MP4 uses TUS 6 MiB chunks and HEAD-based resumption. No Next.js file proxy, object overwrite or browser storage read/delete grant. The browser uses its own Supabase cookie session and the public anon configuration; the cleanup credential never enters browser code.

Up to 8 images at 5 MB, one software MP4 at 45 MB, 60 MB combined. API/SQL check declared type, size, role and count; receipt confirms exact Storage metadata. Uploaded means received, not decoded/validated. Actual H.264/AAC, duration (120 seconds), dimensions/decompression and content decoding remain the worker's pre-AI responsibility. Received source bytes are not exposed through a cloud preview link before that validation. Generate stays disabled. Education still uses pasted notes.

Reload preserves allocations/received files. Retry reconciles a lost allocation or receipt before writing again. After refresh, select the original filename/type/size for an incomplete slot; file bytes and local upload URLs are not saved in browser localStorage. Resumption of an existing TUS URL is supported within the current page; after refresh, a fresh TUS session may be needed with the same allocation. Expired allocations must be removed and replaced. No automatic mutation replay occurs after confirmed session loss.

Remove detaches the mutable selection and prevents further access/receipt; frozen revision/checkpoint references return 409 and preserve the object. Server cleanup deletes completed unreferenced bytes then releases quota idempotently. Failures leave retryable cleanup tasks. Partial transfers keep a full 45 MB charge through allocation expiry plus a 24-hour orphan window, even if the visible object is absent; this prevents premature quota reuse. Run node scripts/cleanup-source-uploads.mjs periodically to expire 24-hour abandoned allocations and retry/re-scan removed paths. This is local operator tooling, not an installed background scheduler; cloud scheduling and general retention remain future milestones. It processes at most 100 candidates per run and never activates cloud services.

Manual QA:
1. Save a Software draft, enter unsaved text, upload a small PNG, and confirm the text remains. Save and refresh: filename, received state and text persist.
2. Upload a supported MP4, interrupt the connection, then Retry. Progress resumes through TUS; no duplicate allocation or overwrite is created.
3. Reload during an incomplete upload and choose the original file again, or Remove it. An expired slot offers removal/new allocation.
4. Try unsupported SVG/PDF, oversized image/recording, wrong-mode recording, excess images and combined bytes. Validation must preserve existing inputs/files.
5. Remove a received file, refresh, and check its selection is gone. Completed physical deletion releases its byte charge. A partial transfer may retain a conservative charge until safe cleanup.
6. With a second account, the first owner's upload list/receipt/remove must return unavailable. Signed-out requests cannot allocate; arbitrary paths/upsert/read/delete through direct Storage must be denied.
7. Check desktop/mobile layout and Branding image attachment; no horizontal overflow or background-color change. No AI processing or generation starts.

Automated real Storage tests: uploads.spec.ts with W05_AUTH_TESTS=1, PLAYWRIGHT_PORT=3000 and PLAYWRIGHT_REUSE_SERVER=1 against the running canonical app. A synthetic recording is generated for tests under ignored .cache; no personal media/providers are used. Test cleanup removes only generated w11 UUID accounts/objects and reconciles their accounting.


W-11 final verification: Complete locally. All 227 SQL assertions/concurrency regressions, 44 Node tests, full lint/types/build and schema/type freshness passed. Real desktop/mobile transfers, interrupted TUS resumption, image drag/drop/retry, expiry, owner isolation, source persistence and completed physical cleanup passed; 22 selected browser cases are covered including corrected-case reruns. Source files still show awaiting validation until the later worker decodes them. Test fixtures generate automatically via scripts/generate-upload-fixtures.mjs. The running canonical app is http://127.0.0.1:3000.


## W-12 Software settings and voice playback — 5 November 2026

On the signed-in `/projects/new?mode=software` form (or an owned Software draft), duration/orientation and Kore voice options now come from the authenticated capabilities/voice catalog. Preview voice fetches the existing private sample only on click; Stop, retry and navigation cleanup reuse the Education player. Save draft persists settings; reload restores them. The voice sample demonstrates the voice and does not narrate your form content. Generate remains disabled pending queue/worker integration. `/preview/create?mode=software` remains a design fixture with disabled playback/save/uploads.

Manual QA: enter Software details; select 75/90 seconds and portrait; play/stop/replay the sample; Save draft then reload and verify text/settings. Under simulated catalog or sample network failure, confirm a retry notice and preserved edits. Check both desktop/mobile ivory backgrounds and no horizontal overflow. Verify uploaded filenames remain attached while changing settings. The next milestone is W-13 Product branding fields and shared settings.


## W-13 Product Branding form — 5 November 2026

Sign in and open `/projects/new?mode=branding`. The existing Stitch form now saves product name, optional description, benefit lines, brand details, Intended use and shared duration/orientation/Kore settings. Save the draft before adding private product images. Files attach immediately; text/settings use Save draft. Reload/continue draft restores values and attachments. Existing audience, call-to-action and color metadata remain intact when editing the visible fields. No generated product narration or video is created yet.

Manual QA: save/reopen an incomplete draft; enter product details and up to 8 benefit lines (200 characters each); verify over-limit lines and the combined 4,000-character budget show errors without losing text. Choose settings, play/stop/retry the cached voice; attach an image while text is unsaved, then Save/reload and confirm both persist. Check mobile stacking and shared ivory canvas. Generate remains disabled even after consent is checked. `/preview/create?mode=branding` is the sample UI only; use the signed-in `/projects/` route for real saving. My videos still leads to the sample library; reopen real drafts from Dashboard until library integration.


## Save and upload navigation repair — 6 November 2026

Use the signed-in /projects/new?mode=software or branding form. Uploads require a saved project: choose Go to Save draft in the attachment notice, then Save draft at the bottom. A successful save stays on /projects/<uuid> and exposes Choose file. If saving fails, the form retains inputs and displays an error; do not switch to a sample preview.

Signed-in Saved drafts links open /dashboard#recent-title and preserve the real profile. Continue draft reopens the stored form. The dashboard shows six recent projects; a complete paginated library is still W-23. /preview/* remains explicitly sample-only and is not used by these signed-in links. Software accepts supported images/MP4, while Branding accepts images only. Received uploads await worker decoding and generation remains disabled.


## W-14 durable submission backend — 6 November 2026

The server implements POST /api/v1/projects/:id/generations and GET /api/v1/jobs/:id. Submission accepts only draftVersion, preferences and acknowledgments plus an Idempotency-Key. The database freezes the owned draft/source references and reserves 167,772,160 bytes plus one output atomically. Reuse the exact original key/body after an uncertain response; a changed body must not reuse that key. The returned statusUrl is authenticated and private/no-store. Full API detail is in API-DESIGN.md.

No new key or provider request is needed for W-14. Do not enable Generate merely to test this milestone: existing generation/claim pauses and global/user quotas remain unchanged, no worker is registered, and UI availability remains false. The current 120 MB upload user default cannot fund a 160 MiB generation reservation; operators must review actual storage and initialize adequate per-user accounts before the later release. Tests use disposable accounts and restore pauses before transaction commit.

Verification commands: npm run db:migrate (forward only), npm run db:test, npm run db:types:check, npm test, npm run typecheck, npm run contracts:check, npm run web:lint and npm run web:build. Browser queue API tests are generation-queue.spec.ts with W05_AUTH_TESTS=1 against the canonical running app, alongside uploads.spec.ts/project-drafts.spec.ts regressions. The concurrency fixture temporarily lowers the local global limit for its last-capacity race and restores it; it never raises the original allowance. It needs at least 160 MiB of existing unreserved local capacity.

Manual QA now: confirm the saved forms and uploads still work, Generate stays disabled, Dashboard keeps the real identity, and generation does not start. Developers can inspect the queue tests/SQL transaction and safe status responses. Do not manually enqueue a real job expecting a video in W-14; worker/cancellation/result integration follows later. Next is W-15 worker claiming, fencing, heartbeat and checkpoint adapter.


## Dedicated Saved drafts — 6 November 2026

Saved drafts now opens /drafts, not /dashboard#recent-title. It lists the current account’s active saved drafts, newest first. Continue draft opens the real /projects/<uuid> form. Load more drafts reaches older entries in pages of 20; Refresh reloads recent changes. Empty/loading/retry states are explicit, and a failed load-more request retains existing cards. Your actual profile stays in the shell. Sign-in returns to /drafts without replaying mutations or accepting arbitrary redirect queries.

Manual QA: save one draft of each mode, open Saved drafts, verify the /drafts address and current profile, reopen and check fields/uploads. Refresh and check new saves. With more than 20 drafts, Load more should reveal older drafts without duplicates. Check mobile width and sign out/back in from this page. A second account must see only its own drafts. API summaries contain no raw inputs or private media paths. No generated videos/results are added by this feature.


## W-15 worker control

See [local worker setup](LOCAL-WORKER.md). POST /api/worker/v1/claim, /heartbeat and /release use separate opaque worker authentication, protocol 1 and strict 16 KiB JSON messages. They do not use browser cookies or browser CSRF. Browser Origin requests and user JWTs are rejected. Generate stays disabled; actual pipeline stages/results remain W-16.


## W-16 Education generation

See [Education generation](EDUCATION-GENERATION.md) for current commands, activation, actual versus cached verification, limitations and manual QA. Save-then-generate preserves uncertain-request identity and later edits. The owned project has minimal status plus private MP4/SRT/VTT access; full four-stage progress/result-player/version/library UX retains its next milestones. Mobile and desktop keep the same Forest & Ivory tokens.


### Saved-draft deletion — W-24D, 6 November 2026

Sign in and open /drafts. Each card now has Continue draft and Delete draft. Deletion opens a cancel-first confirmation, retains the card on errors, prevents double submission and restores focus after completion. Refresh and reopen checks confirm removal persists. A changed draft requires closing the dialog and refreshing; active generation must finish or be cancelled before removal. Generated videos/history and shared sources are preserved. Source cleanup is scheduled and attempted after the response; the existing npm run uploads:cleanup command retries local abandoned/deleting sources, with incomplete-transfer grace accounting retained. General lifecycle scheduling and full W-24 are still unfinished.

Verification: eight real desktop/mobile deletion/list cases, 449 SQL assertions, two admission/delete races, 57 unit tests, types/lint/build and generated schema checks. The actual uploaded private-image fixture was removed and its used-byte charge released; no AI calls. R2 integration is the next milestone and is not enabled by this change.


### Education-only availability messaging — 6 November 2026

Live Dashboard and Create video show Coming soon for Software showcase and Product branding, explain future-release generation and offer Prepare draft actions. Existing direct/saved forms also explain the restriction near the top and disabled Generate control. Their draft editing, settings and private upload behavior are retained; no arbitrary release date is promised. Design-preview navigation remains separate and unchanged. Education remains the only enabled generation mode. Neutral shell copy does not claim worker readiness before a live status check.

The forms/dashboard explain that generated media is available for seven days after completion and downloaded copies stay on the device. Saving a draft does not start the result expiry countdown. Expiry authorization is implemented; general expired-result physical cleanup is still pending release work. Four desktop/mobile existing flow checks, visual desktop/mobile card inspection, types/lint/build passed. No API/DB/storage implementation changed; R2 remains the next milestone.


### Supabase retained for first release — 7 November 2026

User selected Supabase Auth/PostgreSQL/private Storage, retaining the existing local adapter rather than implementing the previously proposed R2 migration. Earlier dated R2-next statements above are superseded. No API/DB/schema, quota, credentials or local runtime changes were needed for this documentation decision. Hosted Supabase setup and verification, per-file upload/storage/egress limits and general retention cleanup remain launch requirements. R-02 is Deferred for showcase; next implementation task is W-17 progress/offline/provider-waiting UX in R-03, followed by recovery/cancellation and results/library work. The separate worker is still required.


### W-17 Education progress — 7 November 2026

Owned /projects/:id now shows four recorded stages, prepared narration-scene counts, assigned-worker availability, real claims pause and known/unknown provider waiting. It preserves draft/editor state through transient progress failures, pauses hidden-tab polling and resumes on focus/online. Check status and the retry notice only read status. No guessed percent/ETA, duplicate generation, provider dispatch or automatic job retry is introduced. New/empty drafts do not show fabricated progress. Existing result links remain; W-18 recovery, W-19 cancellation and full player/library are separate. See EDUCATION-GENERATION.md for manual checks and the tracker for evidence (474 SQL / 60 unit / eight unique desktop-mobile cases across corrected reruns).

## W-27 public entry — 12 November 2026

The root `/` is the public Education landing page. Open `/dashboard` for the real signed-in workspace; anonymous access redirects to sign-in. `/preview/*` remains fixture-only and is not linked from the public pages. Public `/help`, `/privacy`, `/terms`, `/contact` and 404 recovery share Forest & Ivory across desktop/mobile. Use the configured `http://127.0.0.1:3000` origin for local auth; do not mix aliases/ports. See [PUBLIC-PAGES.md](PUBLIC-PAGES.md) for the explicitly approved public contact and sample, media hash and private/public boundaries.

## W-29 shared recovery — 12 November 2026

Shared account fetches are bounded and sanitized, including malformed responses and confirmed non-JSON 401 session teardown. Temporary session/read/save failures retain the current workspace. Initial draft reads can be retried; replacing current edits with a newer saved draft requires confirmation. Pending shared dialogs retain keyboard focus even when their actions are disabled. See [Release QA](RELEASE-QA.md) for local evidence, test boundaries and manual checks. Next is essential W-24 local workspace/cache lifecycle cleanup; hosted security and deployment acceptance remain unfinished.

## Generation progress separation — 12 November 2026

Confirmed Education submissions now navigate to the owned /projects/:id/progress page. The saved draft editor has a compact status/link; Ready links to the pinned results route. Same-job recovery and cancellation stay on progress; another generation from the editor requires explicit confirmation. Exact progress return paths are accepted by local authentication. Measured narration-scene percentages are not a total-generation estimate. See [generation recovery correction](GENERATION-RECOVERY-FOLLOWUP.md) for diagnosis, limitations and manual checks. W-30 remains next.

## Completed-video and account controls — 12 November 2026

My videos and pinned result pages share confirmed Delete video actions and owned cleanup-status checks. The live dashboard formats decimal storage units and puts zero reservation details under How usage works. Signed-in desktop/mobile identity controls open Account settings/Sign out; settings reuses the same sign-out confirmation. Confirmed deliberate sign-out goes to Sign in and informs same-browser tabs; confirmed accidental expiry retains its separate recovery route. Preview identities remain sample-only. See [behavior and manual checks](VIDEO-DELETION-ACCOUNT.md).


## Security safeguards — 12 November 2026

Production HTML now receives a per-document nonce/CSP and renders dynamically so a static nonce is not cached. The policy allows only the configured Supabase origin for private media/connections and keeps required blob/local assets; eval/WebSocket allowances are development-only. Confirmed sign-in/sign-up/sign-out replace the document, using an allowlisted sign-in return, to clear prior client/router identity. Other tabs receive the existing confirmed-signout broadcast. Existing account/profile expiry and transient-background-error handling remain. Use Node 24. Remotion is aligned at 4.0.543; the lint-only minimatch override is 11.0.1, with zero known advisories in the fresh scan. [Controls/manual checks](SECURITY-CONTROLS.md).
