---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (unit) + Playwright (E2E auth flows) |
| **Config file** | `vitest.config.ts` / `playwright.config.ts` — Wave 0 installs |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run && npx playwright test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run && npx playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | AUTH-01 | E2E | `npx playwright test auth/signup` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | AUTH-02 | E2E | `npx playwright test auth/verify` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | AUTH-03 | E2E | `npx playwright test auth/reset` | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 1 | AUTH-04 | E2E | `npx playwright test auth/wholesaler-login` | ❌ W0 | ⬜ pending |
| 1-01-05 | 01 | 1 | AUTH-05 | E2E | `npx playwright test auth/session-persist` | ❌ W0 | ⬜ pending |
| 1-01-06 | 01 | 2 | GRADE-03 | unit | `npx vitest run schema/listings` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/auth/signup.spec.ts` — E2E signup + email verification flow (AUTH-01, AUTH-02)
- [ ] `tests/auth/reset.spec.ts` — password reset flow (AUTH-03)
- [ ] `tests/auth/wholesaler-login.spec.ts` — wholesaler login with admin-created creds (AUTH-04)
- [ ] `tests/auth/session-persist.spec.ts` — session survives browser refresh (AUTH-05)
- [ ] `tests/schema/listings.test.ts` — unit: listings table has grade/grade_source/graded_at columns (GRADE-03)
- [ ] `playwright.config.ts` — Playwright project config
- [ ] `vitest.config.ts` — Vitest config

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RLS blocks cross-role data access | AUTH-04 | Requires live Supabase DB with policies applied | Log in as consumer, attempt to query wholesaler-only tables via Supabase client — expect 0 rows / permission denied |
| Custom Access Token Hook injects app role into JWT | AUTH-04 | Requires Supabase dashboard hook registration | Decode JWT from browser, verify `app_metadata.role` present and correct for each role |
| Storage bucket permissions (public/private) | GRADE-03 | Requires live bucket with test files | Attempt unauthenticated GET on car-documents bucket URL — expect 403 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
