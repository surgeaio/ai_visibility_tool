# Architecture

## Runtime

- **Next.js 14 (App Router)** serves marketing pages, the authenticated dashboard shell, and API routes under `app/api/*`.
- **Middleware** (`middleware.ts`) attaches request IDs, refreshes Supabase sessions, and protects `/dashboard` and `/api` unless `isAuthBypassMode()` applies (missing Supabase env or explicit demo flags in `lib/config.ts`).

## Data

- **Repositories** (`lib/repositories/*`) encapsulate Supabase access and **demo fallbacks** when auth bypass is active.
- **Supabase** (`lib/supabase/server.ts`, `client.ts`, `admin.ts`) — server client is cached per request (`react` `cache()`). Admin client is for scripts and privileged jobs only.

## AI & jobs

- **Providers + orchestrator** live under `lib/ai/*`. Responses can be cached in memory or **Redis** (`lib/ai/cache.ts`).
- **BullMQ** queues are defined in `lib/queues/*`; **workers** run via `workers/index.ts` (`npm run workers`). Queue names are centralized in `lib/queues/queue-names.ts`.

## Scheduler

- **Vercel Cron** hits `/api/cron/run-schedules`. Local optional HTTP ping: `lib/scheduler/cron-runner.ts` (`npm run scheduler`) when `APP_URL` and `CRON_SECRET` are set.

## UI state

- **Zustand** (`store/dashboard.ts`) holds global filters and **API-backed prompt lists** for the overview + prompts flows.
