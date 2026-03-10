# Phase 1: Foundation - Research

**Researched:** 2026-03-10
**Domain:** Supabase Auth (three-role), PostgreSQL schema + RLS, Supabase Storage buckets, Next.js 15 project scaffold
**Confidence:** HIGH (primary sources: Supabase official docs, Next.js official docs, verified 2025)

---

## Summary

Phase 1 is the auth and database foundation — nothing else can be built without it. The three deliverables are: (1) a working Next.js 15 + Supabase project scaffold with `@supabase/ssr` middleware handling session refresh, (2) the complete PostgreSQL schema with RLS policies covering all three roles (consumer, wholesaler, admin), and (3) Supabase Storage buckets with correct public/private configuration.

The most critical design decision in this phase is **how roles are stored and enforced**. Supabase's JWT `role` field is NOT the application role — it is the PostgreSQL role (`anon` or `authenticated`). Application roles (consumer, wholesaler, admin) must live in a `profiles` table and be injected into the JWT via the **Custom Access Token Auth Hook**. This is the only tamper-proof path for role-based RLS policies. If roles are stored in `user_metadata` instead, users can self-modify them via the client SDK.

Wholesaler accounts are created by the admin via `auth.admin.createUser()` with `email_confirm: true` (skips verification flow) and `app_metadata: { role: 'wholesaler' }`. Consumer accounts self-register via `supabase.auth.signUp()` and go through email verification before purchasing. Password reset uses `resetPasswordForEmail()` + a `/auth/reset-password` route that calls `updateUser()`. The `on_auth_user_created` database trigger auto-inserts a `profiles` row on every signup, providing a single source of truth for role at the DB layer.

**Primary recommendation:** Set up the Custom Access Token Hook and `profiles` trigger in the very first migration. Every subsequent RLS policy depends on `(auth.jwt() -> 'app_metadata' ->> 'role')` being correct. Getting this wrong means rewriting policies across every table.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | Consumer can create an account with email and password | `supabase.auth.signUp()` with email confirmation; `on_auth_user_created` trigger creates profiles row with role='consumer' |
| AUTH-02 | Consumer receives email verification after signup and must verify before purchasing | Supabase email confirmation enabled by default on hosted projects; custom SMTP required for production; verification via `/auth/confirm` route calling `verifyOtp()` |
| AUTH-03 | Consumer can reset password via email link | `resetPasswordForEmail()` + `/auth/reset-password` page calling `updateUser({ password })` |
| AUTH-04 | Wholesaler can log in with admin-provided credentials | Admin creates user via `auth.admin.createUser()` with `email_confirm: true`; user logs in via `signInWithPassword()` |
| AUTH-05 | User session persists across browser refresh | `@supabase/ssr` middleware handles cookie-based session refresh on every request via `supabase.auth.getClaims()` |
| GRADE-03 | Listings table includes grade, grade_source, and graded_at columns (nullable) | `grade text`, `grade_source text`, `graded_at timestamptz` columns in listings migration; nullable, populated by future AI service |
</phase_requirements>

---

## Standard Stack

### Core (Phase 1 relevant)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 15.x | Full-stack React framework | Stack constraint; App Router, Server Components, middleware |
| `react` | 19.x | UI rendering | Ships with Next.js 15 |
| `typescript` | 5.x | Type safety | Standard; `next.config.ts` natively supported in Next.js 15 |
| `@supabase/supabase-js` | 2.x | Supabase JS client | DB queries, auth, storage |
| `@supabase/ssr` | 0.x | Cookie-based session management for Next.js App Router | Required replacement for deprecated `auth-helpers-nextjs`; handles session refresh in middleware |
| `tailwindcss` | 4.x | Utility-first CSS | Stack constraint; v4 uses CSS-native `@import "tailwindcss"`, no config file |
| `shadcn/ui` | current (copy-paste) | Base component primitives | Stack constraint; `npx shadcn@latest init` copies components into `/components/ui` |
| `zod` | 3.x | Schema validation | Auth form validation shared client/server |
| `react-hook-form` | 7.x | Form state | Signup, login, reset forms |
| `@hookform/resolvers` | 3.x | Zod integration with RHF | |
| `lucide-react` | 0.4x | Icons | shadcn/ui default |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@vercel/analytics` | 1.x | Page views, Web Vitals | Add `<Analytics />` to root layout from day one |
| `@sentry/nextjs` | 8.x | Error tracking | Catch auth failures in production |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@supabase/ssr` | `@supabase/auth-helpers-nextjs` | auth-helpers-nextjs is explicitly deprecated by Supabase — do not use |
| `profiles` table role | `user_metadata` role | user_metadata is client-writable; never use for role checks |
| Custom Access Token Hook | profiles lookup in every RLS policy | Hook injects role into JWT once; policy lookups add per-query overhead and complexity |

