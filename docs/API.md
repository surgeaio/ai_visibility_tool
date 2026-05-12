# HTTP API (selected)

Base URL: same origin as the app, e.g. `http://localhost:3000/api`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Liveness + Redis configuration snapshot |
| GET | `/api/health/db` | Supabase connectivity probe |
| GET | `/api/health/redis` | Redis ping + latency |
| GET | `/api/health/queues` | BullMQ job counts per queue |
| GET/POST | `/api/cron/run-schedules` | Cron stub; secured by `CRON_SECRET` or Vercel cron header |
| GET | `/api/prompts` | List prompts (Zod query) |
| POST | `/api/prompts` | Create prompt (`createPromptApiSchema`) |
| GET/PATCH/DELETE | `/api/prompts/[id]` | Prompt CRUD |
| POST | `/api/prompts/[id]/run` | Enqueue BullMQ run (or local stub without Redis) |
| GET | `/api/citations` | Citations list |
| GET | `/api/competitors`, `/api/brands`, `/api/recommendations`, `/api/results`, `/api/analyze` | See route handlers |

All JSON error payloads should include `requestId` when produced through `lib/api/validate.ts`.
