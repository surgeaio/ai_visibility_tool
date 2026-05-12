# Contributing

1. Install dependencies: `npm install`.
2. Run checks before pushing: `npm run verify` (TypeScript + ESLint + production build).
3. Prefer **strict typing** — avoid `any`; use `unknown` and narrow.
4. Preserve **demo / auth bypass** behaviour: never remove `isAuthBypassMode()` fallbacks without an explicit product decision.
5. Keep UI aligned with the existing **dark SaaS** styling (Tailwind tokens in `app/globals.css` and shared dashboard components).
6. For database changes, update `supabase/schema.sql` and add a dated file under `supabase/migrations/`, then refresh types (`npm run db:types`) when the Supabase CLI is available.

Pull requests should describe user-visible impact in plain language.