**Installation:**

```bash
# Create project
npx create-next-app@latest coast --typescript --tailwind --eslint --app --no-src-dir

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# Forms + Validation
npm install react-hook-form zod @hookform/resolvers

# shadcn/ui (run after project creation)
npx shadcn@latest init

# Analytics + Observability
npm install @vercel/analytics @sentry/nextjs

# Dev tooling
npm install -D prettier prettier-plugin-tailwindcss
```

---

## Architecture Patterns

### Recommended Project Structure

```
app/
├── (public)/                    # No auth required
│   ├── page.tsx                 # Home / hero
│   ├── login/page.tsx           # Login form
│   ├── signup/page.tsx          # Consumer signup form
│   └── auth/
│       ├── confirm/route.ts     # Email verification OTP exchange
│       └── reset-password/
│           └── page.tsx         # New password form (post email link)
├── (protected)/                 # Requires any auth
│   └── account/page.tsx         # Placeholder for Phase 2+
├── api/
│   └── auth/
│       └── callback/route.ts    # OAuth callback (future use)
└── layout.tsx                   # Root layout

components/
├── ui/                          # shadcn/ui copies live here
├── auth/
│   ├── SignupForm.tsx
│   ├── LoginForm.tsx
│   └── ResetPasswordForm.tsx
└── providers/
    └── SupabaseProvider.tsx     # Browser client context (Client Component)

lib/
├── supabase/
│   ├── server.ts                # createServerClient (Server Components, Server Actions)
│   ├── browser.ts               # createBrowserClient (Client Components)
│   └── admin.ts                 # service_role client (server-only, NEVER export to client)
└── validations/
    └── auth.ts                  # Zod schemas for signup/login/reset

middleware.ts                    # Session refresh — MUST be at project root
supabase/
└── migrations/
    ├── 001_profiles.sql
    ├── 002_listings.sql
    └── 003_storage_buckets.sql
```

### Pattern 1: @supabase/ssr Middleware (Session Refresh)

**What:** Middleware runs on every request, refreshes the Supabase session cookie, and passes the updated session to both Server Components and the browser.
**When to use:** Always — this is the foundation for all auth checks downstream.

```typescript
// middleware.ts — at project root
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // CRITICAL: Do NOT remove — refreshes expired session
  const { data: { user } } = await supabase.auth.getUser()

  // Route guard example — redirect unauthenticated from /account
  if (!user && request.nextUrl.pathname.startsWith('/account')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

Source: [Supabase SSR Docs — Setting up Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)

### Pattern 2: Server vs Browser Supabase Clients

**What:** Two separate client factories — server for Server Components/Actions, browser for Client Components. Admin (service_role) client is a third factory, server-only.

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

// lib/supabase/browser.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// lib/supabase/admin.ts — NEVER import in client-side code
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only env var
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

### Pattern 3: Three-Role System via Custom Access Token Hook

**What:** A PostgreSQL function that fires before every JWT is issued, injecting the user's application role from the `profiles` table into `app_metadata`. RLS policies read `(auth.jwt() -> 'app_metadata' ->> 'role')`.
**When to use:** Set up in the very first migration, before any RLS policies are written.

```sql
-- Migration 001: The hook function
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claims jsonb;
  user_role text;
BEGIN
  -- Get role from profiles table
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = (event->>'user_id')::uuid;

  claims := event->'claims';

  -- Inject role into app_metadata
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata}',
      COALESCE(claims->'app_metadata', '{}'::jsonb) || jsonb_build_object('role', user_role)
    );
  END IF;

  RETURN jsonb_build_object('claims', claims);
