# Production environment setup

Set these in **Vercel** (web + API) and **Railway** (workers). Never commit real values.

## Supabase

| Variable | Where to get | Format | Vercel | Railway | Example (redacted) |
|----------|--------------|--------|--------|---------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | `https://<ref>.supabase.co` | Yes | Optional | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | API → Legacy **anon** `public` | JWT `eyJ...` | Yes | Optional | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | API → Legacy **service_role** | JWT `eyJ...` — **server only** | Yes | Yes | `eyJhbGci...` |

**Supabase Auth (dashboard):**

- Site URL: `https://ai-visibility-tool-nu.vercel.app`
- Redirect URLs: `https://ai-visibility-tool-nu.vercel.app/auth/callback`, `http://localhost:3000/auth/callback`
- Enable Email + Google providers as needed

## Redis / Upstash

| Variable | Where to get | Format | Vercel | Railway | Example (redacted) |
|----------|--------------|--------|--------|---------|-------------------|
| `REDIS_URL` | Upstash → Database → **TCP** | `rediss://default:PASSWORD@HOST:6379` | Optional | **Yes** | `rediss://default:***@***.upstash.io:6379` |
| `UPSTASH_REDIS_REST_URL` | Upstash → **REST API** tab | `https://HOST.upstash.io` | Yes | Optional | `https://***.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | REST API tab | Token (often `AX...`) | Yes | Optional | `AX***` |
| `UPSTASH_REDIS_URL` | Legacy alias for TCP host URL | Same as TCP without password in some setups | Optional | Optional | — |
| `UPSTASH_REDIS_TOKEN` | TCP password when using Upstash URL | String | Optional | Optional | — |

**Common mistake:** Do not put the TCP `rediss://` URL into `UPSTASH_REDIS_REST_URL`.

## AI providers (shared admin keys — required for prompt runs)

All users share these keys. Set **at least one** LLM provider on **Vercel and Railway**. No per-user API key setup is required.

| Variable | Required | Purpose | Vercel | Railway |
|----------|----------|---------|--------|---------|
| `OPENAI_API_KEY` | At least one LLM | OpenAI / ChatGPT runs | Yes | Yes |
| `ANTHROPIC_API_KEY` | At least one LLM | Claude runs | Yes | Yes |
| `GOOGLE_AI_API_KEY` | At least one LLM | Gemini runs | Yes | Yes |
| `PERPLEXITY_API_KEY` | Optional | Perplexity runs | Optional | Optional |
| `SERPER_API_KEY` | Recommended | Google rankings + Serper | Yes | Optional |
| `AI_DAILY_BUDGET_USD` | Optional | Spend cap | Optional | Optional |
| `STRICT_LLM_EXECUTION` | Optional | Forbid demo LLM text when keys missing | Optional | Optional |

### How prompts run

1. User clicks **Run prompts now** on `/dashboard/llm-visibility` or **Run** on `/dashboard/prompts`.
2. API checks that at least one of `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY`, or `PERPLEXITY_API_KEY` is set.
3. If `REDIS_URL` (or `UPSTASH_REDIS_URL`) is set and reachable → job is queued to BullMQ → Railway worker processes it.
4. If Redis is not configured or enqueue fails → API runs **synchronously** (slower, works on Vercel-only).
5. Results are stored in `llm_brand_performance`.
6. `/dashboard/llm-visibility` reads that table for the **selected brand** (prompts must use the same `brandId`).

Verify after deploy: `GET /api/health` → `checks.can_run_prompts: true`, `checks.execution_mode: "async"` or `"sync"`.

## Google OAuth (Search Console — not Supabase login)

| Variable | Where to get | Format | Vercel | Railway | Example (redacted) |
|----------|--------------|--------|--------|---------|-------------------|
| `GOOGLE_CLIENT_ID` | Google Cloud Console → Credentials | `*.apps.googleusercontent.com` | Yes | Optional | `***.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Same | `GOCSPX-...` | Yes | Optional | `GOCSPX-***` |
| `GOOGLE_REDIRECT_URI` | Must match OAuth client exactly | Full HTTPS URL | Yes | Optional | `https://ai-visibility-tool-nu.vercel.app/api/auth/callback/google` |
| `REDIS_URL` | BullMQ workers (GSC sync, prompts) | `rediss://...` Upstash TCP | Yes (Railway) | Yes (Vercel enqueue) | Required for background GSC sync — without it, manual sync may timeout on Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | GSC sync worker writes | service_role JWT | Yes (Railway) | No | Workers bypass RLS for batch upserts |

## Security

| Variable | Where to get | Format | Vercel | Railway | Example (redacted) |
|----------|--------------|--------|--------|---------|-------------------|
| `ENCRYPTION_KEY` | Generate: `openssl rand -hex 32` | **Exactly 64 hex chars** | Yes | Yes | `a1b2c3...` (64 chars) |
| `CRON_SECRET` | Generate: `openssl rand -hex 24` | Long random string | Yes | Yes | `***` |

Validated in `instrumentation.ts` when `VERCEL_ENV=production`.

## App URLs

| Variable | Where to get | Format | Vercel | Railway | Example (redacted) |
|----------|--------------|--------|--------|---------|-------------------|
| `NEXT_PUBLIC_APP_URL` | Your canonical Vercel domain | `https://...` | Yes | Optional | `https://ai-visibility-tool-nu.vercel.app` |
| `APP_URL` | Same as above | `https://...` | Yes | Yes | Same |

## Feature flags

| Variable | Production value | Vercel | Railway |
|----------|------------------|--------|---------|
| `DEMO_MODE` | `false` or unset | Yes | Yes |
| `NEXT_PUBLIC_DEMO_MODE` | `false` or unset | Yes | Optional |
| `NODE_ENV` | `production` (platform) | Auto | `production` |

## Platform-injected (do not set manually unless testing)

| Variable | Purpose |
|----------|---------|
| `VERCEL_ENV` | Triggers production assertions in `instrumentation.ts` |
| `PRODUCTION_ENV_ASSERTION` | Set `true` locally to test production env validation |
