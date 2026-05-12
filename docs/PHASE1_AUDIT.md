# Phase 1 — Project Audit (AI Visibility Platform)

_Generated as baseline for enterprise roadmap. Code state reflects repository snapshot at audit time._

---

## 1. Architecture overview

| Layer | Current state |
|-------|----------------|
| **Frontend** | Next.js 14 App Router, React 18, Tailwind, Radix/shadcn-style UI, Framer Motion, Recharts, Zustand (`store/dashboard.ts`) |
| **Marketing** | Route group `(marketing)/`: `/`, `/pricing` |
| **Dashboard** | `(dashboard)/dashboard/*`: overview, prompts, **jobs**, competitors, sentiment, sources, recommendations, settings |
| **API** | REST-style handlers under `app/api/*` with Zod validation and `requestId` on errors |
| **Auth** | `middleware.ts` + `lib/supabase/middleware.ts`; `isAuthBypassMode()` when Supabase env missing or demo flags |
| **AI** | `lib/ai/*`: multi-provider adapters, orchestrator, citation extractor, optional Redis-backed response cache |
| **Persistence** | `lib/repositories/*` → Supabase in live mode, seeded **demo** paths when auth bypass / demo mode |
| **Queues** | BullMQ `prompt-execution` queue when `REDIS_URL` set; `workers/index.ts`; `/api/prompts/[id]/run` enqueues |
| **Cron** | `/api/cron/run-schedules` (stub scan) + optional `lib/scheduler/cron-runner.ts` HTTP ping |

**Diagram (logical)**

```
Browser → Next.js (RSC + client) → API routes → Repositories → [Demo seed | Supabase]
                              ↘ BullMQ (Redis) ← workers
                              ↘ AI providers (optional keys)
```

---

## 2. Gap analysis vs enterprise target

| Area | Gap |
|------|-----|
| **Data layer** | Repositories exist; generated `database.types.ts` not fully wired; some entities still thin |
| **Dashboard data** | Overview + prompts use Zustand-backed `GET /api/prompts`; other pages still lean on seed exports where noted below |
| **Patterns / GEO** | Roadmap patterns, crawlers, FAQ/entity analyzers largely not implemented |
| **Analytics** | Aggregation tables / cron refresh not built |
| **Billing / orgs** | Stripe + invites not implemented |
| **Observability** | No Sentry/pino wiring in repo yet |

---

## 3. Demo / persistence inventory

| Location | Behavior |
|----------|----------|
| `lib/demo-data.ts` + `lib/demo/seed-data.ts` | Canonical demo constants; seed barrel re-exports for Sprint A.4 import path |
| `lib/repositories/*.repo.ts` | `isAuthBypassMode()` → in-memory / demo collections; else Supabase |
| `lib/config.ts` | `isDemoMode()` / `isAuthBypassMode()` gate demo vs live |

---

## 4. API inventory (selected)

| Route | Purpose |
|-------|---------|
| `POST /api/analyze` | Multi-provider orchestration + demo fallback |
| `GET/POST /api/prompts` | List/create via `PromptsRepository` |
| `GET/PATCH/DELETE /api/prompts/[id]` | CRUD |
| `POST /api/prompts/[id]/run` | Enqueue BullMQ job (or local stub id) |
| `GET/POST /api/competitors` | Repository-backed |
| `GET/POST /api/recommendations` | Repository-backed |
| `GET /api/citations` | Citations list |
| `GET /api/health`, `/api/health/db`, `/api/health/redis`, `/api/health/queues` | Probes |
| `GET/POST /api/cron/run-schedules` | Cron stub (secret or Vercel cron header) |

---

## 5. Dependency report

**Production (`package.json`)**

| Category | Packages |
|----------|----------|
| Framework | `next`, `react`, `react-dom` |
| UI | `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate`, `geist`, `lucide-react`, `framer-motion`, `recharts` |
| Data / auth | `@supabase/supabase-js`, `@supabase/ssr` |
| AI | `openai`, `@anthropic-ai/sdk`, `@google/generative-ai` |
| Queues / cache | `bullmq`, `ioredis` |
| Validation | `zod` |
| State | `zustand` |

**Still not present for full roadmap**

- `stripe`, Sentry, production rate-limit adapter, Playwright E2E, Scalar API docs UI

---

## 6. Security report

| Topic | Notes | Severity |
|-------|-------|----------|
| **API auth** | `/api/*` requires Supabase session except public paths (`/api/auth`, `/api/webhooks`, `/api/health`, `/api/cron`). Demo bypass disables enforcement when env incomplete — **local demos only**. | Medium (prod misconfig) |
| **Rate limiting** | Not distributed; roadmap Redis / Edge limits | Medium |
| **RLS** | Defined in `supabase/schema.sql` — verify applied in hosted project | High if skipped |
| **Input validation** | Zod on major routes — extend to all new handlers | Low–Medium |

---

## 7. Performance report

| Topic | Observation |
|-------|-------------|
| **Charts** | Recharts in client components; SSR/static generation can log dimension warnings — use explicit heights / dynamic import if needed |
| **Bundle** | Dashboard routes pull Recharts + Framer Motion; consider lazy charts per route |
| **DB** | Repositories hit Supabase when configured; add query monitoring as data grows |
| **Caching** | AI response cache (memory + Redis); analytics CDN TBD |

---

## 8. Prioritized TODO roadmap

### P0 — Foundation (before scale)