END;
$$;

-- Grant execute to supabase_auth_admin (required for hooks)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
```

After deploying this migration, register the hook in the Supabase dashboard: Authentication > Hooks > Custom Access Token Hook.

**Reading role in RLS policies:**
```sql
-- Helper function for cleaner policies
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role')
$$;

-- Example policy using the helper
CREATE POLICY "wholesalers_manage_own_listings"
ON public.listings
FOR ALL
USING (
  public.get_my_role() = 'wholesaler'
  AND seller_id = auth.uid()
);

CREATE POLICY "admins_full_access"
ON public.listings
FOR ALL
USING (public.get_my_role() = 'admin');
```

Source: [Supabase Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook), [Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)

### Pattern 4: Auto-Create Profile on Signup (Trigger)

**What:** A `SECURITY DEFINER` trigger function that inserts a profiles row every time a user is created in `auth.users`. Sets default role='consumer'.
**When to use:** Defined in the same migration as the profiles table.

```sql
-- In Migration 001
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    COALESCE(NEW.raw_app_meta_data ->> 'role', 'consumer')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
```

Note: `raw_app_meta_data` is set by the admin when creating wholesaler accounts (`auth.admin.createUser()` with `app_metadata: { role: 'wholesaler' }`), so wholesaler profiles will have role='wholesaler' from the trigger.

Source: [Supabase Managing User Data](https://supabase.com/docs/guides/auth/managing-user-data)

### Pattern 5: Email Verification Flow (AUTH-02)

**What:** Supabase redirects email confirmation links to a Next.js route handler that exchanges the token_hash for a session.

```typescript
// app/auth/confirm/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  if (token_hash && type) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
    )

    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  return NextResponse.redirect(new URL('/login?error=verification_failed', request.url))
}
```

In Supabase dashboard, set Auth > Email Templates > Confirm signup URL to:
`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`

Source: [Supabase SSR Docs](https://supabase.com/docs/guides/auth/server-side/nextjs)

### Pattern 6: Wholesaler Account Creation (AUTH-04)

**What:** Admin creates wholesaler accounts server-side using the admin client. Skips email confirmation and sets `app_metadata.role = 'wholesaler'`.

```typescript
// In a Server Action or Route Handler (Phase 4 admin panel — scaffold now)
import { createAdminClient } from '@/lib/supabase/admin'

export async function createWholesalerAccount(email: string, password: string, fullName: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,     // skip email verification for admin-created accounts
    app_metadata: {
      role: 'wholesaler',    // read by the Custom Access Token Hook
    },
    user_metadata: {
      full_name: fullName,
    },
  })

  return { data, error }
}
```

Source: [auth.admin.createUser() reference](https://supabase.com/docs/reference/javascript/auth-admin-createuser)

### Pattern 7: Storage Bucket Creation via SQL Migration

**What:** Buckets are rows in `storage.buckets`. Create them in migrations for repeatable setup.

```sql
-- Migration 003: Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('car-photos', 'car-photos', true),         -- public: listing images served without auth
  ('car-documents', 'car-documents', false),  -- private: Carfax, title docs
  ('order-documents', 'order-documents', false); -- private: purchase agreements, signed docs

-- RLS on car-photos bucket: anyone can read
CREATE POLICY "public_read_car_photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'car-photos');

-- RLS on car-photos: only listing owner (wholesaler) can upload
CREATE POLICY "wholesaler_upload_car_photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'car-photos'
  AND public.get_my_role() = 'wholesaler'
);

-- RLS on car-documents: only listing owner can upload, authenticated users can read (post-purchase logic in Phase 3)
CREATE POLICY "wholesaler_upload_car_documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'car-documents'
  AND public.get_my_role() = 'wholesaler'
);

