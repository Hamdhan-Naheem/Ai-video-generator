# Education pipeline — first live prototype findings

**Date:** 23 October 2026  
**Run:** `local-runs/education-demo`  
**Scope:** Local CLI and educational generation; full application not implemented.

## 1. What ran live

| Stage | Actual result |
|---|---|
| Topic | How a hydroelectric power station generates electricity, for beginners |
| Planning | `gemini-3.5-flash-lite` produced a valid four-scene, 107-word storyboard in 7.28 seconds |
| Speech | `gemini-3.8-flash-tts`, Kore voice; 52.08 seconds of decoded narration |
| Transcription | Local Whisper.cpp 1.6.0 with `base.en`, word-boundary output through Remotion |
| Speech/script comparison | 100% normalized word coverage across 107 caption units; this measures textual agreement, not precise boundary error |
| Teacher cues | Rhubarb 1.14.0 generated 308 validated mouth cues |
| Landscape MP4 | Live 1280×720 educational video, 60.011 seconds including recap hold, H.264/AAC, 3,366,072 bytes |
| Frame inspection | Real landscape frames at 5, 20 and 40 seconds inspected for title, teacher, diagram and caption placement |

The MP4 was produced from actual Gemini output and speech. Local native tools generated the timing and teacher cues. This run did not use the ElevenLabs fallback, synthetic narration, guessed equal-word timestamps, or a manually written replacement storyboard.

The 52.08-second narration fits inside the requested 60-second presentation. The ending retains the recap visuals without speech for approximately eight seconds. Whether that pacing is desirable needs listening/viewing feedback; future tuning can target a longer spoken explanation.

Output files are private/local and ignored by Git. The current `report.json`, `render-report-portrait.json`, and `render-report-landscape.json` record output verification when their corresponding commands finish. A report marked Ready must not be inferred from the mere presence of a filename.

## 2. Synthetic tests, clearly distinguished

- Twelve automated tests passed, covering input/path validation, schema restrictions, timing/export bounds, speech/script mismatch, cache-key reuse, voice fallback policy, actual mocked HTTP fallback routing, authentication stop behavior, and sanitized malformed responses.
- Automatic fallback was tested with mock service-error responses and a mock audio payload, so no real Gemini failure was needed to spend additional speech credits.
- A separate earlier short live ElevenLabs test verified Alice/Flash v2.5 synthesis and character timestamps. This is separate evidence from the primary-Gemini video run.
- Landscape and portrait layout fixtures rendered successfully using synthetic timing and silent audio, and were visually inspected. Their files explicitly say LAYOUT TEST and must never be shown as live AI-generation evidence.
- TypeScript checking passed for source, tests and TypeScript development scripts.

## 3. Tools and versions

| Component | Tested version/configuration |
|---|---|
| Node.js | 22.12.0 |
| TypeScript | 5.9.3 |
| tsx | 4.23.15 |
| Remotion packages | 4.0.538, consistently versioned |
| React / React DOM | 19.3.1 |
| Zod | 4.6.7 |
| FFmpeg npm package | `ffmpeg-static` 5.3.0 |
| FFprobe npm package | `ffprobe-static` 3.1.0 |
| Transcription engine/model | Whisper.cpp 1.6.0, `base.en`; model byte-size checked |
| Teacher mouth analysis | Rhubarb 1.14.0, official Windows release |
| Rendering browser | Existing Windows Chrome installation |
| Hardware observation | Approximately 15.7 GiB total RAM; approximately 3–4 GiB free during checks |

The first dependency installation took approximately 16 minutes due to network downloads. That is setup overhead, not the duration of each generation. The successful landscape render/resume invocation recorded 270.906 seconds; this excludes earlier failed attempts, initial planning/speech work and installation. It is not a full cold-start latency benchmark or performance SLA.

## 4. Issues found and fixed

1. **Large planner generation failures:** model listing succeeded but generation timed out, and a minimal request returned HTTP 503. The verified smaller free-tier Flash-Lite planner succeeded and is now the configurable default. The adapter uses low reasoning and structured JSON through the current Interactions API.
2. **Windows Whisper archive cleanup:** the binary extracted before a temporary ZIP deletion hit EBUSY. Installation now recognizes that specific cleanup-only case when the expected executable exists. Temporary archives are excluded from Git.
3. **Whisper model location:** the library looked in a different default folder than expected. The pipeline passes the model folder explicitly.
4. **Token-level caption artifacts:** initial timing intervals failed validation. Enabling word-boundary output resolved the observed invalid intervals; real output then passed interval and word-coverage checks.
5. **TypeScript/webpack imports:** the NodeNext `.js` import convention needed a webpack extension alias for TypeScript sources. The renderer config now includes it.
6. **Windows local audio networking:** renderer asset loading attempted IPv6 localhost against an IPv4-bound server. The composition resolves its local audio asset to IPv4 loopback; the successful full render confirms that path.
7. **Cache invalidation:** derived timings and cues depend on the hash of the actual audio bytes, not only narration text/voice settings. Recreated audio therefore cannot silently reuse stale timing.
8. **CLI argument forwarding:** demo npm scripts now embed their shared run ID, and direct CLI parsing rejects stray positionals instead of silently creating another run. Custom invocations use `node --import tsx` with explicit flags.

## 5. Recovery evidence

The live demo stopped during integration failures and later resumed while logging storyboard, narration, alignment and teacher cues as reused. Fixing the model-folder and renderer issues did not require another successful Gemini narration request. Checkpoints, status and error reports remain inspectable under the run folder.

