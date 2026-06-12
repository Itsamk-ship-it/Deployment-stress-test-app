# Nexlayer — Deployment-stress-test-app

<!-- nexlayer:meta version=1 analyzed=2026-06-12T19:44:04Z repo=https://github.com/Itsamk-ship-it/Deployment-stress-test-app branch=main -->

> **For AI agents (Claude Code, Cursor, Gemini CLI, Copilot):**
> This file is the **project context** for this Nexlayer deployment — tech stack, env vars, secrets, live URL.
> For full platform detail (nexlayer.yaml schema, Dockerfile rules, CI/CD, task recipes) read **`nexlayer.skills`** in this repo.
>
> **Critical rules (full detail in `nexlayer.skills`):**
> - Inter-pod refs: `${podName:port}` only — never `localhost` or bare hostnames
> - Docker Hub images: prefix with `mirror.gcr.io/library/` — bare tags fail on the cluster
> - Secrets: set in the Nexlayer dashboard — never commit to `nexlayer.yaml` or Dockerfile
>
> **This file:** `agent-managed` sections update automatically. `user-editable` sections (Local Development Setup, Nexlayer Deployment Plan, Build Notes) are yours — preserved across re-analysis.

## Project Summary
<!-- nexlayer:section agent-managed=project_summary -->
A full-stack stress test application designed to exercise core platform capabilities including background jobs, file uploads, webhooks, and health checks. It utilizes a Next.js frontend/API, a BullMQ worker, PostgreSQL for persistence, and Redis for caching and queueing.
<!-- nexlayer:end -->

## Technology Stack
<!-- nexlayer:section agent-managed=tech_stack -->
| Name | Kind | Version | Detected From |
|------|------|---------|---------------|
| Next.js | framework | 14.2.18 | package.json |
| TypeScript | language | 5.7.2 | package.json |
| PostgreSQL | database | 16 | docker-compose.yml |
| Redis | database | 7 | docker-compose.yml |
| Prisma | tool | 5.22.0 | package.json |
| BullMQ | infra | 5.34.0 | package.json |
| Node.js | language | 22-alpine | Dockerfile |
<!-- nexlayer:end -->

## Repository Structure
<!-- nexlayer:section agent-managed=structure_map -->
- src/ — Application source code (Next.js and Worker)
- prisma/ — Database schema and migrations
- src/worker/ — Background job processing logic
- public/ — Static assets
- uploads/ — Local file storage for uploaded content
<!-- nexlayer:end -->

## External Services Required
<!-- nexlayer:section agent-managed=external_deps -->
Services that must be configured separately (not deployed by Nexlayer):

- SMTP Server (Optional via SMTP_HOST)
<!-- nexlayer:end -->

## Local Development Setup
<!-- nexlayer:section user-editable=local_setup -->
### Prerequisites

- Node.js >= 20
- npm
- PostgreSQL
- Redis

### Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5544/stresstest?schema=public
REDIS_URL=redis://localhost:6380
AUTH_SECRET=at-least-32-chars-long-string
WEBHOOK_SECRET=any-secret-string
APP_URL=http://localhost:3000
```

### Steps

1. `npm install` — Install project dependencies
2. `npm run prisma:generate` — Generate Prisma Client
3. `npm run prisma:migrate` — Run database migrations
4. `npm run dev` — Start Next.js dev server on http://localhost:3000
5. `npm run worker:dev` — Start BullMQ worker in watch mode

<!-- nexlayer:end -->

## Nexlayer Setup
<!-- nexlayer:section agent-managed=nexlayer_setup -->
### Pod Environment Variables

| Pod | Variable | Value | Kind |
|-----|----------|-------|------|
| `web` | `NODE_ENV` | `production` | plain |
| `web` | `PORT` | `"3000"` | plain |
| `web` | `HOSTNAME` | `"0.0.0.0"` | plain |
| `web` | `POD_ROLE` | `web` | plain |
| `web` | `APP_URL` | `"<% URL %>"` | plain |
| `web` | `AUTH_SECRET` | _(set via Nexlayer dashboard)_ | secret |
| `web` | `DATABASE_URL` | `"postgresql://postgres:postgres@${postgres:5432}/stresstest?schema=public"` | inter-pod |
| `web` | `REDIS_URL` | `"redis://${redis:6379}"` | inter-pod |
| `web` | `WEBHOOK_SECRET` | _(set via Nexlayer dashboard)_ | secret |
| `web` | `EMAIL_FROM` | `"Stress Test <no-reply@stresstest.local>"` | plain |
| `web` | `UPLOAD_DIR` | `"/app/uploads"` | plain |
| `worker` | `NODE_ENV` | `production` | plain |
| `worker` | `POD_ROLE` | `worker` | plain |
| `worker` | `APP_URL` | `"<% URL %>"` | plain |
| `worker` | `DATABASE_URL` | `"postgresql://postgres:postgres@${postgres:5432}/stresstest?schema=public"` | inter-pod |
| `worker` | `REDIS_URL` | `"redis://${redis:6379}"` | inter-pod |
| `worker` | `WEBHOOK_SECRET` | _(set via Nexlayer dashboard)_ | secret |
| `worker` | `EMAIL_FROM` | `"Stress Test <no-reply@stresstest.local>"` | plain |
| `worker` | `UPLOAD_DIR` | `"/app/uploads"` | plain |
| `postgres` | `POSTGRES_USER` | `postgres` | plain |
| `postgres` | `POSTGRES_PASSWORD` | _(set via Nexlayer dashboard)_ | secret |
| `postgres` | `POSTGRES_DB` | `stresstest` | plain |

### Secrets Required

Set these in the Nexlayer dashboard before deploying:

- `AUTH_SECRET` (`web` pod)
- `WEBHOOK_SECRET` (`web` pod)
- `WEBHOOK_SECRET` (`worker` pod)
- `POSTGRES_PASSWORD` (`postgres` pod)

### nexlayer.yaml

```yaml
application:
  name: vast-flare-deployment-stress-test-app
  pods:
    - name: web
      image: "# filled by pipeline"
      path: /
      servicePorts:
        - 3000
      vars:
        NODE_ENV: production
        PORT: "3000"
        HOSTNAME: "0.0.0.0"
        POD_ROLE: web
        APP_URL: "<% URL %>"
        AUTH_SECRET: "change-me-to-a-long-random-string-at-least-32-chars"
        DATABASE_URL: "postgresql://postgres:postgres@${postgres:5432}/stresstest?schema=public"
        REDIS_URL: "redis://${redis:6379}"
        WEBHOOK_SECRET: "change-me-webhook-secret"
        EMAIL_FROM: "Stress Test <no-reply@stresstest.local>"
        UPLOAD_DIR: "/app/uploads"
    - name: worker
      image: "# filled by pipeline"
      path: /
      vars:
        NODE_ENV: production
        POD_ROLE: worker
        APP_URL: "<% URL %>"
        DATABASE_URL: "postgresql://postgres:postgres@${postgres:5432}/stresstest?schema=public"
        REDIS_URL: "redis://${redis:6379}"
        WEBHOOK_SECRET: "change-me-webhook-secret"
        EMAIL_FROM: "Stress Test <no-reply@stresstest.local>"
        UPLOAD_DIR: "/app/uploads"
    - name: postgres
      image: mirror.gcr.io/library/postgres:16-alpine
      servicePorts:
        - 5432
      vars:
        POSTGRES_USER: postgres
        POSTGRES_PASSWORD: postgres
        POSTGRES_DB: stresstest
    - name: redis
      image: mirror.gcr.io/library/redis:7-alpine
      servicePorts:
        - 6379
      vars: {}