-- RLS on order-documents: service_role only (mutations happen server-side)
-- Reads granted via signed URLs generated server-side
```

Source: [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control), verified storage.buckets SQL pattern

### Anti-Patterns to Avoid

- **JWT `role` field for app roles:** `auth.jwt() ->> 'role'` returns `anon` or `authenticated` — the PostgreSQL role, not your application role. Use `auth.jwt() -> 'app_metadata' ->> 'role'` from the Custom Access Token Hook.
- **Roles in `user_metadata`:** Users can self-modify `user_metadata` via the client SDK. Never use for security checks.
- **RLS disabled by default:** Every new table starts with RLS off. Enable it and define deny-all as the baseline in the same migration that creates the table.
- **Service role key in browser:** `SUPABASE_SERVICE_ROLE_KEY` must never be `NEXT_PUBLIC_*`. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` go to the client.
- **No `search_path` on SECURITY DEFINER functions:** Always set `SET search_path = ''` on SECURITY DEFINER functions to prevent search_path injection.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session cookie management | Custom cookie auth | `@supabase/ssr` middleware | Handles token refresh, expiry, rotation edge cases |
| Email verification | Custom token generation | Supabase built-in email confirmation | Handles token expiry, resend, rate limiting |
| Password reset tokens | Custom reset flow | `resetPasswordForEmail()` + `updateUser()` | Handles one-time token security and expiry |
| Role-based JWT claims | Custom JWT signing | Supabase Custom Access Token Hook | Hook is the only tamper-proof, Supabase-native approach |
| Profile auto-creation | Application-layer profile create | `on_auth_user_created` trigger | DB trigger is atomic and cannot be skipped by app code bugs |

**Key insight:** Supabase handles all auth token lifecycle complexity. Treat it as a black box for token management and focus on configuring it correctly (hooks, templates, SMTP) rather than replacing any part of it.

---

## Common Pitfalls

### Pitfall 1: RLS Disabled by Default on New Tables
**What goes wrong:** Supabase creates new tables with RLS disabled. Developers enable it but never write a deny-all baseline, leaving tables partially open.
**Why it happens:** RLS requires intentional policy setup per-operation. Missing an operation (e.g., no DELETE policy) silently denies or allows based on implicit behavior.
**How to avoid:** Template for every new table migration:
```sql
ALTER TABLE public.tablename ENABLE ROW LEVEL SECURITY;
-- Then explicitly create SELECT, INSERT, UPDATE, DELETE policies
-- Use USING (false) for deny-all on operations that have no valid role
```
**Warning signs:** A `curl` without Authorization header to `[project].supabase.co/rest/v1/tablename` returns rows.

### Pitfall 2: JWT Role Confusion (App Role vs PostgreSQL Role)
**What goes wrong:** `auth.jwt() ->> 'role'` is used in RLS to check for 'wholesaler' or 'admin'. It will never match — Supabase puts `anon`/`authenticated` there, not your app role.
**Why it happens:** The JWT field named `role` sounds like the right place. Supabase documentation on this is easy to miss for first-time users.
**How to avoid:** Only use `auth.jwt() -> 'app_metadata' ->> 'role'` for application roles. This is populated only via the Custom Access Token Hook or Admin API, which makes it tamper-proof.
**Warning signs:** Wholesaler can't access seller portal despite being logged in; admin policy denies admin user.

### Pitfall 3: Missing SMTP Configuration for Production Emails
**What goes wrong:** Supabase's built-in email service has a 2 emails/hour rate limit. In production this blocks consumer signups during any traffic spike.
**Why it happens:** The default works fine in development and staging. SMTP setup is an infrastructure concern that gets deferred.
**How to avoid:** Configure a custom SMTP server (Resend or similar) in Supabase dashboard before any user-facing launch. Set up in Phase 1 even if emails are minimal.
**Warning signs:** Users report not receiving verification or reset emails; no custom SMTP configured in Supabase Auth settings.