#### Sprint A progress checklist

- [x] **A.1 Middleware & Authentication** — Added `middleware.ts` with request IDs, Supabase session refresh helper (`lib/supabase/middleware.ts`), protected `/dashboard/*` and `/api/*`, `401` JSON for unauthenticated API access, and redirect to `/login` for dashboard pages.
- [x] **A.2 Zod Validation Layer** — Added `lib/validators/*`, `lib/api/validate.ts`, `lib/api/errors.ts`, and wired validation into current API routes with request-scoped `requestId` error responses.
- [x] **A.3 Supabase Repository Pattern** — Added `lib/repositories/*` with base abstractions, typed CRUD contracts, pagination/query options, and repository-backed API integration for prompts, competitors, and recommendations.
- [x] **A.4 Replace In-Memory Stores** — API routes now use repositories (`prompts`, `competitors`, `recommendations`, `brands`, `results`), `lib/prompt-store.ts` removed, and demo fallback retained through repository demo mode.
- [x] **A.5 RLS Policies** — Expanded `supabase/schema.sql` with multi-tenant tables, indexes, helper access functions, and RLS policies across organization- and brand-scoped entities; added typed DB interface scaffold `lib/supabase/database.types.ts`.
- [x] **A.6 Sprint A acceptance** — `npm run verify` passes on demo configuration; live Supabase remains operator-verified.

#### Sprint B progress checklist

- [x] **B.1 Provider abstraction layer** — Added `lib/ai/providers/*` implementations for OpenAI, Anthropic, Gemini, and Perplexity with health checks and cost estimation.
- [x] **B.2 Unified response format** — Extended `lib/ai/types.ts` with `AIResponse`, `Citation`, `AIExecuteOptions`, provider names, and orchestrator result types.
- [x] **B.3 Orchestrator** — Added `lib/ai/orchestrator.ts` with parallel execution, retries, fallback chain support, and aggregate metrics.
- [x] **B.4 Citation extraction** — Added `lib/ai/citation-extractor.ts` and integrated citation normalization in orchestration flow.
- [x] **B.5 Cost optimization** — Added `lib/ai/cache.ts` + `lib/ai/cost-optimizer.ts` with budget guards, fallback model policy, and response cache (memory + optional Redis).
- [x] **B.6 Sprint B — prompt library** — Added `lib/ai/prompts/*` (analysis, sentiment, recommendation templates); further wiring optional.

#### Sprint C progress checklist

- [x] **C.1 Redis setup** — `ioredis` + `bullmq`, `lib/env.ts`, `lib/redis/client.ts`, `/api/health/redis`.
- [x] **C.2 Queue architecture** — Queues: `prompt-execution`, `sentiment-analysis`, `recommendation-generation`, `citation-extraction`, `trend-analysis` (`lib/queues/*`, `queue-names.ts`).
- [x] **C.3 Workers** — `workers/*.worker.ts` + `workers/index.ts` (`npm run workers`).
- [x] **C.4 Job tracking UI** — `/dashboard/jobs` + `/api/health/queues`.
- [x] **C.5 Queue wiring** — `POST /api/prompts/[id]/run` enqueues when Redis is configured.

1. ~~Add `middleware.ts` for Supabase session refresh + protected `/dashboard` routes.~~ **Done**
2. ~~Introduce **Zod** schemas for all API bodies; return 400 with structured errors.~~ **Partial — extend to remaining routes**
3. ~~Replace in-memory stores with **Supabase repositories**~~ **Partial — finish Zustand→API + citations DB depth**
4. Move rate limiting to **Redis/Upstash** (or Edge Config) for serverless compatibility.

### P1 — AI engine

5. **Provider abstraction**: `AIProvider` interface + adapters (OpenAI, Anthropic, Gemini HTTP, Perplexity HTTP).
6. Retries, timeouts, structured `UnifiedModelResponse` type.
7. Persist raw responses + token usage to `analysis_results` (extend schema).

### P2 — Async execution

8. Redis + BullMQ (or managed alternative): queues `prompt-execution`, `sentiment`, `recommendations`, `citations`.
9. Worker process (separate Node entry or container) + idempotent jobs.

### P3 — Product depth

10. Scheduler tables + cron (Vercel Cron or worker cron): schedule definitions, `next_run_at`, execution logs.
11. Advanced mention library: alias table + fuzzy match + optional embedding match for semantic variants.
12. Enriched sentiment + pattern pipelines reading from stored analyses over time.

### P4 — SaaS

13. Organizations, memberships, roles, invites.
14. Stripe subscriptions + usage metering tied to analyze quota.

### P5 — Ops

15. Docker Compose for Redis + worker locally; env validation (`zod`/`envalid`) at startup.
16. CI: lint, typecheck, build; optional Playwright smoke.

---

## 9. Recommended execution order (next sprints)

1. **Sprint A**: Auth gates + Zod + Supabase CRUD for prompts/competitors + RLS.
2. **Sprint B**: Persist analysis runs; dashboard reads from DB with pagination.
3. **Sprint C**: Provider abstraction + Gemini/Perplexity adapters.
4. **Sprint D**: Queue + worker for long analyses.
5. **Sprint E**: Scheduler + billing.

---

## 10. Out of scope for “single PR”

Phases 4–17 as written imply **multiple engineering weeks** (Redis infra, workers, Stripe, full GEO NLP). Treat this document as the contract for incremental delivery.
