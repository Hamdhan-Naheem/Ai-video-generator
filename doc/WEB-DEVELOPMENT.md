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

Run npm run web:dev and open /sign-up or /sign-in on port 3000. Full name, email and password create a real local Auth identity and its existing profile trigger. Passwords are preserved exactly; new passwords require 12–128 characters. No confirmation/reset email is sent. Email is self-declared, not proof of mailbox ownership. The /account-access page explains the recovery limitation. Google is visibly disabled until W-06.

After signing in, /dashboard is a minimal real-account welcome page; real project/usage/worker data belongs to W-08. /settings reads the signed-in identity's email and profile. Saving changes only display_name through the existing update_display_name RPC and expected settings version. Refreshing preserves the saved name. Stale-tab conflicts preserve entered text and offer an explicit reload of the latest saved profile. Email, roles and ownership cannot be changed by this endpoint. The /preview/* routes remain sample-based design fixtures, including the Create/My videos links. No database migration is needed for W-05.

W-05 implements GET /api/v1/auth/csrf, POST /api/v1/auth/sign-up, POST /api/v1/auth/sign-in, GET /api/v1/auth/session, and GET/PATCH /api/v1/me/settings. The initial settings GET is a W-05 projection (displayName, email, authMethods, settingsVersion); usage/defaults arrive with their real features. Private replies are no-store. User identity is verified through Auth and active-profile RLS, with the anon key and user session; there is no privileged database client in the web app. Every mutation requires the exact configured Origin plus a finite cookie/header CSRF nonce bound to the current session cookies. Requests are limited to 64 KiB and errors exclude raw SDK/SQL/password/token data.

The supported Supabase SSR SDK manages cookie chunks and refreshes on these API requests. W-07 still owns explicit refresh/sign-out/session-expiry UX and comprehensive protected routing. Password change and account deletion remain disabled future features. A small bounded per-process attempt limiter supplements Supabase Auth's limits; distributed abuse controls, OAuth collision checks and production configuration remain release gates. This local milestone is not a public deployment.

For real Auth browser checks, start the local DB and configure .env.local, set W05_AUTH_TESTS=1, then run npm run web:test. These opt-in checks create only uniquely named w05-*@example.invalid users and remove those test profiles/identities afterward; they must target this local project's Docker container. Existing browser checks run normally without this opt-in. Tests default to their own server on port 3100 with the matching APP_ORIGIN; optional PLAYWRIGHT_PORT=3000 and PLAYWRIGHT_REUSE_SERVER=1 reuse a developer's already-running local server. Do not run build and dev against the same workspace simultaneously.


### W-05 manual review

1. Open /sign-up on desktop and a mobile width. Confirm the same ivory background, empty fields and full name input. Check invalid email, a short password and mismatched confirmation before using valid details.
2. Create a local account. Check the real welcome page, then open /settings. Change Full name, save, refresh and confirm it persists; email stays read-only.
3. In a separate browser profile/private window, use /sign-in with the same email/password. Check an incorrect password gives a generic error and the correct password loads the saved name.
4. Open Settings in two tabs, save a name in one and attempt saving from the older tab. Confirm it offers the explicit saved-profile reload instead of overwriting silently.
5. Confirm Google sign-in and the later security/destructive controls are visibly unavailable. Account-access help must explain that no reset email can be sent. These tests create local-only accounts; production deployment and complete session/sign-out behavior are separate milestones.
