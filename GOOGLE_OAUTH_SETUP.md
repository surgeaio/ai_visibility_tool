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

## Step D — Vercel / Railway env (Search Console OAuth — separate)

These env vars are for **Google Search Console** API (`/api/auth/google`), not Supabase login:

```
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=https://ai-visibility-tool-nu.vercel.app/api/auth/google/callback
```

Supabase Google login uses Step B only (no `GOOGLE_CLIENT_ID` in app code for `/login` OAuth button).

---

## Step E — Test

1. Open `https://ai-visibility-tool-nu.vercel.app/login`
2. Click **Continue with Google**
3. Google consent screen → approve
4. Redirect to `/auth/callback` → `/dashboard`

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| **provider is not enabled** | Complete **Step B** (enable Google in Supabase) |
| **redirect_uri_mismatch** | Redirect URI must be exactly `https://jfunkoftnvbxkmlelkad.supabase.co/auth/v1/callback` in Google Console |
| **Site URL mismatch** | Set Site URL in **Step C** |
| Lands on `/login?error=...` | Check Supabase Auth logs; confirm redirect URLs include `/auth/callback` |

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