### Pitfall 4: Missing `auth/confirm` Route for Email Verification
**What goes wrong:** Email confirmation links point to Supabase's default redirect but no Next.js route handler exchanges the `token_hash` for a session. Users click the link and get a dead page or redirect to home without being logged in.
**Why it happens:** The route must be manually created; Supabase does not generate it. The email template's `{{ .ConfirmationURL }}` must also be customized to point to the custom route.
**How to avoid:** Create `app/auth/confirm/route.ts` and update the email template in the Supabase dashboard to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` before testing signups.
**Warning signs:** Users receive email but clicking the link doesn't log them in.

### Pitfall 5: Trigger Failure Blocks Signups
**What goes wrong:** The `on_auth_user_created` trigger has a bug (e.g., NOT NULL violation) and throws an exception. Supabase rolls back the `auth.users` insert, and the user's signup fails with a generic error.
**Why it happens:** Triggers run in the same transaction as the insert they're watching. Any unhandled exception in the trigger rolls back the entire transaction.
**How to avoid:** Add exception handling to the trigger function. Test the trigger in isolation before enabling it. Use nullable columns in the profiles table for non-essential fields.
**Warning signs:** `signUp()` returns an error that doesn't match auth error codes; new users don't appear in `auth.users`.

### Pitfall 6: Storage Bucket Created Public When Should Be Private
**What goes wrong:** All buckets are created as public for convenience during development. Transaction documents (Carfax, title, purchase agreements) become publicly accessible via direct URL.
**Why it happens:** Public buckets are easier — no signed URLs needed. Developers defer security hardening.
**How to avoid:** Define the three-bucket architecture in the first storage migration: `car-photos` (public), `car-documents` and `order-documents` (private). Never store sensitive documents in a public bucket.
**Warning signs:** A direct storage URL for a Carfax PDF returns the file without any auth header.

### Pitfall 7: Custom Access Token Hook Not Registered in Dashboard
**What goes wrong:** The hook SQL function is deployed in a migration but not registered in the Supabase Auth Hooks UI. The hook never fires and role claims are missing from JWTs.
**Why it happens:** Hook registration is a dashboard UI step separate from the migration — it's easy to miss when following an automated migration flow.
**How to avoid:** After deploying the hook migration, manually register it: Authentication > Hooks > Custom Access Token Hook > select the function. Document this as a required post-migration setup step.
**Warning signs:** `auth.jwt() -> 'app_metadata' ->> 'role'` returns null for all users despite the hook function existing in the database.

---

## Code Examples

### Complete Profiles Table with RLS (Migration 001)

```sql
-- Source: Supabase Managing User Data + PITFALLS.md patterns

CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'consumer'
              CHECK (role IN ('consumer', 'wholesaler', 'admin')),
  full_name   text,
  company     text,
  phone       text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "users_read_own_profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Users can update their own profile (not role)
CREATE POLICY "users_update_own_profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

-- Admins can read all profiles
CREATE POLICY "admins_read_all_profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.get_my_role() = 'admin');

-- Insert only via trigger (no direct client inserts)
CREATE POLICY "deny_direct_insert"
ON public.profiles FOR INSERT
WITH CHECK (false);
```

### Listings Table Schema (GRADE-03 requirement)

```sql
-- Source: ARCHITECTURE.md — extended with GRADE-03 columns

CREATE TABLE public.listings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       uuid NOT NULL REFERENCES public.profiles(id),
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'active', 'sold', 'archived')),
  title           text NOT NULL,
  make            text NOT NULL,
  model           text NOT NULL,
  year            int  NOT NULL,
  mileage         int,
  color           text,
  vin             text UNIQUE,
  price_cents     int  NOT NULL,
  condition_notes text,
  -- GRADE-03: Grading scaffold columns (nullable, populated by future AI service)
  grade           text,
  grade_source    text CHECK (grade_source IN ('ai', 'manual') OR grade_source IS NULL),
  graded_at       timestamptz,
  published_at    timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Composite indexes for Phase 2 search/filter performance (add now, avoid later production locks)
CREATE INDEX idx_listings_status ON public.listings (status);
CREATE INDEX idx_listings_make_model_year ON public.listings (make, model, year);
CREATE INDEX idx_listings_price ON public.listings (price_cents);
CREATE INDEX idx_listings_created_at ON public.listings (created_at DESC);

-- Public can read active listings
CREATE POLICY "public_read_active_listings"
ON public.listings FOR SELECT
USING (status = 'active');

