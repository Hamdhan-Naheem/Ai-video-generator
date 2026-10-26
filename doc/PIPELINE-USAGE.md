# Local education pipeline

The CLI accepts an education topic and runs the local processing stages. It loads credentials from the ignored root `.env`. It does not require Supabase or Vercel. No Python or music is used.

## Installation

```powershell
npm install --offline=false
npm run pipeline:doctor
npm run pipeline:tools
npm run typecheck
npm test
```

`pipeline:tools` downloads the official Windows Whisper.cpp 1.6.0 binary, an English base model, the official Rhubarb Windows release and Remotion's rendering browser. These tools and models use disk/memory but do not require a hosted transcription/avatar API. Model downloads can be substantial. Native-tool installation currently targets Windows.

## Generate a plan first

Edit `examples/education.json`, then run:

```powershell
npm run pipeline:plan
```

This makes a real Gemini request and saves a validated storyboard, script and report in `local-runs/education-demo`. It does not yet synthesize speech or render video. Inspect the material as part of development quality testing.

## Generate the video

```powershell
npm run pipeline:generate
```

The same run reuses a valid saved plan. It generates narration, normalizes/decodes audio, obtains real caption timings, generates Rhubarb mouth cues, creates a measured timeline, and renders an educational video. The exact provider, voice and measurements are recorded in local JSON reports. A provider/model listing is not a successful generation test.

Main outputs:

- `storyboard.json`: cached validated AI storyboard with fingerprint.
- `script.txt`: generated narration text.
- `public/narration.wav`: normalized audio served only to the local renderer.
- `alignment.json`, `captions.srt`, `captions.vtt`: speech timings and captions.
- `teacher-cues.json`, `mouth-cues.json`: teacher animation cues.
- `timeline.json`: render settings and measured scene offsets.
- `landscape-captioned.mp4` or `landscape-clean.mp4`: rendered output.
- `status.json`: current status. `failure.json` preserves the latest failure details if one occurred; a later successful `status.json` supersedes that historical failure.
- `report.json`: verified result or plan-only report.

If a stage fails, fix the reported dependency/configuration and repeat the same command with the same run ID. Valid plan/audio/alignment/cue checkpoints are reused. This is a local prototype; unexpected process termination can leave a `.lock` file. Confirm the old process is stopped before manually removing only that run's `.lock` file. Do not delete all run outputs to fix a lock.

## Reuse audio for portrait, previews and caption variants

```powershell
npm run pipeline:portrait
npm run pipeline:clean
node --import tsx --env-file-if-exists=.env src/cli.ts render --run=education-demo --format=portrait --still
```

Render-only commands reuse an existing measured `timeline.json`; they do not call the AI services. Caption display can be burned into a requested export. Clean MP4 and SRT/VTT are kept independently for later player integration. Changing the topic/input requires a new run ID. Voice/provider settings are included in audio reuse keys.

After producing all three demo exports, run `npm run pipeline:verify` for full-decode, dimensions, frame-rate and duration checks. It saves a separate verification report. Output media remain on disk until manually deleted in this prototype; automatic seven-day expiry belongs to the later application integration.

## Cancellation

```powershell
node --import tsx --env-file-if-exists=.env src/cli.ts cancel --run=education-demo
```

Cancellation is checked between stages; it is not a guarantee of immediately interrupting an in-flight external request/native command. A cancelled run cannot publish Ready. Use a new run ID to start again after a recorded cancellation. Ctrl+C also requests safe cancellation.

## Limits and truthful quality reporting

- Gemini speech uses the configured model's Interactions API; no unrequested model upgrade or paid fallback is performed.
- Qualifying quota/service/connection failures can switch the entire narration to eligible ElevenLabs access. Authentication, request and safety errors are not bypassed.
- Actual duration must fit the chosen 60/75/90-second target tolerance. A bounded rewrite/re-synthesis can calibrate narration to the measured voice speed; if it is still unsuitable, the run fails clearly instead of clipping words or adding long silence.
- Transcription is compared to the script using measured token/word alignment. Below-threshold coverage or invalid intervals stops rendering. High word coverage does not itself prove precise caption boundaries or perfect factual correctness.
- Diagrams use a generic animated node-flow layout; they are explanatory diagrams, not simulated physical equipment. Only conceptually valid directed relationships should be used.
- Teacher artwork is original vector code and animated from actual Rhubarb cues. Human review is still needed to judge convincing lip sync, layout and narration.
- Only the education CLI is implemented in this slice. The complete web app, private cloud storage, durable hosted queue, advanced semantic correction and the other two modes remain later work.

## Solar outdoor-scene example

The user approved the light outdoor visual direction. `examples/solar.json` explicitly selects `solar-energy`; the planner must return four ordered, allowlisted visual values: sunlight, solar-cells, inverter, powered-home. Runtime validation rejects missing or reordered values. The original diagram renderer and hydroelectric demo remain available. This family explains rooftop photovoltaic power; it does not support arbitrary topics with matching illustrations.

Run `npm run pipeline:solar` for one landscape captioned MP4 under `local-runs/solar-demo`. Valid script, narration, captions and teacher cues are reused on resume. Rendering is repeated; a saved final MP4 is not itself a generation cache. Never change this run's input for a different topic: use a new run ID.

Run `npm run pipeline:solar:verify` after generation to fully decode the result, check 1280×720/30 fps/audio/duration, and extract six real frames for inspection. This verification performs no API calls.

The scene family includes light scenery, traveling sunlight/energy markers, subtle panel/inverter camera emphasis, an AC waveform, appliance lighting, actual teacher mouth cues, and measured captions. Illustrations are original code-drawn assets; AI writes the structured narration and selects supported visual instructions. The final app still needs broader scene coverage and its web/database integration.

Speech requests allow up to four minutes; planning requests allow up to two minutes. Interrupted response downloads are classified as connection failures; malformed JSON remains invalid-response. Only configured eligible quota/service/connection failures may route the entire speech track to the selected fallback. Retries remain bounded.
## Short screenshot software example

See [software showcase guide](SOFTWARE-SHOWCASE.md) for the Make My Marriage sample, commands, approved image analysis, source mapping and limits. The supplied screenshot is used for one requested 30–40-second landscape showcase; this is separate from the original 60–90-second education contract. `npm run pipeline:showcase` resumes the sample's saved stages; `npm run pipeline:showcase:render` and `npm run pipeline:showcase:verify` use only local saved artifacts.