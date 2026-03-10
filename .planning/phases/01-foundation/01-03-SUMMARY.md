---
phase: 01-foundation
plan: "03"
subsystem: auth
tags: [next.js, supabase, react-hook-form, zod, tailwindcss, auth, shadcn]

# Dependency graph
requires:
  - phase: 01-01
    provides: Supabase client factories (browser.ts, server.ts), Zod auth schemas, middleware route guards
  - phase: 01-02
    provides: profiles table, on_auth_user_created trigger, Custom Access Token Hook, live Supabase DB
provides:
  - "Consumer signup page at /signup with email confirmation flow"
  - "Login page at /login for consumers and wholesalers"
  - "Password reset flow at /forgot-password and /auth/reset-password"
  - "Email OTP verification route handler at /auth/confirm"
  - "OAuth PKCE callback handler at /auth/callback"
  - "Phase 1 home page placeholder at / with signup/login CTAs"
  - "components/ui/form.tsx — react-hook-form wrapper (Form, FormField, FormItem, FormLabel, FormControl, FormMessage)"
affects: [02-storefront, all-future-phases]

# Tech tracking
tech-stack:
  added:
    - components/ui/form.tsx (hand-written — base-nova shadcn style lacks this; wraps react-hook-form)
  patterns:
    - "Auth forms use react-hook-form + zodResolver — all validation client-side before server call"
    - "LoginForm wrapped in <Suspense> on the page to allow useSearchParams() in client component"
    - "Email confirmation sends to /auth/confirm?next=/login — route handler exchanges OTP then redirects"
    - "Password reset: forgot-password form → email → /auth/reset-password page (supabase handles session from link)"
    - "Always show 'reset link sent' message regardless of whether email exists — prevents email enumeration"

key-files:
  created:
    - app/auth/confirm/route.ts
    - app/auth/callback/route.ts
    - app/auth/reset-password/page.tsx
    - app/(public)/layout.tsx
    - app/(public)/page.tsx
    - app/(public)/signup/page.tsx
    - app/(public)/login/page.tsx
    - app/(public)/forgot-password/page.tsx
    - components/auth/AuthCard.tsx
    - components/auth/SignupForm.tsx
    - components/auth/LoginForm.tsx
    - components/auth/ForgotPasswordForm.tsx
    - components/auth/ResetPasswordForm.tsx
    - components/ui/form.tsx
  modified:
    - app/page.tsx (deleted — superseded by app/(public)/page.tsx)

key-decisions:
  - "form.tsx hand-written without @radix-ui/react-slot — project uses @base-ui/react, not radix. Used React.cloneElement in FormControl instead of Slot."
  - "Removed duplicate app/page.tsx — route group (public)/page.tsx supersedes it for the / route"

patterns-established:
  - "Auth pages use AuthCard wrapper for consistent dark premium layout — all future auth-adjacent pages should use this"
  - "Route group (public) applies dark bg-zinc-950 layout to all public pages without polluting root layout"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05]

# Metrics
duration: ~20min (auto tasks) + human verification pending
completed: "2026-03-10"
---

# Phase 1 Plan 03: Auth UI Summary

**Complete auth flow built: signup, login, email OTP confirm, password reset — all polished dark-theme pages using react-hook-form + Zod validation against live Supabase; awaiting end-to-end human verification**

## Performance

- **Duration:** ~20 min (Task 1 + Task 2 auto execution)
- **Started:** 2026-03-10
- **Completed:** 2026-03-10 (pending checkpoint verification)
- **Tasks:** 2/2 auto tasks complete; 1 checkpoint pending
- **Files modified:** 14

## Accomplishments

