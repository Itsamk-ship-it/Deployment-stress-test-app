# ── Build stage ───────────────────────────────────────────────────────────────
FROM mirror.gcr.io/library/node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=8192"
RUN npm run build

# ── Runtime stage ───────────────────────────────────────────────────────────────
FROM mirror.gcr.io/library/node:22-alpine
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV POD_ROLE=web

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs

RUN mkdir -p /app/uploads

RUN printf '%s\n' \
    '#!/bin/sh' \
    'set -e' \
    '# Dedicated worker pod (only if one is ever provisioned with POD_ROLE=worker).' \
    'if [ "$POD_ROLE" = "worker" ]; then' \
    '  exec node_modules/.bin/tsx src/worker/index.ts' \
    'fi' \
    '# web role: apply migrations (background, retry until Postgres is up), then run' \
    '# the BullMQ worker embedded in this pod. The HTTP server starts immediately so' \
    '# routing/verify passes fast. The worker runs here so there is NO separate' \
    '# worker pod (a portless worker pod produces an invalid Kubernetes Service).' \
    '(' \
    '  i=0' \
    '  until node_modules/.bin/prisma migrate deploy; do' \
    '    i=$((i+1))' \
    '    [ "$i" -ge 40 ] && echo "[start] migrate deploy still failing after $i tries; giving up" && break' \
    '    echo "[start] waiting for database before migrate (try $i)..."' \
    '    sleep 3' \
    '  done' \
    '  echo "[start] migrations applied; starting embedded worker"' \
    '  exec node_modules/.bin/tsx src/worker/index.ts' \
    ') &' \
    'exec node server.js' \
    > /nx-start.sh && chmod +x /nx-start.sh

EXPOSE 3000
ENTRYPOINT ["/bin/sh", "/nx-start.sh"]