# AI Video Studio — dashboard design review

**Date:** 24 October 2026  
**Feature:** Dashboard and visual foundation.  
**Status:** Historical initial desktop review. Later desktop/mobile flows were reviewed; use UI-RECONCILIATION.md for implementation corrections. The web scaffold exists; the final product dashboard remains planned.  
**Visual reference:** [Forest & Ivory foundation](DESIGN-SYSTEM.md).

## 1. Scope and hierarchy

Design `/dashboard` as a calm starting point. The three questions it answers are: What can I create? Where are my recent projects? Is processing available?

1. Narrow consistent navigation: Dashboard, Create video, My videos, Settings.
2. Short welcome heading and a compact processing-availability label.
3. Three restrained creation options: Education, Software showcase, Product branding. Each opens its later mode-specific source form.
4. Recent owned project rows with useful status, duration/orientation and one contextual action.
5. Compact output-slot and seven-day retention notice. Detailed usage belongs elsewhere or appears when actionable.

No inline topic form, script editor, four-step manual wizard, analytics chart, notifications inbox, team controls, pricing, credit purchase, full result player or operator internals. The sidebar and three mode choices provide creation access without repeated giant calls to action.

## 2. Illustrative data for this draft

| Project | Metadata | State / action |
|---|---|---|
| How solar panels power a home | Education · 60 sec · Landscape · 720p | Ready; Open video; available for six more days |
| Make My Marriage overview | Software · 60 sec · Portrait · 720p | Draft; Continue |

These are fictional UI examples. They do not change the actual software sample's 35.52-second landscape evidence or establish a saved project in a backend. A small sample-data annotation identifies the preview fixture. One Ready output and one Draft produce **1 of 3 saved-video slots used**; drafts do not consume output slots.

## 3. Action-to-contract mapping

| UI element | Navigation / contract |
|---|---|
| Dashboard initial data | GET /api/v1/projects, /me/settings, /availability |
| Mode tile | /projects/new with mode preselected; later source-form design |
| Continue draft | Owned /projects/[id], draft state |
| Open video | Owned /projects/[id], result state; signed media access happens on that screen |
| View all | /videos |
| Profile/settings | /settings; sign-out uses Auth adapter |

Availability in this draft is fixture data. Implementation must use actual heartbeat/controls and distinguish offline from failed job. Showing Processing available must never mean a guaranteed completion time.

## 4. Later dashboard states within this feature

After reviewing the main desktop direction, design its responsive/mobile and empty-state variants without advancing into education creation:

- First visit: replace recent project rows with a small friendly empty message; retain mode choices without repeating the whole introduction.
- Offline: show Waiting for processing computer or processing unavailable guidance, preserve drafts and allow permitted queueing.
- One active job: show stage/status and Open project action; prevent starting a second job with explanatory copy.
- Output/storage cap: actionable notice to manage/delete owned outputs, no silent eviction or paid upgrade.
- Loading and unavailable data: unobtrusive skeleton/retry feedback, no fake project/usage values.
- Expired result: clearly labeled and no broken download promise; full recovery flow belongs in project/library design.

These states are required design follow-up, not screens generated or approved by this first desktop draft.

## 5. Review checklist

- User can identify the main creation options and return to a recent project quickly.
- Forest & Ivory and Manrope match the selected foundation; flat surfaces and whitespace keep the page calm.
- All three PRD video modes are represented, without teacher imagery implying a teacher in software/branding outputs.
- Recent projects are legible and uncluttered; one meaningful action per row.
- Usage counts agree with fixture states; 720p only, English and approved baseline durations.
- No invitations, SMTP, verification/reset email screens or unwanted auth assumptions.
- Exact details of source forms, generation progress, result/revision/export screens remain for later user-approved feature steps.

## 6. Next

User reviews this desktop dashboard and requests refinements or approval. Then finish dashboard mobile/empty/state variants using the approved structure, and move to education creation only after this feature is finalized. No video generation, API implementation, database migration or deployment is part of this UI design task.

## Stitch desktop review artifact

Final desktop draft: screen b32301ed129c4bc798ebd747119ae9af in project 11898319746861427028. Screenshot file: projects/11898319746861427028/files/6732f408fc4440489a1a88d5fe9f1970. Visually inspected after removing unrequested notification/help controls, theme subtitle, and duplicated draft-capacity explanations. Palette/type, mode choices, status/actions, 720p fixture metadata and 1-of-3 usage were checked. Desktop layout awaits user approval; mobile/empty/other dashboard states remain follow-up.
