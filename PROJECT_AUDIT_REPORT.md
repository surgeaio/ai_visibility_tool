# PROJECT AUDIT REPORT

**Generated:** 2026-05-17  
**Repository:** `ai_visibility_tool`  
**Auditor method:** File reads + ripgrep scans + local commands (`typecheck`, `lint`, `build`). No assumptions where files were not read.

---

## 📦 SECTION 1 — PROJECT IDENTITY

**Sources read:** `package.json`, `README.md`, `tsconfig.json`, `next.config.mjs`, `.gitignore`, `vercel.json`, `Dockerfile.worker`

```
PROJECT NAME: ai_visibility_tool
VERSION: 0.1.0
DESCRIPTION: (package.json has no "description" field)
PURPOSE (in 2 lines): Next.js dashboard for generative-engine / AI visibility tracking (prompts, competitors, sentiment, citations, recommendations, Google rankings, website audit). Optional BullMQ workers on Railway execute prompts, crawls, sentiment, and scheduled jobs against Supabase + Redis.

FRAMEWORK: Next.js 14.2.35 (App Router — evidence: `app/` directory with `page.tsx` routes, no `pages/`)
RUNTIME: Node.js 20 (Dockerfile.worker:2 `FROM node:20-alpine`; CI `.github/workflows/ci.yml:15` `node-version: "20"`). No `engines` in package.json, no `.nvmrc`.
LANGUAGE: TypeScript ^5 (devDependency); strict mode enabled (`tsconfig.json:7`)
PACKAGE MANAGER: npm (package-lock.json present; scripts use `npm run`)

TOTAL DEPENDENCIES: 39 (production)
TOTAL DEV DEPENDENCIES: 11
```

### Scripts (`package.json:5-19`)

| Script | Command |
|--------|---------|
| `dev` | `next dev` |
| `dev:full` | concurrently: dev + workers + scheduler |
| `build` | `node --max-old-space-size=8192 … next build` |
| `start` | `next start` |
| `lint` | `next lint` |
| `typecheck` | `tsc --noEmit` |
| `workers` | `tsx workers/index.ts` |
| `scheduler` | `tsx lib/scheduler/cron-runner.ts` |
| `db:seed` | `tsx scripts/seed.ts` |
| `db:migrate` | `npx supabase migration up` |
| `db:reset` | `npx supabase db reset` |
| `db:types` | `node scripts/write-supabase-types.mjs` |
| `verify` | typecheck + lint + build |

### TypeScript (`tsconfig.json`)

- **strict:** `true` (line 7)
- **paths:** `@/*` → `./*` (lines 21-23)
- **exclude:** `node_modules`, `app/(marketing)` (line 26) — marketing route group not present in tree (0 files under `app/(marketing)`)

### Next.js (`next.config.mjs`)

- `experimental.instrumentationHook: true` (lines 3-5)
- `eslint.ignoreDuringBuilds: true` (line 9)
- Security headers on `/:path*` (lines 11-25)

### `.gitignore`

Ignores: `node_modules`, `.next`, `out`, `build`, `.env` / `.env.*` (except `!.env.example`), `.vercel`, editor dirs, logs, `supabase/.temp/`.

### `vercel.json`

```json
{}
```

No crons, no region override, no build overrides.

### Railway

**NO `railway.json` / `railway.toml` FOUND.** Deployment inferred from `Dockerfile.worker` + `docs/DEPLOYMENT.md` only.

---

## 🏗 SECTION 2 — FOLDER STRUCTURE

Top-level (excluding `node_modules`, `.next`, `.git`):

