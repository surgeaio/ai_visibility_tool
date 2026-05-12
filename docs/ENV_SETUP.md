# Environment variables

Copy `.env.example` to `.env.local`. Never commit real secrets.

## Core

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | For real auth + DB | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For real auth + DB | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin scripts only | Bypasses RLS; server-only |

## Demo / bypass

| Variable | Description |
|----------|-------------|
| `DEMO_MODE` | When `true`, skips strict auth when combined with missing keys (see `lib/config.ts`) |
| `NEXT_PUBLIC_DEMO_MODE` | Same flag for client-visible demo branding flows |

When Supabase URL/key are missing, `isAuthBypassMode()` is true and the dashboard is reachable without login.

## AI providers (optional locally)

| Variable | Provider |
|----------|----------|
| `OPENAI_API_KEY` | OpenAI |
| `ANTHROPIC_API_KEY` | Anthropic |
| `GOOGLE_AI_API_KEY` | Gemini |
| `PERPLEXITY_API_KEY` | Perplexity |

If none are set, analyze endpoints return structured demo payloads where implemented.

## Redis / queues

| Variable | Description |
|----------|-------------|
| `REDIS_URL` | `redis://localhost:6379` for local BullMQ |
| `UPSTASH_REDIS_URL` / `UPSTASH_REDIS_TOKEN` | Upstash-compatible connection |

Without Redis, `POST /api/prompts/[id]/run` still returns `queued` with a local job id note; workers exit immediately.

## Cron

| Variable | Description |
|----------|-------------|
| `CRON_SECRET` | Bearer token or `x-cron-secret` header for `/api/cron/run-schedules` |
| `APP_URL` | Base URL for `npm run scheduler` HTTP ping |
| `VERCEL` | Set by Vercel; with `x-vercel-cron: 1` allows secured cron invocations |

## Budget

| Variable | Default | Description |
|---------|---------|-------------|
| `AI_DAILY_BUDGET_USD` | `50` | Soft cap for orchestrator spend tracking in `lib/ai/cost-optimizer.ts` |
