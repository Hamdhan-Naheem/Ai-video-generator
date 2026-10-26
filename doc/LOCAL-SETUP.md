> Authentication revision approved on 24 October 2026: public email/password registration and Google sign-in; no invitations, SMTP, verification emails or password-reset emails in V1. Other product requirements remain unchanged.

> Current authentication requirements are in [PRD](PRD.md), [API design](API-DESIGN.md) and [database design](DATABASE-DESIGN.md). Older invitation/SMTP references below are historical and do not apply to V1.

# Local education-pipeline setup

The first prototype now starts with an educational topic. Software screenshot and branding workflows follow after the education pipeline works. This supersedes only the earlier implementation order, not the three-mode V1 scope.

## Files and credentials

The root `.env` holds local server/worker credentials. `.gitignore` excludes it and generated media. `.env.example` contains only placeholders. Never put private keys in browser code or `NEXT_PUBLIC_` variables.

Gemini is primary for scene/script generation and narration. ElevenLabs is the configured fallback only when API/voice access, free credits, and publication rights are suitable. No billing upgrade or paid credit purchase is part of this setup. A listed voice does not prove synthesis is allowed on a free account.

## Checks

Open this project root in VS Code and run:

```powershell
npm run setup:check
npm run setup:providers
```

No npm dependencies are needed for these checks. The second command sends each key only to its corresponding provider in an authentication header and makes read-only model/voice-list requests. It does not generate audio, consume a synthesis allowance, install media tools, or verify generation quality. It prints statuses, never secrets.

The video pipeline is not implemented by these setup scripts. Next: add TypeScript orchestration, validate the chosen Gemini API schema/model, generate a source-grounded educational script/storyboard, produce voice, caption timings and teacher cues, then render through Remotion.

## Initial test

- Topic: How a hydroelectric power station generates electricity.
- Audience: beginners.
- Language: English.
- Target: 60 seconds; landscape first, then portrait.
- Teacher: reusable 2D cartoon character with non-Python mouth-cue processing.
- Storage: local run folders; no Supabase/Vercel credentials needed yet.
- Audio: narration only; no background music.

Native Whisper.cpp/Rhubarb/render dependencies will be installed and tested during pipeline implementation. Their availability is not established by these configuration checks. Male/female voices need auditioning; Sri Lankan English suitability remains a listening test, not a confirmed provider guarantee.

## Verified setup results — 23 October 2026

- Gemini: existing project key captured through the signed-in AI Studio UI. The UI showed Free tier. Model listing authenticated, and both configured Gemini model IDs were listed. Text/TTS generation has not yet been tested.
- ElevenLabs: with explicit user confirmation, created `ai-video-generator-local-fallback`, limited to TTS plus voice/model read access, 1,000 credits per refresh period, 30-day expiry, and automatic leak disabling enabled. No other endpoint access was granted.
- Fallback voice: `Alice - Clear, Engaging Educator`, ID `Xb7hH8MSUJpSbSDYk0k2`; British English female voice, not a Sri Lankan-accent guarantee.
- A short ElevenLabs Flash v2.5 synthesis test succeeded and returned audio plus 43 character timing entries. This used a small amount of included credits. A listed voice alone was not treated as proof of synthesis access.
- No paid upgrade, music service, Supabase integration, deployment, or full video generation was performed.
- The fallback key expires 30 days after creation; renew it through the provider before using it after expiry. The 1,000-credit cap may require smaller test workloads; do not silently increase it.

## Implementation update — 23 October 2026

The first local education pipeline is now implemented and has generated real landscape/portrait captioned and clean landscape exports. The configured planner is now gemini-3.5-flash-lite after successful live validation; primary TTS remains gemini-3.8-flash-tts/Kore. Native tools are installed. See [pipeline usage](PIPELINE-USAGE.md), [findings](PROTOTYPE-FINDINGS.md), and [tracker](PROJECT-TRACKER.md) for current commands, evidence and remaining work. The earlier setup-only descriptions above record the state before implementation.
