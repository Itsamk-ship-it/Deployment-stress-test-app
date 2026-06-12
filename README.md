# 🚀 Deployment Stress Test App

A full-stack app built specifically to exercise every feature a deployment platform
needs to support. If a platform can run this cleanly, it can run almost anything.

## What it exercises

| Feature | How it's implemented |
| --- | --- |
| **Authentication** | Cookie-based sessions (JWT via `jose`) + bcrypt password hashing |
| **PostgreSQL** | Prisma ORM (`User`, `Upload`, `WebhookEndpoint`, `WebhookDelivery`, `JobRecord`, `LogEntry`, `EmailMessage`) |
| **Redis cache** | `ioredis` get/set/del with TTL — `/api/cache` |
| **Background jobs** | BullMQ queue + a standalone worker process |
| **File uploads** | Multipart upload to disk + DB metadata + post-process job |
| **Webhooks** | Inbound HMAC verification + outbound signed delivery via worker |
| **Email** | `nodemailer` (SMTP, or a logging transport when SMTP is unset), sent from a job |
| **Health checks** | `/api/health` (liveness) and `/api/health/ready` (Postgres + Redis readiness) |
| **Logs dashboard** | Structured logs persisted to Postgres + streamed to stdout, viewable in the UI |
| **Stress endpoint** | `/api/stress` for on-demand CPU/memory/latency load |

## Stack

- **Frontend + API:** Next.js 14 (App Router, TypeScript) — `output: standalone`
- **Worker:** Node process running BullMQ (`src/worker/index.ts`)
- **Data:** PostgreSQL (Prisma) + Redis (cache & queue)

## Architecture

```
┌──────────────┐     enqueue      ┌─────────┐     drains      ┌──────────────┐
│  Next.js web │ ───────────────► │  Redis  │ ◄────────────── │    Worker    │
│ (API + UI)   │     cache R/W    │ (BullMQ)│                 │ (BullMQ jobs)│
└──────┬───────┘                  └─────────┘                 └──────┬───────┘
       │                                                              │
       └──────────────────────► PostgreSQL ◄─────────────────────────┘
```

The **web** service handles HTTP, auth, and enqueues jobs. The **worker** service drains
the queue and performs the slow/async work (sending email, delivering webhooks, processing
uploads). Both share Postgres and Redis — the same split most platforms expect between a
"web" and a "worker" service.

## Quick start (Docker — everything)

```bash
cp .env.example .env
docker compose up --build
# in another shell, run migrations + seed once the DB is healthy:
docker compose exec web npx prisma migrate deploy
docker compose exec web npx prisma db seed   # optional demo user
```

Open http://localhost:3000 and sign in with **demo@stresstest.local / password123**
(after seeding), or register a new account.

## Quick start (local dev)

You need Postgres and Redis running. The easiest way is to start just those two:

```bash
docker compose up postgres redis -d
cp .env.example .env

npm install
npx prisma migrate dev --name init   # creates tables
npm run db:seed                       # optional demo user

# terminal 1 — web
npm run dev
# terminal 2 — background worker
npm run worker:dev
```

## Environment variables

See [.env.example](.env.example). The important ones:

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string (used for both cache and the job queue)
- `AUTH_SECRET` — secret for signing session JWTs (use 32+ random chars)
- `WEBHOOK_SECRET` — HMAC secret for inbound webhook verification
- `SMTP_*` — optional; if `SMTP_HOST` is empty, emails are serialized/logged instead of sent

## API reference

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create account + start session |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/logout` | Log out |
| GET | `/api/auth/me` | Current user |
| GET | `/api/health` | Liveness probe |
| GET | `/api/health/ready` | Readiness probe (checks Postgres + Redis) |
| GET/POST/DELETE | `/api/cache` | Redis cache ops |
| GET/POST | `/api/jobs` | List / enqueue background jobs |
| GET/POST | `/api/email` | List / queue emails |
| GET/POST | `/api/uploads` | List / upload files |
| GET/DELETE | `/api/uploads/[id]` | Download / delete a file |
| GET/POST | `/api/webhooks` | List / register outbound endpoints |
| POST | `/api/webhooks/trigger` | Fire an event to matching endpoints |
| POST | `/api/webhooks/incoming` | Receive a signed inbound webhook |
| GET/POST | `/api/logs` | View / emit logs |
| GET | `/api/stress` | `?mode=cpu\|latency\|memory` load generator |

### Sending a signed inbound webhook (example)

```bash
BODY='{"hello":"world"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "change-me-webhook-secret" | awk '{print $2}')
curl -X POST http://localhost:3000/api/webhooks/incoming \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: $SIG" \
  -d "$BODY"
```

## Deploying

- **Build:** `npm run build` (runs `prisma generate` + `next build`, emits standalone output)
- **Migrate on release:** `npx prisma migrate deploy`
- **Web process:** `node server.js` (from `.next/standalone`) or `npm start`
- **Worker process:** `npm run worker` — run this as a separate service/dyno
- **Health check path:** point the platform's health check at `/api/health/ready`

The included multi-stage `Dockerfile` builds both a `runner` (web) and `worker` target.
