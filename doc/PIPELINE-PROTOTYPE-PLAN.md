> Authentication revision approved on 24 October 2026: public email/password registration and Google sign-in; no invitations, SMTP, verification emails or password-reset emails in V1. Other product requirements remain unchanged.

> Current authentication requirements are in [PRD](PRD.md), [API design](API-DESIGN.md) and [database design](DATABASE-DESIGN.md). Older invitation/SMTP references below are historical and do not apply to V1.

> Historical prototype document. As of 24 October 2026, accepted education/software samples inform the [full system architecture](SYSTEM-ARCHITECTURE.md). Use that document for current application design and the [tracker](PROJECT-TRACKER.md) for current status; older planned/next-task statements below record the prototype phase.

> Implementation order update (23 October 2026): the first prototype is now EDUCATION, using a topic and audience level. Software and branding follow later. See [local setup](LOCAL-SETUP.md). Technical architecture and three-mode V1 scope remain applicable.

# Video-pipeline prototype plan

**Read first:** [How we will build the application](START-HERE.md) explains the architecture and build order together. This document is the detailed task and validation reference.

**Date:** 23 October 2026  
**Status:** Planned; implementation has not started.  
**Design:** [Initial architecture](INITIAL-ARCHITECTURE.md)  
**Requirements:** [PRD](PRD.md)

## 1. Objective

Prove that three or four software screenshots plus a factual description can automatically produce an understandable 60-second narrated video with correctly matched visuals, synchronized captions, and a valid MP4. Use real AI generation for the live acceptance run; keep mock tests separate.

The prototype is TypeScript/Node.js with Remotion and non-Python native helpers. It does not build the complete Next.js interface yet. A local CLI will make pipeline behavior inspectable before cloud integration.

## 2. Build sequence

| Step | Work | Evidence required |
|---|---|---|
| P0: Environment | Check Node/package compatibility, disk/RAM, browser/render dependencies, Whisper.cpp and Rhubarb availability on Windows; identify configuration requirements | Environment report; missing dependencies clearly listed; no Python required |
| P1: Contracts | Implement runtime schemas, input manifest, local artifact/job repositories, stage events, hashes and checkpoints | Invalid input rejected; partial checkpoints not reused |
| P2: Visual planning | Implement Gemini adapter, image understanding, source-grounded storyboard and bounded JSON repair | Real screenshot-to-scene mapping with supported claims |
| P3: Narration | Implement Gemini TTS and configured eligible ElevenLabs fallback; measure decoded audio | Playable coherent narration and recorded provider metadata |
| P4: Caption timing | Integrate Remotion Whisper.cpp; normalize available provider timestamps; compare speech to script | SRT/VTT and measured timing checks, including product names |
| P5: Rendering | Implement screenshot/title/feature/closing layouts, shared audio timeline, clean MP4 and captioned test export | Decodable landscape video, correct 60–63-second duration |
| P6: Resilience/orientation | Add resume, cancellation, invalidation, bounded retries and portrait layouts | Interrupted run recovery, fallback test, portrait without distorted screenshots |
| P7: Teacher feasibility | Test short educational speech through Rhubarb and a reusable 2D teacher component | Teacher sample with valid mouth cues and pauses; no Python |
| P8: Findings | Record quality, timing, hardware use, limitations and decisions | Prototype report guiding detailed application architecture |

This sequence starts with software to exercise multimodal understanding. Branding and complete educational production are implemented in the subsequent application phases, not removed from scope. The teacher sample is an early technical risk check, not a complete education mode.

## 3. Suggested code boundaries

```text
apps/worker/              # CLI and local job orchestration first
packages/contracts/      # TypeScript types and runtime schemas
packages/pipeline/       # stages, adapters, reuse and retry policy
packages/video/          # Remotion compositions and layout contracts
fixtures/software/       # distributable synthetic test assets/manifests
docs/                    # PRD-linked architecture and findings
local-runs/              # ignored generated artifacts
```

Add `apps/web/` when building the web experience. Do not scaffold a nominally complete application whose generation endpoints only return fake videos. Choose exact package versions after inspecting supported APIs and compatibility.

## 4. Proposed prototype operations

These are desired interfaces, not commands that currently exist:

- **doctor:** report dependency/configuration availability without revealing secret values.
- **generate:** accept an input manifest, create one run, execute all stages and write a result report.
- **resume:** continue an existing run using valid checkpoints.
- **render:** render a validated timeline without invoking AI again.
- **voice-samples:** create bounded cached samples for auditioning when live credentials are available.

Use an explicit live-provider mode and a separate mock/test mode. Never mark mock narration or fixture timing as live provider success. Missing credentials must produce an actionable configuration message rather than fabricated output.

## 5. Test material and setup

Use original/synthetic screenshots with four distinguishable views: overview, project form, task board and reporting. Provide a brief that states supported behavior. Add a contradictory claim fixture, blurry image, duplicate screenshot, oversized upload and unsupported file.

Live run prerequisites:

- A Gemini API key with eligible image/text and TTS model access, stored locally outside Git.
- An ElevenLabs key and eligible free voice only for fallback validation; absence must not block the primary Gemini experiment, but fallback remains unverified.
- Native media dependencies and compatible model files installed with any required permission.
- Sufficient free disk/memory and user-owned or distributable sample input.

Do not request secrets in chat. Provide a documented local environment file when implementing. Inspect only whether values are configured, never print their contents.

## 6. Voice and regional-English experiment

Audition at least one male and one female prebuilt voice available in the selected free account. Use the same short script containing ordinary English, software terms, and Sri Lankan place names. Check clarity, pronunciation, pace and cross-scene consistency.

Inspect the available catalog for an explicit Sri Lankan English option; do not invent a locale or promise that instructions reliably create an accent. User listening feedback determines suitability. If no acceptable regional voice is available, record this finding and propose a clearly labeled English option. New paid voice design or voice cloning is outside scope.

## 7. Acceptance and failure tests

- Real primary-provider run creates a complete video without manually writing the final script or timing each scene.
- Every displayed screenshot is relevant to its narration; no unsupported feature is introduced.
- Landscape is 1280×720 and portrait 720×1280 at 30 fps; duration meets the PRD target tolerance.
- Audio contains the intended narration with no clipped words, silent missing scene, or mixed fallback voices.
- Captions match actual speech; sample boundary errors against the PRD quality target and report observed results honestly.
- Caption-burned render shows captions; clean render does not. Player integration comes later.
- Duplicate submission, transient failure, ambiguous timeout and Gemini quota exhaustion are simulated with deterministic adapters. Live fallback is separately tested when account access allows it.
- Worker interruption reuses completed validated artifacts; changed voice invalidates audio and dependent timing/render data.
- A cancelled run never publishes Ready. Failed verification preserves diagnostics without claiming success.
- Portrait text is readable and screenshots retain relevant context; inspect transitions as well as scene midpoints.
- Teacher feasibility includes rest during silence and no cue outside the audio range.

## 8. Exit report

Create `docs/PROTOTYPE-FINDINGS.md` after testing, containing:

1. What ran live versus mocked, with exact tool/model versions and nonsecret configuration.
2. Links to local outputs and timing/size/resource measurements.
3. Screenshot understanding, narration, caption and teacher-quality findings.
4. Free-tier availability and fallback limitations observed on the actual accounts.
5. Remaining defects, incompatible dependencies and recommended architecture changes.
6. A pass/partial/blocked result for every acceptance item.

Proceed to detailed application architecture after reviewing this evidence. Do not treat documentation completion, dependency installation, or a successful mock render as completion of the live video-generation prototype.
