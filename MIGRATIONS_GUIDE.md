# Database migrations runbook

Migrations live in `supabase/migrations/`. **Do not run against production without a backup.**

## Check status

```bash
# Requires service role key in env (e.g. .env.local)
npm run check:migrations
```

This probes core tables and lists `supabase_migrations.schema_migrations` when available.

## Option A — Supabase CLI (recommended)

1. Install CLI: https://supabase.com/docs/guides/cli
2. Link project:
   ```bash
   npx supabase login
   npx supabase link --project-ref jfunkoftnvbxkmlelkad
   ```
3. Push migrations:
   ```bash
   npx supabase db push
   ```

## Option B — SQL Editor (manual)

1. Open Supabase Dashboard → SQL Editor
2. Run each file in `supabase/migrations/` **in filename order** (oldest first)
3. Or run consolidated `supabase/schema.sql` for a fresh project (destructive if tables exist)

## If `supabase_migrations.schema_migrations` does not exist

The CLI creates this schema when you use `db push`. If you applied SQL manually, the app still works but `check:migrations` cannot list applied versions. Either:

- Run `npx supabase db push` once (CLI reconciles), or
- Ignore migration table and rely on table probes from `npm run check:migrations`

## After schema changes

```bash
npm run db:types
```

Requires local Supabase (`supabase start`) or point CLI at linked remote.

## Local only

```bash
npm run db:migrate   # supabase migration up (local Docker)
npm run db:reset     # reset local DB
```
