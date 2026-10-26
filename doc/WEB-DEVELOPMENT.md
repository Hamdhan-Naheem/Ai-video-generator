# Web application development

The first application milestone is the Next.js scaffold in `apps/web`. The existing CLI pipeline remains in root `src`, `scripts` and `test`; its commands are unchanged. [Project tracker](PROJECT-TRACKER.md) is the single feature-status source. [UI reconciliation](UI-RECONCILIATION.md) is the implementation checklist.

## Local commands

Run from the project root with Node 24 (validated with 24.19.0). The currently installed system Node 22.12 is below the lint toolchain requirement; use Node 24 for these commands:

```powershell
npm ci
npm run web:dev
```

Open http://127.0.0.1:3000. The server binds to localhost. Root redirects to `/preview/dashboard`. `/preview/create`, `/preview/videos` and `/preview/settings` now show Stitch-based visual previews: mode selection, sample library and sample settings. Creation links retain their selected mode and show an explicit upcoming-form destination. Profile changes are page-local only, and account/library actions are informational previews. Real mode forms and backend integration remain planned. No private account data or credentials are required. The Dashboard now follows the confirmed Stitch desktop/mobile composition with clearly labeled sample profile/status/project data. Sample project actions are disabled; actual Dashboard data and the public landing page remain planned.

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

Next: the Education input-form UI using the completed W-02 controls, then Software/Branding forms. W-02 shared fields, buttons, notices, status badges, dialogs and loading/failure/retry presentation are implemented and verified. Shared schemas and persistence/auth integration follow incrementally. Mark Complete only after the milestone's actual checks pass. Visual placeholders never count as implemented authentication, uploads, project data or generation.

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

Acceptance coverage is in apps/web/e2e/shared-controls.spec.ts alongside the existing page tests. W-02 passed 26 desktop/mobile browser checks in total, web lint/typecheck/build, and the 18 existing pipeline tests. The next feature is the full Education form UI; real auth, saves, uploads and generation remain separate planned work.
