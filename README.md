# Surgeaio AI Visibility Tool

Next.js 14 (App Router) dashboard for **generative engine visibility**: prompts, competitors, sentiment, sources, recommendations, and optional BullMQ job execution.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). With no Supabase keys, **demo / auth bypass** mode serves seeded UI data (see `lib/config.ts`).

## Demo login

For quick testing without signup (requires `npm run seed:test-user` once with service role key in `.env.local`):

- **URL:** https://ai-visibility-tool-nu.vercel.app/login
- **Email:** `demo@aivisibility.test`
- **Password:** `DemoUser2026!Visibility`

Reset or recreate anytime: `npm run seed:test-user`

Google sign-in: see [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md).

**Intelligence phase:** set `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` (and optional `GOOGLE_AI_API_KEY`, `PERPLEXITY_API_KEY`) in Vercel and Railway — these are **shared admin keys** for all users (no per-user API key setup). Use `STRICT_LLM_EXECUTION=true` in production to forbid synthetic LLM placeholder text when a key is missing. Run **`npm run dev:full`** for Next.js + BullMQ workers + scheduler (optional `REDIS_URL`; without Redis, prompt runs execute synchronously in the API).

## Running prompts

- **Inline:** `/dashboard/llm-visibility` → **Run prompts now** (batch modal; uses selected brand).
- **Full management:** `/dashboard/prompts` → add prompts and **Run** per row.
- **Health:** `GET /api/health` — confirm `checks.can_run_prompts` and `checks.execution_mode` (`async` or `sync`).
- See [PRODUCTION_ENV_SETUP.md](PRODUCTION_ENV_SETUP.md) for the full env table.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run dev:full` | Next + workers + scheduler (`concurrently`) |
| `npm run workers` | BullMQ worker (`REDIS_URL` required for real processing) |
| `npm run scheduler` | Hourly HTTP ping to `/api/cron/run-schedules` when `APP_URL` + `CRON_SECRET` are set |
| `npm run verify` | `typecheck` + `lint` + `build` |
| `npm run db:migrate` | Apply SQL migrations to **local** Postgres (`npx supabase start` / Docker required) |
| `npm run db:types` | Regenerate `lib/supabase/database.types.ts` from local DB (writes only on success; requires `supabase start`) |
| `npm run db:seed` | Optional seed helper (needs service role key) |
| `npm run seed:test-user` | Create/update demo login user in Supabase |

## Docs

- [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md) — local stack
- [docs/ENV_SETUP.md](docs/ENV_SETUP.md) — environment variables
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Vercel, workers Docker, Supabase
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system overview
- [docs/API.md](docs/API.md) — selected HTTP routes
- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) — contribution guidelines
- [docs/PHASE1_AUDIT.md](docs/PHASE1_AUDIT.md) — architecture audit + sprint checklist
- [docs/COMPLETION_REPORT.md](docs/COMPLETION_REPORT.md) — honest delivery status

Copy `.env.example` to `.env.local` and adjust.
