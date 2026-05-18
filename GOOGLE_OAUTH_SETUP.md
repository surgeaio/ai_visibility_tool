# Google OAuth setup (Supabase Auth)

Use this runbook to fix **"Unsupported provider: provider is not enabled"** and **redirect_uri_mismatch** errors.

---

## Step A — Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com).
2. Create or select project **ai-visibility-tool**.
3. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name: **AI Visibility Tool**
   - Support email + developer contact email
   - Authorized domains: `vercel.app`, `supabase.co` (and your custom domain if any)
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized JavaScript origins:**
     ```
     https://ai-visibility-tool-nu.vercel.app
     https://jfunkoftnvbxkmlelkad.supabase.co
     http://localhost:3000
     ```
   - **Authorized redirect URIs (CRITICAL — Supabase handles OAuth):**
     ```
     https://jfunkoftnvbxkmlelkad.supabase.co/auth/v1/callback
     ```
5. Copy **Client ID** and **Client secret**.

---

## Step B — Supabase Dashboard

1. Open [Supabase project](https://supabase.com/dashboard/project/jfunkoftnvbxkmlelkad).
2. **Authentication → Providers → Google**
3. **Enable** Google provider.
4. Paste **Client ID** and **Client secret** from Step A.
5. Save.

---

## Step C — URL configuration

1. **Authentication → URL Configuration**
2. **Site URL:** `https://ai-visibility-tool-nu.vercel.app`
3. **Redirect URLs** (add each):
   ```
   https://ai-visibility-tool-nu.vercel.app/auth/callback
   https://ai-visibility-tool-nu.vercel.app/**
   http://localhost:3000/auth/callback
   ```

---

## Step D — Google Cloud: Search Console OAuth client (separate from Supabase login)

Create a **second** OAuth client (or add redirect URIs to your Web client) for **Search Console** inside the dashboard:

**Authorized redirect URIs (add both for safety):**

```
https://ai-visibility-tool-nu.vercel.app/api/auth/callback/google
https://ai-visibility-tool-nu.vercel.app/api/auth/google/callback
http://localhost:3000/api/auth/callback/google
```

Enable **Google Search Console API** for the project.

**Vercel env (GSC only — not used for `/login`):**

```
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=https://ai-visibility-tool-nu.vercel.app/api/auth/callback/google
ENCRYPTION_KEY=<64 hex chars>
```

Supabase Google login (Step B) uses `https://jfunkoftnvbxkmlelkad.supabase.co/auth/v1/callback` — do **not** confuse with GSC redirect above.

This app uses **custom OAuth** (not NextAuth). Routes:

- Start: `GET /api/auth/google?brandId=...`
- Callback: `GET /api/auth/callback/google`

---

## Step E — Test Supabase login

1. Open `https://ai-visibility-tool-nu.vercel.app/login`
2. Click **Continue with Google**
3. Google consent screen → approve
4. Redirect to `/auth/callback` → `/dashboard`

## Step F — Test Search Console connect

1. Log in → **Google Rankings** (or **Search Rankings**)
2. Click **Connect Search Console**
3. Approve permissions
4. Redirect to `/dashboard/google-rankings?connected=true`
5. Click **Re-sync now** if metrics are empty

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| **provider is not enabled** | Complete **Step B** (enable Google in Supabase) |
| **redirect_uri_mismatch** | Redirect URI must be exactly `https://jfunkoftnvbxkmlelkad.supabase.co/auth/v1/callback` in Google Console |
| **Site URL mismatch** | Set Site URL in **Step C** |
| Lands on `/login?error=...` | Check Supabase Auth logs; confirm redirect URLs include `/auth/callback` |
| **404 on `/api/auth/callback/google`** | Deploy latest code; route must exist (`app/api/auth/callback/google/route.ts`) |
| **redirect_mismatch / 400 malformed** | `GOOGLE_REDIRECT_URI` must exactly match Google Console + auth URL |
| **oauth_failed after approve** | Check Vercel logs `[gsc-oauth-callback]`; verify `ENCRYPTION_KEY` and DB migration |

---

## Optional: Disable email confirmation (faster signup testing)

1. Supabase → **Authentication → Providers → Email**
2. Turn **OFF** “Confirm email”
3. Save

New signups can sign in immediately with password. **Re-enable** before onboarding real customers.

---

## Optional: Enable Email provider

1. **Authentication → Providers → Email** → Enable
2. Ensure **Email + password** is allowed for sign-in and sign-up
