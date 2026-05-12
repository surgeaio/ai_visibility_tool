# Local development setup

## Prerequisites

- Node.js 20+
- Optional: Docker for Redis (`redis:alpine` on port 6379)
- Optional: [Supabase CLI](https://supabase.com/docs/guides/cli) for local Postgres

## Install

```bash
npm install
```

## Environment

Copy `.env.example` to `.env.local` and fill values.

**Zero-config demo (no Supabase keys):** set `DEMO_MODE=true` and `NEXT_PUBLIC_DEMO_MODE=true`. Auth middleware bypasses login and APIs serve seeded demo data when persistence is unavailable.

**Full stack:** set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `REDIS_URL` for BullMQ queues.

## Database

Apply SQL from `supabase/schema.sql` in the Supabase SQL editor, or use migrations under `supabase/migrations/` with the Supabase CLI (`supabase db reset` / `supabase migration up`).

Regenerate typed client when the CLI is available:

```bash
npx supabase gen types typescript --local > lib/supabase/database.types.ts
```

## Redis & workers

```bash
docker run -d -p 6379:6379 redis:alpine
npm run workers
```

## Dev commands

| Command | Purpose |
|--------|---------|
| `npm run dev` | Next.js only |
| `npm run dev:full` | Next + workers + scheduler (needs Redis for workers) |
| `npm run workers` | BullMQ worker process |
| `npm run scheduler` | Local hourly cron HTTP ping (needs `APP_URL` + `CRON_SECRET`) |
| `npm run verify` | typecheck + lint + build |
| `npm run db:seed` | Optional seed script (service role) |

## URLs

- App: http://localhost:3000  
- Dashboard: http://localhost:3000/dashboard  
- Health: http://localhost:3000/api/health  
