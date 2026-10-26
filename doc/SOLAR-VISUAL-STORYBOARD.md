# Solar energy — visual direction for review

Status: approved visual direction implemented in a real 60-second landscape video. Technical checks passed; user playback review is next. The still gallery below records the initial approved design.

Topic: How solar energy powers a home. Audience: beginners. Planned duration: 60 seconds, with final timings measured against actual narration. Landscape first; portrait layout also previewed.

## What changes

Replace the dark presentation-like node diagrams with a continuous outdoor world: pale sky, warm cream house, green landscape, rooftop panels and a visible inverter. Objects demonstrate the mechanism while narration explains it. Keep text to short object labels and captions. Keep the teacher small, with existing mouth cues restored when real speech exists. No music, cinematic footage, avatar services or Python.

The preview images use original code-drawn SVG artwork and a hand-written storyboard. They are not AI-generated output, a finished narrated video, or evidence of live synchronization. No Gemini or ElevenLabs request is needed for this review.

## Storyboard

| Beat | Draft interval | What viewers see | Proposed narration | Motion and transition |
|---|---|---|---|---|
| 1. Sunshine reaches the home | 0–13 s | Establish one house, rooftop panels, sun, clouds and trees in a light outdoor scene | Sunlight carries energy. On a sunny day, a home can capture some of that energy with solar panels on its roof. Let's follow the journey. | Gentle cloud drift and tree sway. Warm light markers travel from the sun toward the panels. Camera stays in the same world. |
| 2. Solar cells convert energy | 13–28 s | Roof panels become the focus; a small label identifies solar cells | Inside the panels, solar cells convert some of the incoming light into electrical energy. This produces direct current, or DC. The panels do not store the electricity themselves. | Outline the panel surface and brighten cells as light reaches them. For the final video, gently move closer to the roof instead of switching to a text slide. |
| 3. The inverter converts DC to AC | 28–44 s | Follow the cable down from panels to the inverter; a simple waveform changes inside its display | The electricity flows through a cable to an inverter. The inverter changes direct current into alternating current, or AC, which household appliances can use. | Moving energy markers follow the cable. DC line changes to an AC waveform. Focus shifts to the inverter. |
| 4. The home uses electricity | 44–60 s | The cable reaches the home; a lamp and television turn on behind its windows | Now that electrical energy can power lights and appliances. Output changes with sunlight, and panels do not generate solar power at night. Batteries or the grid can help, but they are separate parts of the system. | Lamp glows and television screen lights up. Return to the whole world so the complete source-to-home connection remains visible. |

The intervals are provisional; the draft narration must be timed and may need tightening before synthesis. Do not stretch pauses to force these boundaries.

## Visual accuracy rules

- Distinguish sunlight from electricity in wires. Moving markers show energy flow schematically, not particles or realistic electron speed.
- Panels convert energy; they do not create energy from nothing or inherently store it.
- The inverter changes DC to AC; it is not a battery or generator.
- The demonstration omits meter, breakers and other installation details. It is an explanation, not electrical wiring instructions.
- Do not imply solar panels provide uninterrupted power, work at night, or alone keep a house running during grid outages.

## Review files and command

Run `node --import tsx scripts/render-solar-previews.ts` from the project root. This renders five PNG stills only under ignored `local-runs/solar-visual-preview/`: four landscape beats and one portrait layout. No environment keys are loaded and no provider calls are made.

Inspect the artwork, light background, scene continuity, emphasis on objects, teacher size, and label readability. Stills cannot validate motion, final captions, lip syncing, narration accuracy or full-video rendering time.

## After visual approval

Connect allowlisted scene parameters to the validated storyboard, add panel close-ups and camera movement, generate one bounded narration, derive actual caption/mouth timing, synchronize object actions to scene timing, and render one reviewed landscape MP4. The first implementation is solar-specific; other topics need their own supported scene families. The existing education demo remains unchanged.

## Rendered still previews

These are local review artifacts and are excluded from Git. Open this document in VS Code's Markdown preview after running the preview command.

### 1. Sunshine reaches the home

![Sunshine reaches the home](../local-runs/solar-visual-preview/landscape-scene-1.png)

### 2. Solar cells convert energy

![Solar cells convert light](../local-runs/solar-visual-preview/landscape-scene-2.png)

### 3. The inverter converts DC to AC

![Inverter converts electricity](../local-runs/solar-visual-preview/landscape-scene-3.png)

### 4. The home uses electricity

![Appliances powered by solar energy](../local-runs/solar-visual-preview/landscape-scene-4.png)

### Portrait layout check

![Portrait version](../local-runs/solar-visual-preview/portrait-scene-4.png)
## Completed narrated result

[Play the solar landscape MP4](../local-runs/solar-demo/landscape-captioned.mp4). Gemini generated the four-scene script; ElevenLabs Alice supplied the complete narration after Gemini TTS was unavailable. The video includes actual captions/mouth cues, object motion, panel/inverter camera emphasis and a measured-caption-timed evening transition. See [tracker](PROJECT-TRACKER.md) for exact evidence and limits. The final MP4 passed full decoding and stream/duration checks; no new portrait MP4 was generated.