-- Wholesalers manage their own listings
CREATE POLICY "wholesalers_manage_own_listings"
ON public.listings
FOR ALL
TO authenticated
USING (
  public.get_my_role() = 'wholesaler'
  AND seller_id = auth.uid()
)
WITH CHECK (
  public.get_my_role() = 'wholesaler'
  AND seller_id = auth.uid()
);

-- Admins have full access
CREATE POLICY "admins_full_access_listings"
ON public.listings
FOR ALL
TO authenticated
USING (public.get_my_role() = 'admin');
```

### Password Reset Flow (AUTH-03)

```typescript
// Step 1: Request reset (Server Action or client-side)
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
})

// Step 2: app/auth/reset-password/page.tsx (Client Component)
// The user lands here with a token in the URL fragment (handled by @supabase/ssr)
// Once the session is exchanged, call:
const { error } = await supabase.auth.updateUser({
  password: newPassword,
})
```

Note: The redirect URL must be added to the Supabase Auth "Redirect URLs" allowlist in the dashboard.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | auth-helpers-nextjs is deprecated; do not use |
| `getServerSideProps` for auth | App Router Server Components + middleware | Next.js 13.4+ | Server Components eliminate client-side auth flicker |
| tailwind.config.js | CSS-native `@import "tailwindcss"` | Tailwind v4 (early 2025) | No config file; `@theme` directive in CSS |
| `toast` component (shadcn) | `sonner` | 2025 | toast deprecated in shadcn/ui; use Sonner for notifications |
| shadcn `default` style | `new-york` style | 2025 | default style deprecated in shadcn/ui |
| Roles in JWT `user_metadata` | Custom Access Token Hook + `app_metadata` | Supabase Auth Hooks release | Only tamper-proof approach for role-based RLS |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Note: Supabase docs now use `PUBLISHABLE_KEY` name | 2025 update | May see either name in docs; both refer to the anon key |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Do not install. `@supabase/ssr` is the direct replacement.
- Tailwind `tailwind.config.js`: Not needed in v4. shadcn init handles CSS setup.
- shadcn `toast` component: Use `sonner` instead per shadcn/ui docs.

---

## Open Questions

1. **SMTP Provider for Phase 1**
   - What we know: Supabase's default email service is rate-limited to 2/hour; production requires custom SMTP. Resend is the recommended choice given the stack (React Email + Resend).
   - What's unclear: Whether to set up Resend SMTP in Phase 1 or defer to Phase 3 when email volume increases. Phase 1 has minimal email (signup confirm + password reset only).
   - Recommendation: Configure Resend SMTP in Phase 1 — it's a dashboard configuration, not code. Blocked signups in staging are a productivity problem.

2. **Supabase Local vs Cloud Development**
   - What we know: Supabase CLI enables local development with `supabase start`. Migrations can be written locally and pushed to the hosted project.
   - What's unclear: Whether this project will use Supabase CLI + local Docker or connect directly to the hosted project during development.
   - Recommendation: Use the hosted Supabase project directly for Phase 1 (simpler setup, faster start). Add CLI/local setup when the team grows or CI/CD is needed.

3. **Custom Access Token Hook — Hook Registration is Manual**
   - What we know: The hook function must be deployed via migration AND registered in the Supabase dashboard UI. There is no way to automate the dashboard registration step in SQL.
   - What's unclear: Whether Supabase CLI's `config.toml` supports hook registration for local dev parity.
   - Recommendation: Document hook registration as a required post-migration step in the PLAN. Do not assume it runs automatically.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — Wave 0 must install |
| Config file | `playwright.config.ts` (recommended for auth flows) + Vitest for unit tests |
| Quick run command | `npx vitest run` (unit) |
| Full suite command | `npx playwright test` (e2e) |

**Rationale for two frameworks:** Auth flows (signup, email confirm, login, role enforcement) are best validated with e2e tests that exercise real browser behavior and cookie handling. Unit tests cover Zod schemas, helper functions. Playwright is the standard for Next.js App Router e2e testing.

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Consumer can sign up with email + password | e2e | `npx playwright test tests/auth/signup.spec.ts` | Wave 0 |
| AUTH-02 | Signup triggers email; email confirmation verifies account | e2e (manual email step) | `npx playwright test tests/auth/email-confirm.spec.ts` | Wave 0 |
| AUTH-03 | Password reset email link works; new password accepted | e2e | `npx playwright test tests/auth/reset-password.spec.ts` | Wave 0 |
| AUTH-04 | Wholesaler can log in with admin-created credentials | e2e | `npx playwright test tests/auth/wholesaler-login.spec.ts` | Wave 0 |
| AUTH-05 | Session persists across browser refresh | e2e | `npx playwright test tests/auth/session-persistence.spec.ts` | Wave 0 |
| GRADE-03 | listings table has grade, grade_source, graded_at columns (nullable) | unit (DB schema check) | `npx vitest run tests/schema/listings.test.ts` | Wave 0 |

**AUTH-02 caveat:** Full email confirmation is difficult to automate without an email testing service (Mailpit for local, Mailtrap for staging). The e2e test should use Supabase's admin API to programmatically confirm the email in CI, bypassing the actual email delivery.

### Sampling Rate

- **Per task commit:** `npx vitest run` (schema + unit tests, ~5s)
- **Per wave merge:** `npx playwright test` (full e2e auth suite)
- **Phase gate:** Full e2e suite green + manual smoke test of each auth flow before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/auth/signup.spec.ts` — covers AUTH-01
- [ ] `tests/auth/email-confirm.spec.ts` — covers AUTH-02
- [ ] `tests/auth/reset-password.spec.ts` — covers AUTH-03
- [ ] `tests/auth/wholesaler-login.spec.ts` — covers AUTH-04
- [ ] `tests/auth/session-persistence.spec.ts` — covers AUTH-05
- [ ] `tests/schema/listings.test.ts` — covers GRADE-03 (queries DB and asserts column presence)
- [ ] `playwright.config.ts` — Playwright configuration with base URL
- [ ] `vitest.config.ts` — Vitest configuration
- [ ] Framework installs: `npm install -D vitest @playwright/test && npx playwright install`
- [ ] `.env.test` — Test environment Supabase project credentials

