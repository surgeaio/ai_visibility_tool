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

## AI providers

| Variable | Where to get | Format | Vercel | Railway | Example (redacted) |
|----------|--------------|--------|--------|---------|-------------------|
| `OPENAI_API_KEY` | platform.openai.com | `sk-...` | Yes | Yes | `sk-proj-***` |
| `ANTHROPIC_API_KEY` | console.anthropic.com | `sk-ant-...` | Yes | Yes | `sk-ant-***` |
| `GOOGLE_AI_API_KEY` | Google AI Studio | `AIza...` | Yes | Yes | `AIza***` |
| `PERPLEXITY_API_KEY` | perplexity.ai (optional) | `pplx-...` | Optional | Optional | `pplx-***` |
| `SERPER_API_KEY` | serper.dev | Hex/string | Yes | Optional | `***` |
| `AI_DAILY_BUDGET_USD` | App setting | Number | Optional | Optional | `50` |
| `STRICT_LLM_EXECUTION` | App setting | `true` / `false` | Optional | Optional | `false` |

## Google OAuth (Search Console — not Supabase login)

| Variable | Where to get | Format | Vercel | Railway | Example (redacted) |
|----------|--------------|--------|--------|---------|-------------------|
| `GOOGLE_CLIENT_ID` | Google Cloud Console → Credentials | `*.apps.googleusercontent.com` | Yes | Optional | `***.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Same | `GOCSPX-...` | Yes | Optional | `GOCSPX-***` |
| `GOOGLE_REDIRECT_URI` | Must match OAuth client | Full HTTPS URL | Yes | Optional | `https://ai-visibility-tool-nu.vercel.app/api/auth/google/callback` |

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
