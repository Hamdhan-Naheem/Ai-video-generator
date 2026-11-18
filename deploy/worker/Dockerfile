# Linux x86_64 only. Update pinned downloads deliberately, then rerun offline checks.
FROM node:24.22.1-bookworm-slim@sha256:be8204d4bd327363357f532187b752ff62759c31bedf98e9e18fc08c9cbd605c AS native
ARG TARGETARCH
RUN test "$TARGETARCH" = amd64
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl unzip build-essential && rm -rf /var/lib/apt/lists/*
WORKDIR /build
RUN curl -fL --retry 3 https://codeload.github.com/ggml-org/whisper.cpp/tar.gz/08981d1bacbe494ff1c943af6c577c669a2d9f4d -o whisper.tar.gz \
 && echo 'ae00ba4972c2a4082ae523ab8366eb198faceaf22e79d58fabff335871ce24b4  whisper.tar.gz' | sha256sum -c - \
 && mkdir whisper && tar -xzf whisper.tar.gz -C whisper --strip-components=1 \
 && make -C whisper -j2 AVX_M= F16C_M= FMA_M= AVX2_M= WHISPER_NO_AVX512=1 main \
 && mkdir -p /opt/whisper/models && cp whisper/main whisper/LICENSE /opt/whisper/
RUN curl -fL --retry 3 https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin -o /opt/whisper/models/ggml-base.en.bin \
 && echo 'a03779c86df3323075f5e796cb2ce5029f00ec8869eee3fdfb897afe36c6d002  /opt/whisper/models/ggml-base.en.bin' | sha256sum -c -
RUN curl -fL --retry 3 https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.14.0/Rhubarb-Lip-Sync-1.14.0-Linux.zip -o rhubarb.zip \
 && echo 'a9a9074862cff47b2d59b8bf399a678a3b0b74f9452ad6ad94cb292913dd8667  rhubarb.zip' | sha256sum -c - \
 && mkdir /opt/rhubarb && unzip -q rhubarb.zip -d /opt/rhubarb

FROM node:24.22.1-bookworm-slim@sha256:be8204d4bd327363357f532187b752ff62759c31bedf98e9e18fc08c9cbd605c AS worker
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates tini ffmpeg chromium fonts-liberation libgomp1 \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production FFMPEG_EXECUTABLE=/usr/bin/ffmpeg FFPROBE_EXECUTABLE=/usr/bin/ffprobe \
    WHISPER_CPP_PATH=/opt/whisper RHUBARB_PATH=/opt/rhubarb REMOTION_BROWSER_EXECUTABLE=/usr/bin/chromium \
    WORKER_RENDER_CONCURRENCY=2 WHISPER_THREADS=2
WORKDIR /app
# Explicit copies and a deny-by-default Docker context keep secrets/media out of every layer.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --workspaces=false --include=dev && npm cache clean --force
COPY --from=native /opt /opt
COPY --chown=node:node src ./src
COPY --chown=node:node shared ./shared
COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node scripts/worker-container-check.ts ./scripts/worker-container-check.ts
RUN mkdir -p .cache local-runs node_modules/.cache && chown node:node /app .cache local-runs node_modules/.cache
USER node
# Child processes receive SIGTERM through the existing lease guard; tini reaps orphans.
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "--import", "tsx", "src/worker/cli.ts", "--execute", "--config=/run/secrets/connection.json"]
