# Phase 1 — Project Audit (AI Visibility Platform)

_Generated as baseline for enterprise roadmap. Code state reflects repository snapshot at audit time._

---

## 1. Architecture overview

| Layer | Current state |
|-------|----------------|
| **Frontend** | Next.js 14 App Router, React 18, Tailwind, Radix/shadcn-style UI, Framer Motion, Recharts, Zustand (`store/dashboard.ts`) |
| **Marketing** | Route group `(marketing)/`: `/`, `/pricing`; components under `components/marketing/` |
| **Dashboard** | `(dashboard)/dashboard/*`: overview, prompts, competitors, sentiment, sources, recommendations, settings |
| **API** | Route handlers under `app/api/*` — REST-style JSON, no unified versioning |
| **Auth** | Supabase client helpers (`lib/supabase/client.ts`, `server.ts`), `/login`, `/auth/callback` |
| **AI** | `lib/ai/analyzer.ts`, `sentiment.ts`, `recommendations.ts`; providers: OpenAI + Anthropic only (`AIModelKey`: `openai` \| `anthropic`) |
| **Persistence** | **Not wired**: prompts use in-memory `lib/prompt-store.ts`; competitors/recommendations APIs use module-level arrays; schema exists in `supabase/schema.sql` but app does not query it |
| **Jobs / queues** | **None** (no BullMQ, Redis, workers) |
| **Middleware** | **Missing** — no `middleware.ts` for Supabase session refresh / route protection |

**Diagram (logical)**

```
Browser → Next.js (RSC + client islands) → API Routes → [Memory | OpenAI | Anthropic]
                                              ↘ Supabase (auth only when configured; DB unused by APIs)
```

---

## 2. Gap analysis vs enterprise target

| Area | Gap |
|------|-----|
| **Data layer** | No repositories, services, pagination, filters, or RLS-backed queries |
| **Multi-model** | No Gemini, Perplexity, or abstract provider interface beyond two SDK calls |
| **Mention detection** | Substring `indexOf` only — no aliases, fuzzy match, or NER |
| **Sentiment** | Single GPT-4o JSON pass + demo heuristic; no sentence-level pipeline, trust/buying intent |
| **Patterns / GEO** | Rule-of-thumb `detectPatterns`; no historical diff, citation extraction, or SERP-style GEO scoring |
| **Analytics** | Charts fed from `lib/demo-data.ts` + Zustand; no aggregation tables or caches |
| **Scheduling** | No cron, no `next_run`, no execution logs |
| **Billing / orgs** | Not present |
| **Observability** | No structured logging, error tracking, or metrics hooks |

---

## 3. Demo / in-memory logic inventory

| Location | Behavior |
|----------|----------|
| `lib/demo-data.ts` | Seeds UI metrics, charts, activity, sources |
| `lib/prompt-store.ts` | Mutable array initialized from demo prompts — **lost on cold start / multi-instance** |
| `app/api/competitors/route.ts` | In-memory `competitors` array |
| `app/api/recommendations/route.ts` | `Set` for completed IDs + static `DEMO_RECOMMENDATIONS` |
| `lib/config.ts` | `isDemoMode()` when no AI keys — `analyzePromptOrDemo` returns canned analysis |
| Dashboard pages | Mostly client components reading hooks/store + demo constants |

---

## 4. API inventory

| Route | Purpose | Persistence | Notes |
|-------|---------|-------------|-------|
| `POST /api/analyze` | Run analysis | No | Rate limit in-process Map; not distributed |
| `POST /api/sentiment` | Sentiment only | No | |
| `GET/POST /api/prompts` | List/create | Memory (`prompt-store`) | |
| `DELETE /api/prompts/[id]` | Delete | Memory | |
| `GET/POST /api/competitors` | List/add | Memory | |
| `GET/POST /api/recommendations` | List / mark done | Memory + static demo | |

