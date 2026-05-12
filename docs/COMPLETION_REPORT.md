# AI Visibility Platform — completion status

**Last updated:** 2026-05-12

This report reflects the **actual** repository state after incremental implementation. Many roadmap sprints from the master prompt remain **partial** or **not started**; the app is still **runnable locally** in demo mode.

## Done (this increment)

- Sprint **A.3** gaps: `BaseRepository` adds `findManyByBrand`, `findManyByOrg`, and `count()` defaults.
- Sprint **A.4**: `lib/demo/seed-data.ts` barrel; Zustand `fetchApiPrompts` + overview metrics use API-backed prompts; prompts dashboard loads/saves/deletes via REST with loading + error banners; `/dashboard/citations` + sidebar link.
- Sprint **B.6 (partial)**: `lib/ai/prompts/*` prompt templates.
- Sprint **C.2–C.3**: additional BullMQ queues + split worker modules.
- Sprint **D.1 (partial)**: `lib/scheduler/index.ts`, `schedule-manager.ts`, `vercel-cron.ts` stubs.
- **J / Local**: `next.config.mjs` security headers; `Dockerfile.worker`; `.github/workflows/ci.yml`; `docs/DEPLOYMENT.md`, `ARCHITECTURE.md`, `API.md`, `CONTRIBUTING.md`; `PATCH /api/recommendations`; `npm` `db:*` scripts; Redis health helper with latency.
- **Earlier baseline (unchanged):** middleware + demo bypass, Zod APIs, repositories, schema/migrations snapshot, multi-provider AI + Redis cache, BullMQ prompt run + health + jobs page, `LOCAL_SETUP` / `ENV_SETUP`.

## Not complete (vs master prompt)

- Full Sprint D–J scope: Stripe, Sentry, rate limits, all 12 pattern detectors, GEO crawlers, analytics aggregation, E2E tests, Scalar API docs, production hardening checklist, etc.
- Zustand → live API wiring and loading/error UX across all dashboard pages (partial).
- Typed `database.types.ts` from `supabase gen types` (manual `lib/supabase/types.ts` remains).
- pgvector column parity, stored procedures, and billing tables as specified in the longest schema variant.

## Local commands

```bash
npm install
npm run dev
```

Verification:

```bash
npm run verify
```

## Production readiness

**Not** asserted as production-ready; treat as **development / demo** until security, billing, and data migrations are finished.
