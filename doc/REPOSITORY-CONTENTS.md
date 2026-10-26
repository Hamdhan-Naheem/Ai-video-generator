# What belongs in GitHub

The application repository is the Desktop/ai-video-generator folder. The Documents/ChatGPT/Ai video gen folder is a separate work area containing earlier delivery copies. Use the application repository for application commits.

## Commit these

| Path | Why |
|---|---|
| apps/web/ | Web source, configuration and meaningful browser tests; ignored build/report files stay local |
| src/ | Existing TypeScript pipeline and rendering components |
| scripts/ | Setup, rendering and verification helpers referenced by project commands |
| test/ | Pipeline regression tests |
| examples/ | Small sample input JSON; the showcase example has a machine-specific source path and needs a locally supplied private screenshot |
| doc/ | Requirements, architecture, setup, design and progress; use README.md here as the reading map |
| AGENTS.md and apps/web/AGENTS.md | Project instructions and generated Next.js guidance; use the exact plural uppercase filename |
| README.md, .gitignore, package.json, package-lock.json, tsconfig.json | Setup, dependency reproducibility and configuration |
| .env.example | Placeholder/nonsecret configuration template only; review any edits before committing |

None of the source folders above is disposable merely because the web scaffold does not import it yet. The existing CLI uses the pipeline, scripts, tests and examples.

## Keep local and ignored

| Path | Treatment |
|---|---|
| .env and private .env.* files | Credentials; never commit |
| node_modules/ | Installed dependencies; recreated with npm ci |
| local-runs/ | Generated media, checkpoints and private sample assets; preserve accepted demos locally |
| .cache/ | Downloaded/native dependencies and cache; may need setup/download again if removed |
| .next/, out/, .vercel/, *.tsbuildinfo, next-env.d.ts | Generated framework/build/local hosting files |
| test-results/, playwright-report/, *.log | Browser artifacts and logs |
| whisper-bin-x64.zip | Local native-tool installer archive; not application source |
| .git/ | Git's internal metadata; never manually add or copy as repository content |

The current .gitignore covers these generated/private paths. Generated build/dependency folders are recreatable, but local-runs contains accepted outputs and private inputs: do not delete it as routine cleanup.

## Earlier working folders

The separate ChatGPT work area contains .pipeline-delivery, .setup-delivery, .setup-private, architecture-delivery, auth-revision, contract-design-delivery, dashboard-design-delivery, dashboard-v2-delivery, scaffold-delivery, solar-preview-stage, ui-reconciliation-delivery and visual-direction-delivery. These are staging/history, not required application folders. Do not push this work area wholesale; .setup-private in particular is private. marriage-assets and older docs/PRD copies also need individual review before any copying or cleanup. Leave them local until unique inputs or unsaved work have been backed up.

## Before the first push

All application files were untracked at this review; git ls-files returned no tracked files. Nothing was staged, committed or pushed by this review. Check git status --short and the staged file list before creating the first commit. Keep package-lock.json. Review documentation and examples for personal/local paths and private design references if the repository will be public; a public-content/secrets review has not been completed here.

No documents or folders were deleted or relocated. Historical documents and design-reference are optional to the runtime, while still useful to maintainers. Future cleanup can archive them after updating references.
