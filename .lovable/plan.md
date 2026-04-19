
The user wants Google SSO so users can sign in with their Google account instead of (or in addition to) email/password.

## How Google SSO works on this project

This project uses an **external Supabase project** (`ldydiabaczrjferglbar`), not Lovable Cloud. Google as an OAuth provider is configured in the **Supabase dashboard**, not in code. Once enabled there, the app calls `supabase.auth.signInWithOAuth({ provider: 'google' })` and Supabase handles the Google consent screen + callback.

## Two parts

### 1. Configuration (you do this, one-time, in dashboards)

**A. Google Cloud Console** — create OAuth credentials:
1. Go to console.cloud.google.com → create/select a project
2. **APIs & Services → OAuth consent screen** → add your domains as Authorized domains: `supabase.co`, `lovable.app`, and `analyticsmena.com` (your custom domain)
3. **APIs & Services → Credentials → Create Credentials → OAuth Client ID → Web application**
4. **Authorized JavaScript origins** — add:
   - `https://media-template.lovable.app`
   - `https://acx-media.analyticsmena.com`
   - `https://id-preview--4005571c-f8a2-45e7-aefa-102fb024d337.lovable.app`
   - `http://localhost:8080` (for local dev, optional)
5. **Authorized redirect URIs** — add the Supabase callback (shown in step B below):
   - `https://ldydiabaczrjferglbar.supabase.co/auth/v1/callback`
6. Save → copy the **Client ID** and **Client Secret**

**B. Supabase Dashboard** — enable Google provider:
1. Open Authentication → Providers → Google
2. Toggle Enable → paste Client ID and Client Secret → Save
3. Copy the callback URL shown there back into Google (step A.5) if you didn't already

**C. Supabase Auth → URL Configuration:**
- **Site URL**: `https://acx-media.analyticsmena.com` (your primary domain)
- **Redirect URLs (allowed)**: add all of the following so sign-in works from every environment:
  - `https://acx-media.analyticsmena.com/**`
  - `https://media-template.lovable.app/**`
  - `https://id-preview--4005571c-f8a2-45e7-aefa-102fb024d337.lovable.app/**`
  - `http://localhost:8080/**`

Without these, Google sign-in returns "requested path is invalid".

### 2. App code changes (I'll do this once approved)

**a. `src/pages/AuthPage.tsx`** — add a "Continue with Google" button above the email form, with a divider ("or continue with email"). The button calls:
```ts
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: `${window.location.origin}/` },
});
```
Styled to match the existing branded card (outlined button with Google "G" mark, primary-tinted hover).

**b. Profile auto-creation** — already handled. The existing `handle_new_user` trigger fires for any new auth user (email or OAuth) and:
- creates a `profiles` row pulling `full_name` from `raw_user_meta_data` (Google supplies this automatically)
- assigns the `user` role
- auto-approves `@wppmedia.com` addresses (your existing domain rule applies to Google sign-ins too)
- auto-grants admin/superadmin to `rachel.montague@wppmedia.com`

So Google sign-ups will land in the same approval flow as email sign-ups. No DB migration needed.

**c. No new packages, no edge functions, no secrets in the app codebase.** Google Client ID/Secret live only in Supabase.

## What I need from you before coding

A quick decision on the button placement and whether to also offer email sign-up alongside Google.

## Files I'll change
- `src/pages/AuthPage.tsx` — add Google button + divider

## Out of scope
- Other providers (Microsoft, Apple, etc.) — easy to add later with the same pattern
- Restricting sign-in to specific Google Workspace domains at the Google level (we already have app-side approval gating via `is_approved`)
- Linking an existing email/password account to a Google identity (Supabase handles this automatically when emails match and "Confirm email" is on)
