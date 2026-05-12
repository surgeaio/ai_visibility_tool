# AI Visibility Platform

Next.js 14 (App Router) dashboard for **generative engine visibility**: prompts, competitors, sentiment, sources, recommendations, and optional BullMQ job execution.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). With no Supabase keys, **demo / auth bypass** mode serves seeded UI data (see `lib/config.ts`).

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run dev:full` | Next + workers + scheduler (`concurrently`) |
| `npm run workers` | BullMQ worker (`REDIS_URL` required for real processing) |
| `npm run scheduler` | Hourly HTTP ping to `/api/cron/run-schedules` when `APP_URL` + `CRON_SECRET` are set |
| `npm run verify` | `typecheck` + `lint` + `build` |
| `npm run db:seed` | Optional seed helper (needs service role key) |

## Docs

- [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md) — local stack
- [docs/ENV_SETUP.md](docs/ENV_SETUP.md) — environment variables
- [docs/PHASE1_AUDIT.md](docs/PHASE1_AUDIT.md) — architecture audit + sprint checklist
- [docs/COMPLETION_REPORT.md](docs/COMPLETION_REPORT.md) — honest delivery status

Copy `.env.example` to `.env.local` and adjust.
