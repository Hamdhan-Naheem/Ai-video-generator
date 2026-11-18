# Linux Docker worker

This packages the existing Education executor for **Linux x86_64**. It does not deploy a server, activate a cloud trial, change storage, or authorize paid usage. Vercel still handles pages/light APIs; Supabase still supplies Auth, PostgreSQL and private Storage. The Docker worker handles long-running AI/native processing and rendering outside Vercel requests.

The Windows worker remains usable. The Linux automatic installer is the Dockerfile, not `pipeline:tools` (which remains Windows-only). ARM is explicitly rejected until its native tools have separate acceptance evidence.

## Build

From the repository root, with Docker's Linux engine running:

```sh
docker build --platform linux/amd64 -f deploy/worker/Dockerfile -t ai-video-worker:local .
```

The Dockerfile-specific ignore file allows only root manifests, worker/video/shared source and the offline check. It excludes the web app, `.git`, all `.env` files, credentials, caches, private voice samples, existing generated media and Windows node_modules. The image installs its own Linux dependencies from the npm lockfile. No provider key is used at build time. Native downloads have fixed versions and SHA-256 verification. Debian security packages can advance between builds; this is not a bit-for-bit reproducible OS snapshot. Rebuild and review packages before release.

Tools: Node 24.22.1, Whisper.cpp 1.6.0/base.en, Rhubarb 1.14.0, system Chromium and FFmpeg/FFprobe, aligned Remotion packages from the lockfile. Whisper is compiled without host-specific AVX/FMA instructions for portability. Native compilation tools are confined to the build stage. No Python workflow is used.

## Offline acceptance

This uses the previously approved 12-second private Education Kore excerpt, read-only. It runs real local Whisper and Rhubarb, then renders/fully decodes 60-second landscape and portrait fixtures with repeated cached audio, captions and mouth cues. These are synthetic scenes and repeated audio, **not fresh generated videos or a quality/speed claim about Gemini**.

PowerShell example from the repository root:

```powershell
$voiceFixture = (Resolve-Path 'apps/web/voice-samples/Kore.wav').Path
docker run --pull never --name ai-video-worker-offline --network none --cpus 2 --memory 4g --pids-limit 256 --shm-size 256m --tmpfs "/tmp:size=536870912,mode=1777" --cap-drop ALL --security-opt no-new-privileges --mount "type=bind,source=$voiceFixture,target=/fixtures/Kore.wav,readonly" ai-video-worker:local node --import tsx scripts/worker-container-check.ts
docker cp ai-video-worker-offline:/app/.cache/container-check/report.json .cache/linux-worker-report.json
```

The check verifies the sample's known SHA-256, forbids provider/service credentials, disables Node fetch and runs with Docker networking disabled. It never pairs, claims a real job, uploads media or calls an AI API. A missing fixture fails rather than synthesizing one. Keep the fixture private; it is not included in a fresh checkout/image. The final report records stage timings, output bytes, actual cgroup memory peak and CPU usage. Copy outputs only for local review; remove the explicitly named test container after collecting evidence. Do not remove application volumes.

## Later hosted connection — not provisioned by this task

1. Complete W31 hosted configuration and approved worker-credential provisioning first. Essential W30 health/pause/repair controls are verified locally; see [operator guide](OPERATOR-CONTROLS.md). Obtain an enabled worker's **separate hosted** connection file through the approved procedure. Do not copy a local database credential into production or merely edit its origin.
2. Its origin must be the canonical root HTTPS application origin. The existing transport refuses redirects and other insecure remote origins. `127.0.0.1` in a container is the container itself, not the Windows web app; the local connection file is not a remote setup.
3. Store `connection.json` and a **provider-only** env file outside the repository/image, readable by the worker user. Never upload the root `.env` wholesale. Include only existing approved Gemini configuration and optional eligible ElevenLabs configuration from root `.env.example`; no Supabase service-role key, database password, browser-public variables or Docker socket. Preserve provider/model/budget restrictions.
4. On a private Linux host set the two path variables, then use the provided Compose file:

```sh
export WORKER_CONNECTION_FILE=/secure/ai-video-worker/connection.json
export WORKER_PROVIDER_FILE=/secure/ai-video-worker/providers.env
docker compose -f deploy/worker/compose.yaml up -d --build
docker compose -f deploy/worker/compose.yaml logs --tail 50 worker
```

Compose secret mounts are local read-only file mounts, not a hosted encrypted secrets service. Protect host permissions/backups; do not print their contents or run `env` in the container. Provider values are loaded only by the existing execution child from `/app/.env`; the control parent does not load that file. Persistent named volumes hold checkpoints/registry and job workspaces. The image's native tools live under `/opt`, so a cache volume cannot hide them. No inbound port, privileged mode, host network or Docker socket is needed. Outbound HTTPS to the app and configured providers is required; renderer communication stays local.

Compose runs as UID 1000 with dropped capabilities, no privilege escalation, capped logs, 2 CPUs, 4 GiB memory, one job slot, 2 render workers, 2 Whisper threads and a 45-second stop grace period. Remotion Chromium uses its rendering flags; this container is not a sandbox for arbitrary untrusted code. Only validated allowlisted scene data is accepted. The filesystem permits the existing transcription temporary file and bundler caches; it is not mounted globally read-only. Resource limits are a starting test envelope, not proof of 100 concurrent generations. Memory reporting now respects the container limit.