```
.github/              → GitHub Actions CI (verify: typecheck + lint + build)
app/                  → Next.js App Router (pages, layouts, API routes)
  api/                → REST API route handlers (`route.ts`)
  auth/               → Supabase OAuth callback route
  login/              → Login page
  (dashboard)/        → Route group; dashboard UI under `/dashboard/*`
  fonts/              → Font assets
components/           → React UI (dashboard, charts, layout, settings, shadcn-style ui/)
docs/                 → Setup, deployment, architecture, API docs
lib/                  → Core logic: AI, Supabase, queues, services, validators, repos
scripts/              → DB seed, Supabase types writer
store/                → Zustand client store (`dashboard.ts`)
supabase/             → SQL migrations + consolidated `schema.sql`
workers/              → BullMQ worker entry + per-queue processors
middleware.ts         → Edge auth + route guards (repo root)
instrumentation.ts    → Production env assertions on Node boot
```

**Note:** `app/(marketing)` is excluded in `tsconfig.json` but contains **no files** in this checkout.

---

## 🔌 SECTION 3 — DEPENDENCIES BREAKDOWN

Versions below are **resolved** from `package-lock.json` where checked; ranges from `package.json` otherwise.

### Framework & Core

| Package | Version (lock) | Notes |
|---------|----------------|-------|
| next | 14.2.35 | App Router |
| react | ^18 | lock resolves 18.x |
| react-dom | ^18 | |
| typescript | ^5 | dev |

### Authentication & Database

| Package | Version |
|---------|---------|
| @supabase/ssr | ^0.10.3 |
| @supabase/supabase-js | ^2.105.4 |

Uses `@supabase/ssr` (`createServerClient`, `createBrowserClient`) — **not** `@supabase/auth-helpers-nextjs`.

### Queue / Background Jobs

| Package | Version |
|---------|---------|
| bullmq | ^5.76.7 |
| ioredis | ^5.10.1 |
| @upstash/redis | ^1.38.0 |
| @upstash/ratelimit | ^2.0.8 |
| node-cron | ^3.0.3 |

### AI / LLM

| Package | Version |
|---------|---------|
| openai | ^6.37.0 |
| @anthropic-ai/sdk | ^0.95.2 |
| @google/generative-ai | ^0.24.1 |

Perplexity: **no SDK** — HTTP via `fetch` in `lib/ai/providers/perplexity.provider.ts`.

### UI / Styling

| Package | Version |
|---------|---------|
| tailwindcss | ^3.4.1 (dev) |
| tailwindcss-animate | ^1.0.7 |
| @radix-ui/react-* | multiple ^1.x–^2.x |
| lucide-react | ^1.14.0 |
| framer-motion | ^12.38.0 |
| geist | ^1.7.0 |
| recharts | ^3.8.1 |
| sonner | ^2.0.7 |
| class-variance-authority, clsx, tailwind-merge | |

**shadcn/ui:** Not a direct dependency; UI primitives match shadcn-style components under `components/ui/`.

### Validation / Forms

| Package | Version |
|---------|---------|
| zod | ^4.4.3 |

**react-hook-form:** NOT in dependencies.

### Search / SEO / Google

| Package | Version |
|---------|---------|
| googleapis | ^171.4.0 |
| cheerio | ^1.2.0 |
| puppeteer | ^24.43.1 |

Serper: **no npm package** — `fetch` to `https://google.serper.dev` in `lib/services/serper.ts`.

### Utilities

| Package | Version |
|---------|---------|
| date-fns | ^4.1.0 |
| zustand | ^5.0.13 |

**lodash, axios:** NOT dependencies.

### Dev Tools

| Package | Version |
|---------|---------|
| eslint | ^8 |
| eslint-config-next | 14.2.35 |
| concurrently | ^9.1.2 |
| tsx | ^4.19.2 |
| postcss | ^8 |

### Flags

| Item | Assessment |
|------|------------|
| Next 14.2.35 | Supported; not latest 15.x — intentional pin |
| ESLint 8 | EOL approaching; still used by eslint-config-next 14 |
| puppeteer on Vercel | Heavy; likely worker-only usage — verify deploy size if imported in API routes |
| No `react-hook-form` | Forms use local state |

---

## 🌍 SECTION 4 — ENVIRONMENT VARIABLES

Scanned all `process.env.*` in `*.{ts,tsx,js,mjs}` (excluding `node_modules`).

| Variable Name | Used In (files) | Required? | Has Fallback? | NEXT_PUBLIC_? | Server-only? |
|--------------|-----------------|-----------|---------------|---------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase/server.ts:6`, `client.ts:4`, `middleware.ts:17`, `admin.ts:8`, `middleware.ts:50`, `instrumentation.ts:10`, `app/auth/callback/route.ts:6`, `app/api/health/db/route.ts:7`, `lib/config.ts:24`, `scripts/seed.ts:8` | Yes (prod) | Middleware: skip auth; server: **throws** | Yes | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same as URL | Yes (prod) | Middleware: null user; server: **throws** | Yes | No |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/admin.ts:9,21`, `scripts/seed.ts:8` | Workers/admin ops | Returns null client if missing (`tryCreateAdminSupabaseClient`) | No | **Yes** |
| `NEXT_PUBLIC_APP_URL` | `lib/services/google-oauth.ts:9`, `app/api/auth/google/callback/route.ts:11` | No | `http://localhost:3000` in callback | Yes | No |
| `APP_URL` | `lib/scheduler/cron-runner.ts:7` | No (scheduler) | — | No | Yes |
| `REDIS_URL` | `lib/env.ts:7`, `lib/redis/health.ts:11` | Workers | Via `getEnv()` optional | No | Yes |
| `UPSTASH_REDIS_URL` | `lib/env.ts:8`, `lib/redis/client.ts:8,32`, `lib/redis/health.ts:11` | Alt to REDIS_URL | — | No | Yes |
| `UPSTASH_REDIS_TOKEN` | `lib/env.ts:9`, `lib/redis/client.ts:11,35` | If Upstash TCP URL | — | No | Yes |
| `UPSTASH_REDIS_REST_URL` | `lib/env.ts:10`, `lib/rate-limit.ts:13` | Rate limit | In-memory fallback in dev | No | Yes |
| `UPSTASH_REDIS_REST_TOKEN` | `lib/env.ts:11`, `lib/rate-limit.ts:14` | With REST URL | — | No | Yes |
| `OPENAI_API_KEY` | `lib/config.ts:2`, providers, `lib/ai/analyzer.ts:11`, `lib/ai/sentiment.ts:9` | No | Demo text if missing (unless STRICT) | No | Yes |
| `ANTHROPIC_API_KEY` | `lib/config.ts:6`, providers, `lib/ai/analyzer.ts:22` | No | Demo | No | Yes |
| `GOOGLE_AI_API_KEY` | `lib/ai/providers/gemini.provider.ts`, `lib/services/llm-visibility-analyzer.ts:12` | No | Demo | No | Yes |
| `PERPLEXITY_API_KEY` | `lib/ai/providers/perplexity.provider.ts:19`, `llm-visibility-analyzer.ts:13` | No | Demo | No | Yes |
| `SERPER_API_KEY` | `lib/services/serper.ts:40` | Serper routes | Throws/empty if missing | No | Yes |
| `GOOGLE_CLIENT_ID` | `lib/services/google-oauth.ts:7` | GSC OAuth | — | No | Yes |
| `GOOGLE_CLIENT_SECRET` | `lib/services/google-oauth.ts:8` | GSC OAuth | — | No | Yes |
| `GOOGLE_REDIRECT_URI` | `lib/services/google-oauth.ts:9` | No | Built from APP_URL | No | Yes |
| `ENCRYPTION_KEY` | `lib/crypto/encryption.ts:11,32`, `instrumentation.ts:18` | Prod | Dev may warn | No | Yes |
| `CRON_SECRET` | `lib/env.ts:15`, cron routes, `cron-runner.ts:8` | Prod cron | sync-gsc allows non-prod without | No | Yes |
| `DEMO_MODE` | `lib/config.ts:35`, `instrumentation.ts:25` | No | — | No | Yes |
| `NEXT_PUBLIC_DEMO_MODE` | `lib/config.ts:36`, `instrumentation.ts:25` | No | — | Yes | No |
| `STRICT_LLM_EXECUTION` | `lib/config.ts:19` | No | default false | No | Yes |
| `AI_DAILY_BUDGET_USD` | `lib/ai/cost-optimizer.ts:3` | No | default `50` | No | Yes |
| `AI_FORCE_LOW_COST` | `lib/ai/cost-optimizer.ts:27` | No | default `0` | No | Yes |
| `NODE_ENV` | `lib/config.ts:32`, `encryption.ts:7`, `rate-limit.ts:55`, `login/page.tsx:73`, `cron/sync-gsc:6` | implicit | — | No | Both |
| `VERCEL_ENV` | `instrumentation.ts:7` | Vercel prod checks | — | No | Yes |
| `PRODUCTION_ENV_ASSERTION` | `instrumentation.ts:7` | Optional | — | No | Yes |

### `.env.example` comparison

**In code but NOT in `.env.example`:**

- `VERCEL_ENV` (platform-injected)
- `PRODUCTION_ENV_ASSERTION`
- `NODE_ENV` (platform-injected)
- `AI_FORCE_LOW_COST`

**In `.env.example` but lightly / indirectly used:**

- All major groups present; `UPSTASH_REDIS_URL` / `UPSTASH_REDIS_TOKEN` used in `lib/redis/client.ts` via `getEnv()` (documented as legacy naming in example comments).

---

## 🛣 SECTION 5 — ROUTES MAP

### Frontend Routes (App Router)

| Path | File | Access |
|------|------|--------|
| `/` | `app/page.tsx` | 🟢 Public (redirects to `/login` via page + middleware) |
| `/login` | `app/login/page.tsx` | 🟢 Public |
| `/signup` | **NO `page.tsx` FOUND** | Middleware allows path (`middleware.ts:18`) but route **missing** |
| `/auth/callback` | `app/auth/callback/route.ts` | 🟢 Public (OAuth code exchange) |
| `/dashboard` | `app/(dashboard)/dashboard/page.tsx` | 🔒 Protected |
| `/dashboard/analytics` | `.../analytics/page.tsx` | 🔒 |
| `/dashboard/brand-audit` | `.../brand-audit/page.tsx` | 🔒 |
| `/dashboard/brands/new` | `.../brands/new/page.tsx` | 🔒 |
| `/dashboard/citations` | `.../citations/page.tsx` | 🔒 |
| `/dashboard/competitors` | `.../competitors/page.tsx` | 🔒 |
| `/dashboard/competitors/[id]` | `.../competitors/[id]/page.tsx` | 🔒 |
| `/dashboard/google-rankings` | `.../google-rankings/page.tsx` | 🔒 |
| `/dashboard/google-rankings/[keyword]` | `.../[keyword]/page.tsx` | 🔒 |
| `/dashboard/jobs` | `.../jobs/page.tsx` | 🔒 |
| `/dashboard/llm-visibility` | `.../llm-visibility/page.tsx` | 🔒 |
| `/dashboard/llm-visibility/[promptId]` | `.../[promptId]/page.tsx` | 🔒 |
| `/dashboard/prompts` | `.../prompts/page.tsx` | 🔒 |
| `/dashboard/recommendations` | `.../recommendations/page.tsx` | 🔒 |
| `/dashboard/sentiment` | `.../sentiment/page.tsx` | 🔒 |
| `/dashboard/settings` | `.../settings/page.tsx` | 🔒 |
| `/dashboard/settings/api-keys` | `.../api-keys/page.tsx` | 🔒 (middleware redirects to `/dashboard` — hidden) |
| `/dashboard/settings/billing` | `.../billing/page.tsx` | 🔒 (middleware redirects — hidden) |
| `/dashboard/sources` | `.../sources/page.tsx` | 🔒 |
| `/dashboard/website-audit` | `.../website-audit/page.tsx` | 🔒 |
| `/dashboard/website-audit/non-indexed` | `.../non-indexed/page.tsx` | 🔒 |

**Admin-only:** No role-based admin routes found in code. 🚫 N/A.

**Protection mechanism:** `middleware.ts` redirects unauthenticated users on `/dashboard/*`; `isAuthBypassMode()` only when **not** production (`lib/config.ts:32-38`).

### API Routes

**Default runtime:** No `export const runtime` in any `app/api/**` file → **Node.js** (Next.js default).

**Default auth:** Middleware requires Supabase user for `/api/*` except public prefixes (`middleware.ts:6-12`, `72-88`). Individual routes may add `getAuthedUserId()` (13 routes) or use repositories without explicit user check (rely on middleware + RLS).

| Method(s) | Path | File | Auth (middleware) | Notes |
|-----------|------|------|-------------------|-------|
| GET | `/api/health` | `app/api/health/route.ts` | No (public) | |
| GET | `/api/health/db` | `app/api/health/db/route.ts` | No | |
| GET | `/api/health/redis` | `app/api/health/redis/route.ts` | No | |
| GET | `/api/health/queues` | `app/api/health/queues/route.ts` | No | |
| GET, POST | `/api/auth/google` | `app/api/auth/google/route.ts` | No | GSC OAuth start |
| GET | `/api/auth/google/callback` | `app/api/auth/google/callback/route.ts` | No | |
| GET, POST | `/api/cron/run-schedules` | `app/api/cron/run-schedules/route.ts` | No (CRON_SECRET in route) | |
| GET | `/api/cron/sync-gsc` | `app/api/cron/sync-gsc/route.ts` | No (Bearer secret) | |
| GET | `/api/analytics/descriptive` | `app/api/analytics/descriptive/route.ts` | Yes | |
| GET | `/api/analytics/diagnostic` | `app/api/analytics/diagnostic/route.ts` | Yes | |
| GET | `/api/analytics/predictive` | `app/api/analytics/predictive/route.ts` | Yes | |
| POST | `/api/analyze` | `app/api/analyze/route.ts` | Yes | |
| GET, POST | `/api/api-keys` | `app/api/api-keys/route.ts` | Yes | uses `getAuthedUserId` |
| DELETE | `/api/api-keys/[id]` | `app/api/api-keys/[id]/route.ts` | Yes | |
| POST | `/api/api-keys/[id]/test` | `app/api/api-keys/[id]/test/route.ts` | Yes | |
| POST | `/api/brand-audit/scrape` | `app/api/brand-audit/scrape/route.ts` | Yes | |
| POST | `/api/brand-audit/llm-visibility` | `app/api/brand-audit/llm-visibility/route.ts` | Yes | |
| GET, POST | `/api/brand-audit/full-report` | `app/api/brand-audit/full-report/route.ts` | Yes | |
| GET, POST | `/api/brands` | `app/api/brands/route.ts` | Yes | |
| GET, PATCH, DELETE | `/api/brands/[id]` | `app/api/brands/[id]/route.ts` | Yes | |
| GET | `/api/citations` | `app/api/citations/route.ts` | Yes | |
| GET, POST | `/api/competitors` | `app/api/competitors/route.ts` | Yes | |
| GET, PATCH, DELETE | `/api/competitors/[id]` | `app/api/competitors/[id]/route.ts` | Yes | |
| GET | `/api/dashboard/overview` | `app/api/dashboard/overview/route.ts` | Yes | |
| GET | `/api/google-rankings` | `app/api/google-rankings/route.ts` | Yes | |
| GET | `/api/gsc/status` | `app/api/gsc/status/route.ts` | Yes | |
| POST | `/api/gsc/sync` | `app/api/gsc/sync/route.ts` | Yes | |
| GET | `/api/indexed-pages` | `app/api/indexed-pages/route.ts` | Yes | |
| GET | `/api/llm-visibility` | `app/api/llm-visibility/route.ts` | Yes | |
| GET, POST | `/api/prompts` | `app/api/prompts/route.ts` | Yes | |
| GET, PATCH, DELETE | `/api/prompts/[id]` | `app/api/prompts/[id]/route.ts` | Yes | |
| POST | `/api/prompts/[id]/run` | `app/api/prompts/[id]/run/route.ts` | Yes | |
| GET | `/api/results` | `app/api/results/route.ts` | Yes | |
| GET, POST, PATCH | `/api/recommendations` | `app/api/recommendations/route.ts` | Yes | |
| POST | `/api/recommendations/generate` | `app/api/recommendations/generate/route.ts` | Yes | |
| POST | `/api/sentiment` | `app/api/sentiment/route.ts` | Yes | |
| POST | `/api/serper/search` | `app/api/serper/search/route.ts` | Yes | |
| POST | `/api/serper/check-ranking` | `app/api/serper/check-ranking/route.ts` | Yes | |
| GET | `/api/website-audit/latest` | `app/api/website-audit/latest/route.ts` | Yes | |
| POST | `/api/website-audit/run` | `app/api/website-audit/run/route.ts` | Yes | |

**Total API route files:** 40

---

## 🔐 SECTION 6 — AUTH SYSTEM

1. **Auth provider:** **Supabase Auth** via `@supabase/ssr` (`lib/supabase/client.ts`, `server.ts`, `middleware.ts`).

2. **Session storage:** **HTTP cookies** (SSR cookie adapter in `createServerClient` — `lib/supabase/middleware.ts:24-34`, `server.ts:12-26`).

3. **Protected route logic:**
   - **Middleware** (`middleware.ts`): `refreshSupabaseSession` → `supabase.auth.getUser()`; `/dashboard/*` requires `user`; `/api/*` requires `user` except `isPublicApiPath`.
   - **Production bypass disabled:** `isAuthBypassMode()` returns `false` when `NODE_ENV === "production"` (`lib/config.ts:32-33`).
   - **Demo bypass (non-prod):** `DEMO_MODE`, `NEXT_PUBLIC_DEMO_MODE`, or missing Supabase env (`lib/config.ts:35-38`).
   - **API layer:** `getAuthedUserId()` in `lib/api/session.ts:7-15` returns `DEMO_AUTH_USER_ID` in bypass mode.

4. **Public routes (exact):**
   - Pages: `/`, `/login`, `/auth/callback` (and `/signup` allowed by middleware but **no page**)
   - API prefixes: `/api/auth/*`, `/api/webhooks/*` (no webhooks implemented in tree), `/api/health/*`, `/api/cron/*`
   - Static assets excluded by matcher (`middleware.ts:107-110`)

5. **Login flow:**
   1. User visits `/login` (`app/login/page.tsx`).
   2. **Email:** `supabase.auth.signInWithOtp` → redirect `emailRedirectTo: {origin}/auth/callback` (lines 23-26).
   3. **Google:** `supabase.auth.signInWithOAuth({ provider: "google" })` → same callback (lines 36-39).
   4. `app/auth/callback/route.ts` exchanges `code` via `supabase.auth.exchangeCodeForSession` (lines 17-18).
   5. Redirect to `next` query param or `/dashboard` (lines 10, 23).

6. **Logout flow:** **NO `signOut` call found** in codebase (grep: no matches). **UNCLEAR** — may be missing from UI or handled only client-side without implementation.

7. **OAuth providers:**
   - **Supabase Auth:** Google (`app/login/page.tsx:36-38`).
   - **Separate Google Cloud OAuth:** Search Console via `/api/auth/google` (`lib/services/google-oauth.ts`) — not the same as Supabase login OAuth.

---

## 🗄 SECTION 7 — DATABASE SCHEMA

**Migrations found:** `supabase/migrations/` (7 files). Consolidated reference: `supabase/schema.sql`.

### Tables (from migrations)

| Table | Source migration | Notes |
|-------|------------------|-------|
| organizations | `20260112000000_initial_schema.sql:7` | |
| organization_members | initial:15 | FK → organizations, auth.users |
| users | initial:24 | FK → auth.users |
| brands | initial:33 | user_id, org_id |
| prompts | initial:44 | |
| competitors | initial:58 | |
| ai_responses | initial:69 | |
| analysis_results | initial:84 | |
| brand_mentions | initial:101 | |
| sentiment_scores | initial:113 | |
| citations | initial:129 | |
| patterns | initial:142 | |
| recommendations | initial:155 | |
| prompt_schedules | initial:169 | |
| job_logs | initial:183 | |
| usage_logs | initial:195 | |
| user_api_keys | `20260213000001_user_api_keys.sql:3` | encrypted keys |
| llm_platforms | `20260213000002_crm_tracking_tables.sql:3` | |
| llm_brand_performance | 20260213000002:19 | |
| google_rankings | 20260213000002:39 | |
| indexed_pages | 20260213000002:59 | |
| competitor_rankings | 20260213000002:79 | |
| website_audits | 20260213000002:93 | |
| page_audits | 20260213000002:105 | |
| gsc_connections | `20260214000000_phase_2_real_data.sql:16` | |
| crawl_jobs | 20260214000002:46 | |
| brand_audit_scrapes | `20260515000000_brand_audit_tables.sql:4` | |
| brand_audit_llm_results | 20260515000000:20 | |
| brand_audit_reports | 20260515000000:42 | |

**RLS:** Enabled on all core tables (`20260112000000_initial_schema.sql:242-257`) plus later tables. Policies use `auth.uid()`, `is_org_member()`, and brand ownership patterns. **Whether migrations are applied on production Supabase:** UNKNOWN (requires Supabase dashboard verification).

**Indexes:** Defined in initial migration (lines 207-226) and later migrations — e.g. `idx_brands_user`, `idx_prompts_brand`, GIN on `prompts.text`.

**Typed schema:** `lib/supabase/database.types.ts` (722 lines) — generated types for Supabase client.

---

## ⚙️ SECTION 8 — BACKGROUND JOBS / WORKERS

Entry: `workers/index.ts` — requires `REDIS_URL` or `UPSTASH_REDIS_URL`; exits 0 if missing (lines 22-26).

| QUEUE | FILE | PROCESSOR | SCHEDULE | RUNS ON |
|-------|------|-----------|----------|---------|
| `prompt-execution` | `workers/prompt.worker.ts` | `executePromptExecutionJob` — LLM prompt runs | On demand (API/cron enqueue) | Railway |
| `platform-scheduler` | `workers/platform-scheduler.worker.ts` | `prompt-schedules` → `runDuePromptSchedules`; `gsc-sync` → `syncAllActiveGscConnections` | Repeatable: `0 * * * *` hourly; `0 6 * * *` daily UTC (`lib/scheduler/register-repeatable-jobs.ts:4-6`) | Railway |
| `sentiment-analysis` | `workers/sentiment.worker.ts` | Sentiment processing | On demand | Railway |
| `recommendation-generation` | `workers/recommendation.worker.ts` | Recommendations | On demand | Railway |
| `citation-extraction` | `workers/citation.worker.ts` | Citations | On demand | Railway |
| `trend-analysis` | `workers/trend.worker.ts` | Trends | On demand | Railway |
| `website-crawl` | `workers/crawl.worker.ts` | Website crawl jobs | On demand | Railway |
| `serper-ranking` | `workers/serper-ranking.worker.ts` | Serper ranking jobs | On demand | Railway |

**Vercel cron:** None (`vercel.json` is `{}`).

**Optional local scheduler:** `npm run scheduler` — HTTP ping to `/api/cron/run-schedules` (`lib/scheduler/cron-runner.ts`).

**Docker:** `Dockerfile.worker` → `npx tsx workers/index.ts`

---

## 🤖 SECTION 9 — AI / LLM USAGE

| PROVIDER | MODELS USED (defaults in code) | FILES | PURPOSE | TOKEN/COST CONTROLS |
|----------|-------------------------------|-------|---------|---------------------|
| OpenAI | `gpt-4o`, `gpt-4o-mini` (`lib/ai/providers/openai.provider.ts:9`, `lib/services/llm-tracker.ts:29`, `lib/ai/sentiment.ts:30`) | providers, `llm-tracker`, `analyzer`, `orchestrator` | Prompt execution, sentiment, analysis | `lib/ai/cost-optimizer.ts` in-memory daily budget `AI_DAILY_BUDGET_USD` (default 50); **not persisted across instances** |
| Anthropic | `claude-3-5-sonnet-20241022` (`lib/ai/providers/anthropic.provider.ts:9`) | providers, analyzer | LLM responses | Same |
| Google Gemini | `gemini-2.0-flash` (`lib/ai/providers/gemini.provider.ts:9`) | providers, brand audit | LLM visibility | Same |
| Perplexity | `sonar` (`lib/ai/providers/perplexity.provider.ts:14`) | provider, api-key-tester | LLM responses | Same |

**Demo behavior:** `assertLlmKeyOrAllowDemo` / `STRICT_LLM_EXECUTION` — synthetic responses when keys missing unless strict (`lib/ai/llm-execution-policy.ts`).

**User API keys:** Stored encrypted (`lib/crypto/encryption.ts`) in `user_api_keys` table.

---

## 🔗 SECTION 10 — EXTERNAL SERVICES

| Service | Purpose | SDK/Package | Required Env Vars |
|---------|---------|-------------|-------------------|
| Supabase | Postgres DB + Auth | @supabase/ssr, supabase-js | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (admin) |
| Upstash Redis | BullMQ (TCP), rate limit (REST) | ioredis, @upstash/redis, @upstash/ratelimit | `REDIS_URL` or `UPSTASH_REDIS_URL`+`UPSTASH_REDIS_TOKEN`; `UPSTASH_REDIS_REST_*` |
| OpenAI | LLM | openai | `OPENAI_API_KEY` |
| Anthropic | LLM | @anthropic-ai/sdk | `ANTHROPIC_API_KEY` |
| Google AI | Gemini | @google/generative-ai | `GOOGLE_AI_API_KEY` |
| Perplexity | LLM | fetch (REST) | `PERPLEXITY_API_KEY` |
| Serper | Google SERP JSON | fetch | `SERPER_API_KEY` |
| Google OAuth / GSC | Search Console data | googleapis | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |
| Puppeteer | Website scraping (audit/crawl) | puppeteer | None (local/Chromium) |
| Vercel | Frontend hosting | — | Platform env |
| Railway | Workers | Docker | `REDIS_URL`, `SUPABASE_SERVICE_ROLE_KEY`, AI keys |

---

## 🚀 SECTION 11 — DEPLOYMENT TARGETS

### Vercel

| Item | Value |
|------|-------|
| Deploys | Next.js app + all `app/api/*` serverless routes + Edge `middleware.ts` |
| Build command | `npm run build` (from package.json; no override in vercel.json) |
| Output | Next.js default (`.next`) |
| Crons | **None** (`vercel.json: {}`) |
| Region | **UNKNOWN** (not set in repo) |

### Railway

| Item | Value |
|------|-------|
| Deploys | BullMQ workers (inferred) |
| Start command | `npx tsx workers/index.ts` (Dockerfile.worker:7) |
| Dockerfile | `Dockerfile.worker` (Node 20 Alpine) |
| Health check | **Not defined in repo** — use `/api/health` on Vercel or custom Railway health |
| railway.toml/json | **NOT FOUND** |

### Supabase

- Apply migrations via CLI (`npm run db:migrate`) or SQL editor (`docs/DEPLOYMENT.md:27-29`).
- **Production migration state:** UNKNOWN.

---

## 🩺 SECTION 12 — HEALTH CHECK

Commands run on audit machine (2026-05-17):

| Command | Status | Notes |
|---------|--------|-------|
| `npm install` | **NOT RE-RUN** | `node_modules` present; prior installs assumed OK |
| `npx tsc --noEmit` / `npm run typecheck` | ✅ Pass | exit 0 |
| `npm run lint` | ✅ Pass (warnings) | 1 warning: `@next/next/no-img-element` in `app/(dashboard)/dashboard/brand-audit/page.tsx:292` |
| `npm run build` | ✅ Pass | exit 0; middleware bundle 82.9 kB |

---

## 🐛 SECTION 13 — KNOWN ISSUES & RED FLAGS

### Critical Issues (block production)

| Issue | Location | Detail |
|-------|----------|--------|
| `instrumentation.ts` throws if `ENCRYPTION_KEY` not 64 hex | `instrumentation.ts:18-22` | Short keys like `ai-visibility-super-encryption-key-2026` **fail production boot** |
| `instrumentation.ts` throws if DEMO_MODE true | `instrumentation.ts:25-28` | Production must set `DEMO_MODE=false` and `NEXT_PUBLIC_DEMO_MODE=false` |
| Upstash REST env confusion | **Operational** | REST URL must be `https://…`; token ≠ TCP password (user-reported misconfig) |
| `/signup` route missing | `middleware.ts:18` vs no `app/signup/page.tsx` | Dead public path |
| No logout implementation | **grep: no signOut** | Users cannot sign out via app code |
| Auth bypass in non-prod only | `lib/config.ts:31-38` | OK for prod; ensure Vercel `NODE_ENV=production` |
| Demo secrets in repo | `lib/demo-data.ts:417-439` | Placeholder strings `sk-demo-…` — not live keys but bad pattern if copied |

### Warnings

| Issue | Location |
|-------|----------|
| `eslint.ignoreDuringBuilds: true` | `next.config.mjs:9` |
| ~50+ `console.log/error` in API/workers | e.g. `workers/prompt.worker.ts:12`, `middleware.ts:53,102` |
| In-memory AI budget | `lib/ai/cost-optimizer.ts:4` — not shared across serverless instances |
| `BrandsRepository` without `getAuthedUserId` | `app/api/brands/route.ts:10-26` — relies on middleware + RLS only |
| Hidden settings routes still in tree | `middleware.ts:33-39` redirects billing/api-keys |
| `puppeteer` dependency | Heavy; confirm not bundled into inappropriate routes |
| No automated tests | 0 `*.test.ts` / `*.spec.ts` files |
| `app/(marketing)` excluded but empty | `tsconfig.json:26` |

### Suggestions

- Add `/signup` page or remove from `isPublicAppPath`.
- Implement logout (`supabase.auth.signOut`) in `DashboardShell`.
- Add Railway `healthcheck` path or worker heartbeat.
- Persist AI spend to Redis/Supabase for real budget caps.
- Run `npm audit` periodically (not run in this audit).

---

## 📊 SECTION 14 — METRICS

```
TOTAL FILES (tracked TS/TSX):     215
TOTAL LINES OF CODE (TS/TSX):     15,699
TYPESCRIPT FILES:                 215 (.ts + .tsx)
COMPONENT FILES:                  30 (components/**/*.tsx)
API ROUTES:                       40 (app/api/**/route.ts)
WORKERS:                          8 (workers/*.ts including index)
TEST FILES:                       0
```

---

## 🎯 SECTION 15 — FINAL PROJECT SUMMARY

```
What is this project: A Next.js “AI visibility” SaaS dashboard that tracks brand presence across LLMs and Google (prompts, rankings, sentiment, citations, audits, recommendations) backed by Supabase.
Tech stack: Next.js 14 App Router, TypeScript, Supabase Auth/DB, BullMQ + Redis (Upstash), multi-provider LLM SDKs, Tailwind + Radix UI.
How it deploys: Vercel hosts the web app and API routes; Railway (Dockerfile.worker) runs BullMQ workers and repeatable schedulers; Supabase is the database; no Vercel crons in repo.
Main features: Dashboard analytics, prompt scheduling/execution, brand audit scraper, GSC sync, Serper rankings, encrypted user API keys, demo mode for local dev.
Current state (working / broken / partial): Build/typecheck/lint pass locally; production depends on correct env (especially ENCRYPTION_KEY, Upstash REST, DEMO_MODE off); middleware recently hardened; logout/signup gaps; migration apply status on live Supabase UNKNOWN.
```

---

*End of audit report.*
