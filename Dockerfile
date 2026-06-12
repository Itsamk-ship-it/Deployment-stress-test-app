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
# Nexlayer builds ONE image and patches it into every pod with the
# "# filled by pipeline" placeholder (here: both `web` and `worker`). It also
# does NOT honor a `command:` field, so a single image must run BOTH roles,
# choosing via the POD_ROLE env var (set per-pod in nexlayer.yaml).
FROM mirror.gcr.io/library/node:22-alpine
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV POD_ROLE=web

# Next.js standalone bundle for the web server (provides /app/server.js).
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Full deps + worker source so the SAME image can also run the worker and
# `prisma migrate deploy`. tsx and the prisma CLI live in node_modules; copying
# the complete tree over the trimmed standalone one keeps server.js working too.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs

RUN mkdir -p /app/uploads

# One entrypoint, two roles. DATABASE_URL / REDIS_URL come straight from the
# nexlayer.yaml inter-pod refs (${postgres:5432} / ${redis:6379}) — no runtime
# host rewriting. The web role starts the HTTP server IMMEDIATELY (so the
# platform's routing/health check passes fast) and applies migrations in the
# background, retrying until Postgres is reachable.
RUN printf '%s\n' \
    '#!/bin/sh' \
    'set -e' \
    'if [ "$POD_ROLE" = "worker" ]; then' \
    '  exec node_modules/.bin/tsx src/worker/index.ts' \
    'fi' \
    '(' \
    '  i=0' \
    '  until node_modules/.bin/prisma migrate deploy; do' \
    '    i=$((i+1))' \
    '    [ "$i" -ge 40 ] && echo "[start] migrate deploy still failing after $i tries; giving up" && break' \
    '    echo "[start] waiting for database before migrate (try $i)..."' \
    '    sleep 3' \
    '  done' \
    ') &' \
    'exec node server.js' \
    > /nx-start.sh && chmod +x /nx-start.sh

EXPOSE 3000
ENTRYPOINT ["/bin/sh", "/nx-start.sh"]
