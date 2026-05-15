# Deployment

## Web (Vercel)

1. Connect the Git repository and select the Next.js root.
2. Set environment variables from `docs/ENV_SETUP.md` (Supabase, optional AI keys, `CRON_SECRET`, Redis if using serverless Redis).
3. Do **not** add frequent crons in `vercel.json` (Hobby allows at most once per day). Scheduled jobs run on Railway workers via BullMQ.

## Workers (Docker / Railway)

Build and run the BullMQ worker image:

```bash
docker build -f Dockerfile.worker -t ai-visibility-workers .
docker run --env-file .env.local ai-visibility-workers
```

Workers require `REDIS_URL` (or Upstash variables) and `SUPABASE_SERVICE_ROLE_KEY`. Without Redis the process exits cleanly.

On startup, workers register BullMQ schedulers:

- **Hourly** — enqueue due `prompt_schedules` (`prompt-schedules-hourly`)
- **Daily 06:00 UTC** — Google Search Console sync (`gsc-sync-daily`)

Cron API routes (`/api/cron/run-schedules`, `/api/cron/sync-gsc`) remain available for manual triggers with `Authorization: Bearer $CRON_SECRET`.

## Database (Supabase)

Apply SQL from `supabase/schema.sql` or run CLI migrations (`npm run db:migrate` when the Supabase CLI is installed). Regenerate types with `npm run db:types` after schema changes.