**Missing** (relative to roadmap): authenticated CRUD by brand/org, batch analyze, schedule CRUD, exports server-side, webhooks, admin APIs.

---

## 5. Dependency report

**Production (`package.json`)**

| Category | Packages |
|----------|----------|
| Framework | `next`, `react`, `react-dom` |
| UI | `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate`, `geist`, `lucide-react`, `framer-motion`, `recharts` |
| Data / auth | `@supabase/supabase-js`, `@supabase/ssr` |
| AI | `openai`, `@anthropic-ai/sdk` |
| State | `zustand` |
| Utils | `date-fns` |

**Not present (required for stated phases 4–6, 11–14)**

- `bullmq`, `ioredis` (or Vercel Queue / Inngest alternative)
- `@google/generative-ai` or Vertex (Gemini)
- Perplexity official SDK (HTTP client only)
- `zod` (request validation)
- `@stripe/stripe-js` / `stripe` (billing)
- Redis rate-limit adapter (`@upstash/ratelimit` common on Vercel)

---

## 6. Security report

| Topic | Risk | Severity |
|-------|------|----------|
| **API auth** | Analyze/sentiment/prompts routes appear **unauthenticated** — anyone who can hit the deployment can burn quotas | **High** |
| **Rate limiting** | In-memory per Node process — ineffective horizontally; resets on restart | **Medium** |
| **Secrets** | Service role key in `.env.example` — ensure never exposed client-side (currently OK if server-only) | **Low** (process) |
| **RLS** | Schema has tables but **no RLS policies** in repo | **High** when multi-tenant |
| **Input validation** | No Zod on API bodies — injection / malformed payloads possible | **Medium** |
| **CORS / CSRF** | Default Next.js behavior; OAuth callback depends on Supabase config | **Medium** |

---

## 7. Performance report

| Topic | Observation |
|-------|-------------|
| **Charts** | Recharts in client components; SSR/static generation can log dimension warnings — use explicit heights / dynamic import if needed |
| **Bundle** | Dashboard routes pull Recharts + Framer Motion; consider lazy charts per route |
| **DB** | N/A until queries exist — future risk: N+1 without indexes |
| **Caching** | No CDN headers strategy documented; no Redis cache for analytics |

---

## 8. Prioritized TODO roadmap

### P0 — Foundation (before scale)

#### Sprint A progress checklist

- [x] **A.1 Middleware & Authentication** — Added `middleware.ts` with request IDs, Supabase session refresh helper (`lib/supabase/middleware.ts`), protected `/dashboard/*` and `/api/*`, `401` JSON for unauthenticated API access, and redirect to `/login` for dashboard pages.
- [x] **A.2 Zod Validation Layer** — Added `lib/validators/*`, `lib/api/validate.ts`, `lib/api/errors.ts`, and wired validation into current API routes with request-scoped `requestId` error responses.
- [x] **A.3 Supabase Repository Pattern** — Added `lib/repositories/*` with base abstractions, typed CRUD contracts, pagination/query options, and repository-backed API integration for prompts, competitors, and recommendations.
- [x] **A.4 Replace In-Memory Stores** — API routes now use repositories (`prompts`, `competitors`, `recommendations`, `brands`, `results`), `lib/prompt-store.ts` removed, and demo fallback retained through repository demo mode.
- [x] **A.5 RLS Policies** — Expanded `supabase/schema.sql` with multi-tenant tables, indexes, helper access functions, and RLS policies across organization- and brand-scoped entities; added typed DB interface scaffold `lib/supabase/database.types.ts`.
- [ ] **A.6 Sprint A acceptance checklist complete**

1. Add `middleware.ts` for Supabase session refresh + protected `/dashboard` routes.
2. Introduce **Zod** schemas for all API bodies; return 400 with structured errors.
3. Replace in-memory stores with **Supabase repositories** (prompts, competitors, recommendations, analysis_results) + **RLS policies** per `user_id` / `brand_id`.
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
