# Deferred Items — Phase 01 Foundation

## middleware.ts — Next.js 16 "proxy" convention

**Discovered during:** Plan 01-03 Task 2 build verification
**Warning:** `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.`
**Context:** Next.js 16 renamed `middleware.ts` to `proxy.ts` (or uses a `proxy` export convention). The `middleware.ts` created in Plan 01-01 uses the old convention.
**Impact:** Build succeeds and functionality works. This is a deprecation warning, not a breaking error.
**Action needed:** Rename `middleware.ts` to `proxy.ts` and update export name before Next.js removes the deprecated convention. Recommend doing this in Phase 2 Plan 01 as a quick housekeeping task.
