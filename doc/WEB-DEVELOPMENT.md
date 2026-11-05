# Web application development

The first application milestone is the Next.js scaffold in `apps/web`. The existing CLI pipeline remains in root `src`, `scripts` and `test`; its commands are unchanged. [Project tracker](PROJECT-TRACKER.md) is the single feature-status source. [UI reconciliation](UI-RECONCILIATION.md) is the implementation checklist.

## Local commands

Run from the project root with Node 24 (validated with 24.19.0). The currently installed system Node 22.12 is below the lint toolchain requirement; use Node 24 for these commands:

```powershell
npm ci
npm run web:dev
```

Open http://127.0.0.1:3000. The server binds to localhost. Root redirects to `/preview/dashboard`. `/preview/create`, `/preview/videos` and `/preview/settings` now show Stitch-based visual previews: mode selection, sample library and sample settings. Education and Software links open their implemented form previews; Branding links retain the selected mode and show an explicit upcoming-form destination. Profile changes are page-local only, and account/library actions are informational previews. Education and Software form UIs are implemented; the Branding form and real backend integration remain planned. No private account data or credentials are required. The Dashboard now follows the confirmed Stitch desktop/mobile composition with clearly labeled sample profile/status/project data. Sample project actions are disabled; actual Dashboard data and the public landing page remain planned.

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

The player requests the fixed authenticated /api/v1/voices/Kore/preview only after a user clicks; it never synthesizes on demand. Optional reviewed audio is read from apps/web/voice-samples/Kore.wav (outside public/, ignored, maximum 2 MB). Missing audio gives previewUrl:null and an explanatory disabled control. Permission to reuse the matching private education-demo excerpt is pending; solar-demo is an ElevenLabs recording and must not be labeled Kore. No private demo file has been promoted. A fresh checkout intentionally has no sample until a reviewed asset is explicitly installed. Keep this limitation visible in the tracker; browser tests using a fake Audio implementation establish UI state handling only, not actual speech quality or decode.

Manual QA:
1. Sign in at the configured 127.0.0.1 origin, open Education, and check 60/75/90 seconds, landscape/portrait and Kore. Change choices, save and reopen; they persist.
2. Simulate a failed capabilities request: loading becomes an error with Try again, existing topic/title remains, and Save draft still works. Retry restores options.
3. With no installed authorized sample, Preview voice is disabled and explains why. After a sample is explicitly approved and installed, check audible speech, Stop, Replay, loading cancellation, offline Retry, hidden-tab stopping and navigation/session-loss cleanup. There must be no autoplay or new provider call. Real-audio QA is pending.
4. Check the same ivory mobile/desktop palette and no horizontal overflow. Generate remains disabled, and preview fixture routes retain their old sample-only behavior.

Automated education-capabilities.spec.ts labels mocked Audio explicitly; project-drafts.spec.ts additionally verifies real authenticated catalog access. Run with PLAYWRIGHT_PORT=3000, PLAYWRIGHT_REUSE_SERVER=1 and W05_AUTH_TESTS=1 against the local stack after building/starting the app. Only the existing synthetic W09 fixture users are removed.