---

## Sources

### Primary (HIGH confidence)

- [Supabase SSR Docs — Setting up Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) — middleware pattern, createServerClient, createBrowserClient
- [Supabase Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) — hook SQL structure, JWT claims injection
- [Supabase Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) — role enforcement pattern, authorize() function
- [Supabase Managing User Data](https://supabase.com/docs/guides/auth/managing-user-data) — on_auth_user_created trigger, profiles table pattern
- [auth.admin.createUser() reference](https://supabase.com/docs/reference/javascript/auth-admin-createuser) — wholesaler account creation, email_confirm, app_metadata
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) — storage.objects RLS policies
- [Supabase Password-based Auth](https://supabase.com/docs/guides/auth/passwords) — signUp, resetPasswordForEmail, updateUser
- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4) — v4 changes, component updates, new-york style
- [Next.js Installation docs](https://nextjs.org/docs/app/getting-started/installation) — create-next-app defaults, App Router structure

### Secondary (MEDIUM confidence)

- .planning/research/STACK.md — Project stack decisions (researched 2026-03-09 with training data cutoff Aug 2025)
- .planning/research/ARCHITECTURE.md — Schema design, RLS policy structure, route structure
- .planning/research/PITFALLS.md — Pitfalls 1, 2, 10, 11 directly applicable to Phase 1

### Tertiary (LOW confidence)

- None applicable — all Phase 1 critical paths verified against official Supabase and Next.js documentation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `@supabase/ssr`, `@supabase/supabase-js`, Next.js 15, shadcn/ui all verified against official 2025 docs
- Auth patterns: HIGH — signup/confirm/reset/admin-create all verified against Supabase reference docs
- RLS + Custom Access Token Hook: HIGH — verified against official Supabase Auth Hooks documentation
- Storage bucket setup: HIGH — SQL INSERT into storage.buckets verified
- Test framework recommendation: MEDIUM — Playwright + Vitest is the standard but no existing test infrastructure to build on

**Research date:** 2026-03-10
**Valid until:** 2026-06-10 (90 days — Supabase and Next.js APIs in this area are stable; shadcn/ui moves faster but changes are additive)
