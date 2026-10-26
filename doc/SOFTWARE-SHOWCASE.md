# Make My Marriage — first software showcase

The user supplied a full-page mobile screenshot and requested a 30–40-second video. This sample uses one real 1320×16384 PNG, four reviewed crops, and a 1280×720 landscape composition. The screenshot describes a wedding-planning workspace for couples and families; it is not a matchmaking service.

## What the video shows

1. Introduce Make My Marriage and its shared wedding workspace.
2. Show multi-event planning, tasks, budgets and expenses.
3. Show guests, invitation responses and wedding documents.
4. Explain bride/groom sides and inviting both families into the same workspace.
5. Close with Create Your Wedding, using the actual website button in the screenshot.

Source regions in `src/showcase-contracts.ts` are reviewed specifically for this screenshot. The renderer pans the actual mobile page inside a preview frame; it does not invent authenticated application screens or simulate a completed signup. Sample figures and names are illustrative, not customer results. The user explicitly authorized uploading the four crops to Gemini and sending the resulting narration text to Gemini TTS or the configured ElevenLabs fallback.

## AI and local processing

Gemini performs image-based analysis and supplies a structured five-scene draft with source references. Exact evidence phrases and narration length are checked. Returned drafts are retained locally before validation. The first drafts did not meet length/evidence requirements; the retained draft was reviewed and shortened locally to 76 words before speech. This prototype therefore includes editorial review and does not establish fully automatic arbitrary screenshot generation.

Gemini TTS supplied one complete Kore narration track. Local Whisper.cpp derives caption timing. The reviewed homophone correction for “bride or groom” keeps the observed time interval; raw recognition output is preserved. Remotion renders the original screenshot crops with scroll movement, concise benefit headings and captions. There is no teacher or music in this software video.

The requested short duration is an exception for this sample; the original educational 60–90-second validation remains unchanged. The software timeline is measured against speech and checked against a 30–40-second output limit. Small pacing correction is supported locally only when necessary; the generation report records whether it occurred.

## Commands

Run these from the project root:

```powershell
npm run pipeline:showcase:plan
npm run pipeline:showcase
npm run pipeline:showcase:render
npm run pipeline:showcase:verify
```

- `plan`: analyze the approved screenshot with Gemini only if the matching validated plan is missing.
- `showcase`: reuse matching plan, speech and alignment checkpoints; generate missing stages and render/verify.
- `render`: use the saved timeline and media without loading keys or calling AI providers.
- `verify`: decode/check the existing MP4 and extract five real scene frames without AI requests.

The source image must match the reviewed dimensions and SHA-256 identity. This sample is deliberately mapped to one known screenshot; a general upload form, image redaction, automatic arbitrary region selection, full website behavior testing and the application frontend remain future work.

## Local artifacts

Output folder: `local-runs/marriage-showcase/`, ignored by Git. Important files: `landscape-captioned.mp4`, `generation-report.json`, `verification.json`, `script.txt`, `plan-review.json`, `captions.srt`, `captions.vtt` and `scene-1.png` through `scene-5.png`. Images and API keys do not go into source control. Keep `.env` private.

The credentials, illustration preview, software source images and actual provider output remain distinct. Tests mock network failures; they do not establish API balances or production readiness. The final media verification report supplies actual duration, dimensions, frame rate, file size, hash and full-decode result.

The image input adapter follows the [official Gemini image-understanding documentation](https://ai.google.dev/gemini-api/docs/image-understanding).
## Verified result

[Play the 35.52-second software showcase](../local-runs/marriage-showcase/landscape-captioned.mp4). The final file passed full decoding, 1280×720, 30 fps, audio-stream and duration checks. Five real scene frames were inspected, and the corrected collaboration caption was confirmed in the rendered output. Type checking and all 18 tests passed. Narration is Gemini TTS/Kore, 34.8 seconds; the final short hold keeps the brand CTA visible. No tempo adjustment was used. The final artifact is 4,336,016 bytes; see verification.json for its hash.

User playback review is accepted (recorded 24 October 2026). Technical checks and user approval do not establish measured caption-boundary accuracy or generic screenshot support. Only the screenshot-supported landing-page story is represented; live account/application behavior was not tested.
