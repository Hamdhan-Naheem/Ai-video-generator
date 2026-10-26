> Authentication revision approved on 24 October 2026: public email/password registration and Google sign-in; no invitations, SMTP, verification emails or password-reset emails in V1. Other product requirements remain unchanged.

> Separate design documents: [Database design](doc/DATABASE-DESIGN.md) and [API design](doc/API-DESIGN.md). Review these, then Google Stitch UI and reconciliation before application implementation.

> Application design (24 October 2026): [System architecture](doc/SYSTEM-ARCHITECTURE.md) describes the next phase. Education and software samples are user-accepted; the local web scaffold is implemented; cloud integration remains planned. See the [tracker](doc/PROJECT-TRACKER.md).

# AI Video Generator

A local education-video prototype implemented in TypeScript/Node.js. It turns a topic and audience into a Gemini storyboard and narration, measured captions, Rhubarb teacher mouth cues, and a Remotion MP4. No Python, background music, Supabase, or web deployment is required for this prototype.

A Next.js/Tailwind scaffold now lives in apps/web. Authentication, cloud storage, and complete application generation flows remain later milestones. See the [project tracker](doc/PROJECT-TRACKER.md) for implementation status and remaining validation.

## Run in VS Code

Open this project root and use the terminal:

```powershell
npm run pipeline:doctor
npm run pipeline:plan
npm run pipeline:generate
```

The demo commands share `local-runs/education-demo` and reuse valid completed stages. Edit `examples/education.json` to choose the input. If you change the topic or other immutable input, use a new run ID with the direct command below; do not overwrite an existing input snapshot.

```powershell
node --import tsx --env-file-if-exists=.env src/cli.ts generate --input=examples/education.json --run=my-new-topic --captions
```

Use these exports after the demo timeline exists; they do not make additional AI requests:

```powershell
npm run pipeline:portrait
npm run pipeline:clean
```

The demo is a 60-second beginner explanation of hydroelectric generation. MP4s, script, captions, mouth cues, timeline and verification report are under `local-runs/education-demo`. These private/generated artifacts are ignored by Git.

## Install on a new machine

```powershell
npm ci --offline=false
npm run pipeline:tools
npm run pipeline:doctor
```

Configure the private root `.env` from `.env.example`; do not commit or share keys. The tools command downloads official non-Python native dependencies and an English model. It uses an installed compatible Chrome/Edge when found; otherwise Remotion provisions its rendering browser.

Gemini Flash-Lite is the current planner because it passed the live test while the larger planner returned service failures. Gemini TTS remains primary; ElevenLabs is the eligible configured narration fallback. See [findings](doc/PROTOTYPE-FINDINGS.md) for actual tested versions and limitations.

## Checks and documentation

```powershell
npm run typecheck
npm test
npm run pipeline:verify
npm run setup:check
```

Provider configuration checks remain available as `npm run setup:providers`. They list models/voices; they do not establish generation quality.

`pipeline:verify` checks all three demo exports after they exist, fully decodes them, and saves `verification.json`. Explicit export requests rerender the video; the AI/audio/timing/cue stages reuse valid checkpoints.

- [Pipeline usage, resume and cancellation](doc/PIPELINE-USAGE.md)
- [Prototype findings](doc/PROTOTYPE-FINDINGS.md)
- [Local setup and credentials](doc/LOCAL-SETUP.md)
- [Project tracker](doc/PROJECT-TRACKER.md)
- [Agent instructions](AGENTS.md)
- [PRD](doc/PRD.md)
- [Start Here](doc/START-HERE.md)
- [Initial architecture](doc/INITIAL-ARCHITECTURE.md)
- [Prototype plan](doc/PIPELINE-PROTOTYPE-PLAN.md)


## Web application development

The incremental Next.js application lives in `apps/web`. Start the local scaffold with `npm run web:dev` and open http://127.0.0.1:3000. This milestone is a labeled layout preview, not functional authentication or generation. See [web development](doc/WEB-DEVELOPMENT.md) for commands and [project tracker](doc/PROJECT-TRACKER.md) for feature status and the next task. Existing root pipeline commands remain available.


## Repository and documentation map

See [document map](doc/README.md) for current specifications and historical references, and [what belongs in GitHub](doc/REPOSITORY-CONTENTS.md) for source folders, generated files and local-only staging material.
