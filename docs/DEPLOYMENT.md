# Deployment

## Web (Vercel)

1. Connect the Git repository and select the Next.js root.
2. Set environment variables from `docs/ENV_SETUP.md` (Supabase, optional AI keys, `CRON_SECRET`, Redis if using serverless Redis).
3. `vercel.json` registers an hourly cron hitting `/api/cron/run-schedules`. On Vercel, the `x-vercel-cron` header satisfies the route guard.

## Workers (Docker)

Build and run the BullMQ worker image:

```bash
docker build -f Dockerfile.worker -t ai-visibility-workers .
docker run --env-file .env.local ai-visibility-workers
```

Workers require `REDIS_URL` (or Upstash variables). Without Redis the process exits cleanly.

## Database (Supabase)

Apply SQL from `supabase/schema.sql` or run CLI migrations (`npm run db:migrate` when the Supabase CLI is installed). Regenerate types with `npm run db:types` after schema changes.
