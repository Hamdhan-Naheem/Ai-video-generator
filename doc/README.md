# Project document map

Keep the useful project documents in GitHub so a fresh checkout includes the requirements, decisions, setup and progress. They are not all required reading for every task. [Repository contents](REPOSITORY-CONTENTS.md) explains what to commit and what stays local.

## Current application references

| Document | Purpose |
|---|---|
| [PROJECT-TRACKER.md](PROJECT-TRACKER.md) | Current status, evidence, remaining features and exact next task |
| [PRD.md](PRD.md) | Approved product requirements |
| [SYSTEM-ARCHITECTURE.md](SYSTEM-ARCHITECTURE.md) | Current application architecture |
| [DATABASE-DESIGN.md](DATABASE-DESIGN.md) | Data model and ownership rules |
| [API-DESIGN.md](API-DESIGN.md) | API contracts and behavior |
| [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) | Approved desktop/mobile colors, typography and components |
| [UI-RECONCILIATION.md](UI-RECONCILIATION.md) | Reviewed flows and corrections for implementation |
| [UI-IMPLEMENTATION-AUDIT.md](UI-IMPLEMENTATION-AUDIT.md) | Actual scaffold versus Stitch differences and visual correction order |
| [WEB-DEVELOPMENT.md](WEB-DEVELOPMENT.md) | Web setup, commands, runtime and limitations |

## Pipeline setup and evidence

| Document | Purpose |
|---|---|
| [LOCAL-SETUP.md](LOCAL-SETUP.md) | Local pipeline environment/setup history |
| [PIPELINE-USAGE.md](PIPELINE-USAGE.md) | Working CLI commands |
| [PROTOTYPE-FINDINGS.md](PROTOTYPE-FINDINGS.md) | Actual live/mocked validation and limits |
| [SOFTWARE-SHOWCASE.md](SOFTWARE-SHOWCASE.md) | Source-specific accepted software sample |
| [SOLAR-VISUAL-STORYBOARD.md](SOLAR-VISUAL-STORYBOARD.md) | Accepted solar visual direction |

## Historical and optional design references

| Document or folder | Treatment |
|---|---|
| [INITIAL-ARCHITECTURE.md](INITIAL-ARCHITECTURE.md) | Historical prototype architecture; current architecture takes precedence |
| [PIPELINE-PROTOTYPE-PLAN.md](PIPELINE-PROTOTYPE-PLAN.md) | Historical build plan; tracker supplies current work |
| [START-HERE.md](START-HERE.md) | Plain-language prototype explanation; historical next steps are superseded |
| [UI-VISUAL-DIRECTIONS.md](UI-VISUAL-DIRECTIONS.md) | Record of design alternatives; DESIGN-SYSTEM supplies selected tokens |
| [UI-DASHBOARD.md](UI-DASHBOARD.md) | Original dashboard design review; reconciliation records later decisions |
| design-reference/ | Optional Stitch inventory/HTML references, not executable application code or verified latest approved screen identities |

These files are small and explain how decisions were reached. Keep them for now; a later archive move is optional and should update inbound links. Do not delete a historical file merely because it is not a current specification. Generated videos, screenshots of private inputs, checkpoints and secrets do not belong in this documentation folder.