Before switching hosts, pause new claims, let the existing assignment finish, stop the old claiming worker, and verify only one intended worker is active. Test revocation, termination, lease expiry, remote recovery and publication on the actual host before launch. A cloud restart must not delete named volumes. Host disk usage includes the image, caches, workspaces, logs and temporary bundles, independently of the 200 MB account / 400 MB global media allowances.

Physical private-media cleanup and registered workspace cleanup still require their documented operators/watchers. They are **not automatically scheduled** by this Compose file. Server/service credentials for private Storage cleanup must stay in their separately protected environment. Follow [media retention](MEDIA-RETENTION.md) and [workspace cleanup](LOCAL-WORKSPACE-CLEANUP.md); hosted scheduling/legacy review remains W-31/full W-24.

## Trial and availability boundaries

Do not start a cloud trial until local packaging and release gates pass. Cloud eligibility, credit balance and hardware costs require checking at provisioning time. Google Cloud x86_64 is a candidate, not an activated or guaranteed-free deployment. This task does not create billing, credentials, a VM or a one-month shutdown schedule. Agree the host and expiry/disable plan explicitly before deployment. After remote acceptance, visitors would use that server rather than the creator's computer. Until then only local processing availability is established.

Implementation references: [Remotion Docker guidance](https://www.remotion.dev/docs/docker), [Whisper source](https://github.com/ggml-org/whisper.cpp/tree/v1.6.0), [Rhubarb release](https://github.com/DanielSWolf/rhubarb-lip-sync/releases/tag/v1.14.0).

## Acceptance evidence

Complete locally on 13 November 2026. Real Linux native tools and synthetic cached-audio renders passed, with networking disabled and no keys. No remote worker or fresh AI generation was accepted.

| Check | Measured seconds |
|---|---:|
| whisper | 100.4 |
| rhubarb | 38.4 |
| render-landscape | 322.5 |
| decode-landscape | 5.8 |
| render-portrait | 317.0 |
| decode-portrait | 6.5 |

- Script total after initial module loading: 801.3 seconds. Full container wall time: 813.9 seconds (includes cold startup/imports). These timings exclude AI planning/synthesis and are not cloud speed guarantees.
- Container CPU cap: 2; memory cap: 4 GiB. Measured cgroup memory peak: 2205.4 MiB. Actual frame workers: landscape 2, portrait 2. Cgroup CPU work: 1477.3 CPU-seconds.
- Docker Desktop reports 3.53GB for the image; benchmark writable layer after completion: 16.7 MiB. This includes duplicate fixture exports, not a peak-disk measurement. Start hosted sizing with at least 20 GB available disk for image/build cache/workspaces/logs, then verify real 75/90-second work and cleanup on the chosen host. Do not confuse host disk requirements with account/global retained-media allowances.
- 23 measured excerpt captions; 74 mouth cues. Both outputs are 60 seconds, 30fps H.264/AAC, 1280×720 and 720×1280; both fully decoded with FFmpeg -xerror. Registered private bundles were removed after both renders. Landscape/portrait fixture frames were visually reviewed: captions, teacher, diagrams and text fit without clipping. The same cached 12-second excerpt repeats five times; these are tool/layout fixtures, not new narrated content.
- Non-root UID 1000 wrote both named volumes and retained their markers across container recreation; uniquely labeled test volumes were removed afterward. Compose syntax validation, all 118 backend tests, root TypeScript and full decode/stream checks of three existing accepted demo exports passed. No web UI/API/schema change required browser or SQL reruns in this slice.
- Verified runtime: 24.22.1; ffmpeg version 5.1.9-0+deb12u1 Copyright (c) 2000-2026 the FFmpeg developers; Chromium 156.0.8078.79 built on Debian GNU/Linux 12 (bookworm). Whisper.cpp 1.6.0/base.en and Rhubarb 1.14.0 are pinned and checksum-verified by the build.
- Private fixture mount was read-only. No app .env, .git, web app/private voice samples or local connection file is baked into the image. No worker token/service key was supplied to acceptance.
- Cold build/export on this Windows host suffered memory pressure. Pending writes were synced and Linux filesystem cache released without stopping containers or changing VM settings. Benchmarking followed final image export. Dedicated-host performance remains unverified.
- Raw local evidence: ignored `.cache/linux-worker-report.json`, `.cache/linux-worker-metrics.json`, `.cache/linux-worker-volumes.json`, `.cache/linux-worker-output/` and build logs.

Remaining gates: W31 hosted credential pairing/termination/recovery/maintenance/security/load acceptance and fresh remote Education generation. Essential W30 health/pause/repair/audit controls are now verified locally; see [operator guide](OPERATOR-CONTROLS.md). ARM, cloud/trial activation, expiry/shutdown scheduling, hosted generation and production sign-off remain unverified. No deployment, new credentials, paid activation, allowance increase, reset, real-media deletion, commit or push.

