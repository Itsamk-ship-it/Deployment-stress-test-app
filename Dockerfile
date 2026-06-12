FROM mirror.gcr.io/library/node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN sed -i "s/output.*'export'/output: 'standalone'/g" next.config.* 2>/dev/null || true
RUN sed -i "s/output.*\"export\"/output: 'standalone'/g" next.config.* 2>/dev/null || true
ENV NODE_OPTIONS="--max-old-space-size=8192"
RUN npx prisma generate && npm run build

FROM mirror.gcr.io/library/node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
RUN mkdir -p /app/uploads
EXPOSE 3000

USER root
RUN printf '%s\n' \
    '#!/bin/sh' \
    'if [ -n "$ROOT_URL" ]; then' \
    '  _h=$(echo "$ROOT_URL" | sed "s|https://||" | sed "s|\.cloud\.nexlayer\.ai||")' \
    '  _d=$(echo "$_h" | cut -d- -f3-)' \
    '  export DATABASE_URL="postgresql://postgres:postgres@${_d}-postgres-service:5432/stresstest?schema=public"' \
    '  export REDIS_URL="redis://${_d}-redis-service:6379"' \
    'fi' \
    'exec "$@"' > /nx-start.sh && chmod +x /nx-start.sh
ENTRYPOINT ["/bin/sh", "/nx-start.sh"]
CMD ["node", "server.js"]