Cancellation is cooperative between stages and blocks publication after a cancellation check; it is not immediate termination of an external/native operation. Unexpected process termination may leave a `.lock` file requiring verified manual cleanup. Fully automatic stale-lock recovery and cancellation race testing remain unfinished.

## 6. Remaining quality and product work

- Listen to the full narration and evaluate pace, pronunciation and teacher voice suitability with the user. The selected voice has not been established as Sri Lankan English.
- Measure actual caption-boundary error against the PRD target; 100% word coverage is not proof of ≤300 ms boundary accuracy.
- Review lip-sync naturalness over the full video; structural cue validity is not a human quality rating.
- Test additional educational topics, 75/90-second requests, malformed provider responses and forced interruptions across all stages.
- Test automatic duration calibration live; its bounds and failure behavior are implemented but this 52.08-second narration passed without invoking that correction.
- Expand visual teaching beyond generic node-flow diagrams; do not market this as a physical simulation or rich instructional illustration engine.
- Complete reliable stale-lock recovery, stronger cancellation/resource limits, and artifact-integrity checks beyond the current hashes/validation.
- Implement the detailed application architecture, Next.js/Tailwind interface, private auth/storage/queue integration, Vercel deployment and the remaining video modes in subsequent phases.

This is evidence that the initial local educational pipeline works for one topic, not a claim that the complete PRD or private application is finished.

## 7. Verified export set

| File | Dimensions | Duration | Size | Decode |
|---|---|---|---|---|
| landscape-captioned.mp4 | 1280 x 720 | 60.011 seconds | 3366072 bytes | passed |
| portrait-captioned.mp4 | 720 x 1280 | 60.011 seconds | 3373253 bytes | passed |
| landscape-clean.mp4 | 1280 x 720 | 60.011 seconds | 3201635 bytes | passed |

All three are 30 fps with audio. verification.json records SHA-256 hashes and full-decode results. The real portrait frame at 20 seconds and real landscape frames were inspected; the clean frame correctly has no burned-in captions. The measured renders used two frame workers; the renderer can now choose up to four based on CPU/RAM, but that updated concurrency selection has not yet been performance-benchmarked.

## Solar outdoor scene run — 23 October 2026

The approved light solar visual direction now renders through the actual pipeline. Final evidence lives under `local-runs/solar-demo/`: `report.json`, `render-report-landscape.json`, `verification.json` and six PNG frames. Output: 60.011 seconds, 1280×720, 30 fps, 5,069,736 bytes, full decode passed. The first resumed generate run took 253.997 seconds; this excludes the earlier failed speech request, script development and the final correction rerender.

Gemini Flash Lite produced the four-scene plan. One planner connection failure needed a bounded retry. One narration download ended at the original 120-second timeout; the next primary unavailability exercised the configured live ElevenLabs fallback. Speech is Alice/Flash v2.5, 51.919813 seconds, with provider-measured character timings. The normalized script/transcript word coverage is 1.0. Rhubarb cues are derived from the real audio. The final roughly eight seconds are a silent visual recap, not additional speech.

The final scene now fades sunlight and stops solar power/appliances around the measured caption line explaining nighttime limits, maintaining a light pastel background. Camera motion, sunlight markers, teacher mouth changes, panel labels, inverter waveform and appliance states are present in inspected output frames. Final visual correction used a render-only command, reusing the complete saved voice/timing artifacts without new AI calls.

Type checking and all 15 tests passed after implementation. Subjective playback review and quantitative caption/lip-sync boundary measurements remain pending. Solar is an explicit allowlisted scene family; this is not an arbitrary-topic illustration generator. Software/branding, the full web application and cloud integration remain unfinished. New solar portrait output is a still preview only.
## Make My Marriage screenshot showcase — 23 October 2026

The first software sample is a real 35.52-second landscape MP4 made from one supplied 1320×16384 mobile landing-page screenshot. Four reviewed crops are shown through a five-scene pan/scroll composition. Final 1280×720/30 fps/audio/duration checks and full decoding passed; five scene frames were inspected. Output size: 4,336,016 bytes. See `local-runs/marriage-showcase/verification.json` for the final SHA-256 and `doc/SOFTWARE-SHOWCASE.md` for commands and limitations.

Gemini image analysis supplied a draft; invalid evidence/word counts required tighter validation and a recorded local editorial shortening to 76 words. The model candidates remain saved. One complete Gemini TTS/Kore narration track is 34.8 seconds. The live primary provider worked; ElevenLabs was not used for this sample. Local Whisper.cpp timing had a bride-or-groom homophone error. A reviewed source-specific correction preserved the observed interval; raw recognition is retained. Normalized script/caption word coverage changed from 0.973684 to 1.0 after that text correction. This is not a quantitative caption-boundary accuracy measurement.

The final correction reused all three saved plan/speech/alignment checkpoints with no extra provider calls. The last cached resume/render/verify took 143.287 seconds, excluding original AI calls, development and failed attempts. Tests: TypeScript check and 18 unit/regression tests passed. Private assets and credentials are ignored by Git.

Limits: reviewed source-specific region mapping and script editing were involved. This does not establish generic screenshot/recording understanding, live signup/application functionality, portrait software export, production failure handling or complete app readiness. The sample-specific 30–40-second request leaves the educational 60–90-second contract unchanged. No teacher or music was used.