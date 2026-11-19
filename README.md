# AI Video Studio

A portfolio application that turns educational topics into narrated, illustrated videos. Built with Next.js, TypeScript, Gemini, Remotion and Supabase.

**Live showcase:** https://hamdhan-ai-video-studio.vercel.app

## Current showcase status

- The website and APIs are deployed on Vercel, with Supabase Auth, PostgreSQL and private Storage.
- Visitors can create an email/password account, sign in, explore the forms, and save/reopen their own drafts.
- An accepted hydroelectric Education video is available on the landing page. A short Kore voice preview is derived from this same approved public example; it does not synthesize speech for your current form.
- **Live video generation is currently unavailable on the hosted showcase.** Full Education generation is implemented and has been demonstrated locally with a separate background worker. The form reflects server-reported availability and explains unavailable processing without starting a job.
- The local Education workflow includes progress, bounded retry, cancellation, verified result playback and MP4/SRT/VTT downloads. Hosted end-to-end generation, worker pairing and remaining release checks are unfinished.
- Software showcase and Product branding forms/drafts remain available; their generation and Google sign-in are deferred to a future release.

This project is a recruiter/learning showcase. An always-on cloud worker has not been provisioned. A full demonstration can be run locally during an interview; the PC does not need to remain on for ordinary hosted website browsing. See the [project tracker](doc/PROJECT-TRACKER.md) for exact evidence and pending work.

## How generation works

1. A user supplies an educational topic, audience and preferences, then saves a draft.
2. When processing is enabled, the server freezes the input and queues a job in PostgreSQL.
3. The separate Node.js worker uses Gemini for the storyboard/script and primary narration. An eligible, explicitly configured ElevenLabs fallback is supported.
4. Whisper.cpp supplies measured caption timing; Rhubarb derives the 2D teacher's mouth cues. Remotion renders allowlisted illustrated scenes into a verified MP4.
5. The worker uploads media to private Supabase Storage. The signed-in owner can play or download results through short-lived grants.

The generated project media has a seven-day availability period. The deliberately public demonstration assets are separate from private user media and do not follow that project expiry. Provider allowances and application limits still apply; no unlimited or always-free generation is promised.

## Technology

| Area | Tools |
|---|---|
| Web | Next.js, React, TypeScript, Tailwind CSS |
| Authentication/data | Supabase Auth, PostgreSQL, row-level security |
| Media | Private Supabase Storage |
| AI | Gemini planning/TTS; eligible ElevenLabs narration fallback |
| Video worker | Node.js, Remotion, FFmpeg/FFprobe, Whisper.cpp, Rhubarb |
| Hosting | Vercel web/API; separate local worker for full demonstrations |

## Local web development

Use Node 24 and Docker Desktop with Linux containers. From the repository root:

```powershell
npm ci
npm run db:start
npm run db:migrate
npm run web:auth:local
npm run web:dev
```

Open http://127.0.0.1:3000. Local Supabase Studio is at http://127.0.0.1:55423. These loopback addresses refer to your own computer; they are not public deployment links. Local accounts/data are separate from hosted Supabase.

Review [web development](doc/WEB-DEVELOPMENT.md) and [local database setup](doc/LOCAL-DATABASE.md) before changing configuration. `/preview/*` routes are disconnected design fixtures, not real account/project workflows. The setup helpers target the isolated local Docker stack; do not use them to configure the hosted database.

## Local Education demonstration

Use the existing private root `.env`, configured from `.env.example`. Never commit its values. Check the tool installation first:

```powershell
npm run pipeline:doctor
```

See [Education generation](doc/EDUCATION-GENERATION.md), [local worker setup](doc/LOCAL-WORKER.md), and [Linux Docker worker](doc/LINUX-WORKER.md) for credential provisioning, native tools, limits and worker operation. Starting the web app alone does not start video processing. Hosted pairing needs separate hosted worker credentials; an existing localhost connection file cannot be reused by merely changing its URL.

The standalone CLI pipeline also remains available:

```powershell
npm run pipeline:plan
npm run pipeline:generate
```

These commands can make real provider requests. The demo uses `examples/education.json` and `local-runs/education-demo`, reusing valid checkpoints. For changed inputs use a new run ID as described in [pipeline usage](doc/PIPELINE-USAGE.md). `pipeline:tools` installs the Windows native tools; the Dockerfile supplies the Linux equivalents. Existing private/generated artifacts stay ignored.

## Quality and security

```powershell
npm run typecheck
npm test
npm run web:typecheck
npm run web:lint
npm run web:build
npm run web:test
```

Browser tests that require local Supabase are opt-in; see the web guide. Production builds check application types separately from local E2E tooling. Do not run a web build and dev server concurrently.

Implemented safeguards include owned records with RLS, server-side validation, CSRF/Origin checks, private media grants, bounded jobs/provider usage, fenced worker leases and recovery checkpoints. Local verification and an npm audit result are not comprehensive production security sign-off. See [security controls](doc/SECURITY-CONTROLS.md) and [release plan](doc/EDUCATION-RELEASE.md).

Never commit actual `.env` files, API keys, database passwords, worker connection files, private media, `node_modules` or generated caches. Committed `.env.example` files contain placeholders only. See [repository contents](doc/REPOSITORY-CONTENTS.md).

## Documentation

- [Project tracker and next task](doc/PROJECT-TRACKER.md)
- [Requirements](doc/PRD.md)
- [System architecture](doc/SYSTEM-ARCHITECTURE.md)
- [Database design](doc/DATABASE-DESIGN.md) and [API design](doc/API-DESIGN.md)
- [Education release scope](doc/EDUCATION-RELEASE.md)
- [Prototype findings and accepted samples](doc/PROTOTYPE-FINDINGS.md)
- [Public sample provenance](doc/PUBLIC-PAGES.md)
- [Full document map](doc/README.md)