```

<!-- nexlayer:end -->

## Nexlayer Deployment Plan
<!-- nexlayer:section user-editable=deployment_plan -->
### Pod Topology

| Pod | Image | Port | Role |
|-----|-------|------|------|
| web | mirror.gcr.io/library/node:22-alpine | 3000 | web |
| worker | mirror.gcr.io/library/node:22-alpine | 3000 | worker |
| postgres | mirror.gcr.io/library/postgres:16-alpine | 5432 | database |
| redis | mirror.gcr.io/library/redis:7-alpine | 6379 | cache |

### Deployment notes

- Single Docker image used for both 'web' and 'worker' pods, differentiated by the POD_ROLE environment variable.
- Inter-pod communication for DB is via ${postgres:5432} and Redis via ${redis:6379}.
- Postgres and Redis must be healthy before the web and worker pods start to avoid Prisma connection failures.

<!-- nexlayer:end -->

## Build Notes
<!-- nexlayer:section user-editable=build_notes -->
<!-- Add notes for future builds here — preserved across re-analysis -->
<!-- nexlayer:end -->

## Nexlayer Configuration
<!-- nexlayer:section agent-managed=nexlayer_config -->
**Last deployed:** 2026-06-12T19:51:24Z  
**Live URL:** https://vast-flare-deployment-stress-test-app.nexlayer.ai  
**Runtime:** node · **Port:** 3000  
**Deploy branch:** main  

```yaml
application:
  name: vast-flare-deployment-stress-test-app
  pods:
    - name: web
      image: "# filled by pipeline"
      path: /
      servicePorts:
        - 3000
      vars:
        NODE_ENV: production
        PORT: "3000"
        HOSTNAME: "0.0.0.0"
        POD_ROLE: web
        APP_URL: "<% URL %>"
        AUTH_SECRET: "change-me-to-a-long-random-string-at-least-32-chars"
        DATABASE_URL: "postgresql://postgres:postgres@${postgres:5432}/stresstest?schema=public"
        REDIS_URL: "redis://${redis:6379}"
        WEBHOOK_SECRET: "change-me-webhook-secret"
        EMAIL_FROM: "Stress Test <no-reply@stresstest.local>"
        UPLOAD_DIR: "/app/uploads"
    - name: worker
      image: "# filled by pipeline"
      path: /
      vars:
        NODE_ENV: production
        POD_ROLE: worker
        APP_URL: "<% URL %>"
        DATABASE_URL: "postgresql://postgres:postgres@${postgres:5432}/stresstest?schema=public"
        REDIS_URL: "redis://${redis:6379}"
        WEBHOOK_SECRET: "change-me-webhook-secret"
        EMAIL_FROM: "Stress Test <no-reply@stresstest.local>"
        UPLOAD_DIR: "/app/uploads"
    - name: postgres
      image: mirror.gcr.io/library/postgres:16-alpine
      servicePorts:
        - 5432
      vars:
        POSTGRES_USER: postgres
        POSTGRES_PASSWORD: postgres
        POSTGRES_DB: stresstest
    - name: redis
      image: mirror.gcr.io/library/redis:7-alpine
      servicePorts:
        - 6379
      vars: {}
```
<!-- nexlayer:end -->

## Build History
<!-- nexlayer:section agent-managed=build_history -->
| Date | Status | Notes |
|------|--------|-------|
| 2026-06-12T19:44:04Z | analyzed | initial repo analysis |
| 2026-06-12T19:51:24Z | success | deployed https://vast-flare-deployment-stress-test-app.nexlayer.ai |
<!-- nexlayer:end -->
