# ReachInbox — Email Scheduler Assignment

A production-grade email scheduler service + dashboard: schedule emails via API,
send them reliably at scale with BullMQ + Redis (no cron), survive restarts,
enforce per-sender hourly rate limits with Slack alerts, and search sent/scheduled
emails via Elasticsearch.

## Status

This is under active development. Current progress:

- [x] Monorepo structure (`backend/`, `frontend/`)
- [x] Docker Compose: Redis, Postgres, Elasticsearch
- [x] Prisma schema (Email, Sender, User, SlackConnection, RateLimitEvent)
- [x] BullMQ delayed-job scheduling API (`POST /api/emails/schedule`)
- [x] Worker: sends via Ethereal, idempotent, retries with backoff
- [x] Redis-backed per-sender hourly rate limiting (atomic Lua INCR)
- [x] Reschedule-to-next-hour on rate limit hit (no dropped jobs)
- [x] Slack notification hook on rate-limit hit (silent no-op if not connected)
- [x] Elasticsearch indexing + search endpoint
- [x] Bull Board live queue dashboard (`/admin/queues`)
- [x] Frontend dashboard (Next.js + Tailwind) — compose modal, CSV lead upload, scheduled/sent tables with loading & empty states
- [ ] Google OAuth login (frontend + backend)
- [ ] Slack OAuth connect flow (backend has the notifier, needs the OAuth handshake)
- [ ] Demo video

## Architecture

```
backend/
  src/
    config/        env loader, redis connection
    db/            Prisma client singleton
    queues/        BullMQ queue definition (emailQueue.ts)
    workers/        BullMQ worker (emailWorker.ts) — the actual send pipeline
    services/       rateLimiter, mailer (Ethereal), slackNotifier, searchIndex (ES)
    routes/         Express routes (emailRoutes.ts)
    utils/          zod validation schemas
    server.ts       Express app entrypoint + Bull Board mount
  prisma/
    schema.prisma   DB models
    seed.ts         creates a demo Sender with a low hourly limit (for easy demoing)
```

### How scheduling works

1. `POST /api/emails/schedule` writes an `Email` row to Postgres (status
   `SCHEDULED`) and enqueues a **BullMQ delayed job** (`emailQueue.add` with a
   `delay` computed from `scheduledAt - now`). No cron anywhere.
2. `jobId` is set to the `Email.id`. BullMQ refuses to create a second job
   with an existing `jobId`, so the same email can never be double-enqueued
   even under a retried request.
3. When the delay elapses, BullMQ hands the job to the worker
   (`emailWorker.ts`), which re-reads the `Email` row from Postgres (source
   of truth, not the job payload) before doing anything.

### How persistence on restart is handled

- BullMQ persists all job state (delayed, waiting, active) in **Redis**,
  and Redis itself persists to disk via `appendonly yes` + a named Docker
  volume. If the backend or worker process restarts, Redis still has every
  delayed job with its original fire time — nothing is lost or restarted
  from scratch.
- Before sending, the worker checks `Email.status` in Postgres. If a job
  is somehow re-delivered (e.g. the process crashed after sending but
  before BullMQ marked it complete), the worker sees `status: SENT` and
  skips — **idempotent by construction**, not by luck.

### How rate limiting & concurrency are implemented

- **Concurrency**: `Worker` is created with a `concurrency` option
  (`WORKER_CONCURRENCY` env var), so N jobs run in parallel safely.
- **Min delay between sends**: configurable per-`Sender`
  (`minDelayBetweenSendMs`, default from `MIN_DELAY_BETWEEN_SENDS_MS`).
  Enforced inside the worker before calling the SMTP transport.
- **Hourly limit**: a single Lua script (`INCR` + conditional `EXPIRE`)
  against a Redis key `ratelimit:<senderId>:<hourKey>` makes the
  check-and-increment atomic across any number of worker processes/instances
  — no in-memory counters. `hourKey` is a UTC-hour string, so the counter
  naturally resets every hour without a cleanup job.
- **On limit hit**: the job is **not** dropped or failed. It's moved to a
  delayed state targeting the start of the next hour
  (`job.moveToDelayed`), preserving the same `jobId` (still idempotent),
  and a Slack message is fired if the owning user has connected Slack.
- **Under load (1000+ same-time jobs)**: each job is rate-limited
  independently at process time (not at enqueue time), so a burst of 1000
  scheduled-for-now emails simply spills the excess into the next hour
  window(s) in the order the worker picks them up — no thundering-herd
  failure, no duplicate sends.

## Running locally

```bash
# 1. Start infra
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env    # fill in Ethereal / Google / Slack creds
npm install
npm run prisma:migrate
npm run prisma:seed      # creates a demo sender with a low hourly limit
npm run dev              # starts the API server (port 4000)

# 3. Worker (separate terminal)
cd backend
npm run worker

# 4. Frontend
cd frontend
npm install
npm run dev              # opens on port 3000, proxies /backend/* to :4000
```

Frontend structure:
```
frontend/
  app/            Next.js App Router — layout.tsx, page.tsx (the dashboard), globals.css
  components/     Header, Button, StatusBadge, EmailTable, ComposeModal, EmptyState
  lib/api.ts      fetch wrappers for the backend (via the /backend/* rewrite, no CORS needed)
  types/          shared TS types
```

Bull Board (live queue dashboard): http://localhost:4000/admin/queues

### Ethereal Email setup

Generate a free throwaway inbox at https://ethereal.email/create and put the
credentials in `backend/.env` as `ETHEREAL_SMTP_USER` / `ETHEREAL_SMTP_PASS`.
Every sent email's console log includes a preview URL you can open to see it.

## Assumptions / trade-offs

- One shared Ethereal inbox is used for all "senders" in this assignment;
  the `Sender` model is what carries the per-sender rate-limit config, and
  the `from` address is varied per send even though the SMTP creds are shared.
- `RateLimitEvent` is an audit/fallback log — Redis is the actual real-time
  source of truth for the counters themselves.