- Five auth form components built with react-hook-form + Zod: signup, login, forgot password, reset password, and auth card wrapper
- Route handlers for email OTP confirmation (/auth/confirm) and OAuth PKCE callback (/auth/callback)
- Dark premium design system applied to all auth pages (zinc-950 background, zinc-900 cards, blue-600 accent, zinc-800 borders)
- Phase 1 home page placeholder at / with signup/login CTAs
- Middleware route guards (from Plan 01-01) already protect /account, /seller/*, /admin/* — unauthenticated requests redirect to /login
- build exits 0 with all 8 routes generated

## Task Commits

Each task was committed atomically:

1. **Task 1: Auth route handlers and public layout** - `0a26d59` (feat)
2. **Task 2: Auth form components and auth pages** - `3ebdf26` (feat)

## Files Created/Modified

- `app/auth/confirm/route.ts` - GET handler: verifyOtp with token_hash + type, redirects to /login on success
- `app/auth/callback/route.ts` - GET handler: exchangeCodeForSession for OAuth PKCE flow
- `app/auth/reset-password/page.tsx` - Reset password page shell (renders ResetPasswordForm in AuthCard)
- `app/(public)/layout.tsx` - Minimal dark layout wrapper for all public routes
- `app/(public)/page.tsx` - Phase 1 home placeholder with signup/login CTAs
- `app/(public)/signup/page.tsx` - Signup page wrapping SignupForm in AuthCard
- `app/(public)/login/page.tsx` - Login page with Suspense-wrapped LoginForm
- `app/(public)/forgot-password/page.tsx` - Forgot password page wrapping ForgotPasswordForm
- `components/auth/AuthCard.tsx` - Shared auth wrapper: logo mark, title, description, dark card design
- `components/auth/SignupForm.tsx` - Consumer signup form (AUTH-01): fullName, email, password + Zod validation
- `components/auth/LoginForm.tsx` - Login form (AUTH-04, AUTH-05): email, password, error from URL params
- `components/auth/ForgotPasswordForm.tsx` - Reset request form (AUTH-03 step 1): email input, no-leak success message
- `components/auth/ResetPasswordForm.tsx` - New password form (AUTH-03 step 2): password + confirmPassword
- `components/ui/form.tsx` - react-hook-form wrapper (Form, FormField, FormItem, FormLabel, FormControl, FormMessage)
- `app/page.tsx` - DELETED (superseded by (public)/page.tsx)

## Decisions Made

- **form.tsx hand-written:** The `base-nova` shadcn style doesn't include a `form.tsx` component in its registry. The plan's component code uses `Form`, `FormField`, etc. from `@/components/ui/form`. Added a hand-written version using `React.cloneElement` for `FormControl` instead of `@radix-ui/react-slot` (not installed; project uses `@base-ui/react`).
- **Removed duplicate app/page.tsx:** The root `app/page.tsx` from Plan 01-01 scaffold conflicted with the new `(public)/page.tsx`. Removed the old one since the (public) route group page is the correct location per the plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added missing components/ui/form.tsx**
- **Found during:** Task 2 (auth form components)
- **Issue:** Plan's component code imports `Form, FormField, FormItem, FormLabel, FormControl, FormMessage` from `@/components/ui/form`, but this file doesn't exist in the base-nova shadcn style. shadcn add form returned no-op.
- **Fix:** Hand-wrote `components/ui/form.tsx` implementing the standard react-hook-form wrapper pattern without `@radix-ui/react-slot` dependency (not installed). Used `React.cloneElement` in `FormControl` instead.
- **Files modified:** components/ui/form.tsx (created)
- **Verification:** Build exits 0, all form components compile without errors
- **Committed in:** 0a26d59 (Task 1 commit, included with route handlers)

**2. [Rule 1 - Bug] Removed conflicting app/page.tsx**
- **Found during:** Task 2 (home page creation)
- **Issue:** Plan adds `(public)/page.tsx` for the `/` route, but old `app/page.tsx` from Plan 01-01 scaffold also served `/`. Two pages competing for the same route.
- **Fix:** Removed `app/page.tsx`. The `(public)/page.tsx` is now the sole home page.
- **Files modified:** app/page.tsx (deleted)
- **Verification:** Build shows single `○ /` route, no conflict errors
- **Committed in:** 3ebdf26 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for correct compilation and routing. No scope creep.

## Issues Encountered

- `shadcn add form` returned without installing anything — the base-nova style registry doesn't include the form.tsx component that wraps react-hook-form. Hand-wrote it instead using the standard pattern.

## User Setup Required

None for this plan. See Plan 01-02 for Supabase dashboard configuration (already complete).

## Next Phase Readiness

- All auth routes are live at /signup, /login, /forgot-password, /auth/reset-password, /auth/confirm
- Middleware guards /account, /seller/*, /admin/* — Phase 2 can build protected routes immediately
- Checkpoint verification required before Phase 1 is declared complete
- Phase 2 (storefront) is structurally unblocked: schema exists, auth works, home page placeholder ready

---
*Phase: 01-foundation*
*Completed: 2026-03-10*
