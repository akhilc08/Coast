---
phase: 04
slug: admin-and-grading-scaffold
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (configured in vitest.config.ts) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/admin/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/admin/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 0 | ADMIN-01 | unit | `npx vitest run tests/admin/create-wholesaler.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 0 | ADMIN-02 | unit | `npx vitest run tests/admin/user-management.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 0 | ADMIN-03, ADMIN-04 | unit | `npx vitest run tests/admin/admin-queries.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 0 | ADMIN-05 | unit | `npx vitest run tests/admin/analytics.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-05 | 01 | 0 | GRADE-04 | unit | `npx vitest run tests/admin/grading-callback.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/admin/create-wholesaler.test.ts` — stubs for ADMIN-01 (wholesaler account creation)
- [ ] `tests/admin/user-management.test.ts` — stubs for ADMIN-02 (view/disable users)
- [ ] `tests/admin/admin-queries.test.ts` — stubs for ADMIN-03, ADMIN-04 (listings/orders queries with filters)
- [ ] `tests/admin/analytics.test.ts` — stubs for ADMIN-05 (analytics aggregates)
- [ ] `tests/admin/grading-callback.test.ts` — stubs for GRADE-04 (callback auth, validation, grade write)

*All test files mock `@/lib/supabase/admin` following the `webhook-stripe.test.ts` pattern.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin sidebar navigation | ADMIN-01-05 | Visual layout | Navigate /admin, verify sidebar links work |
| Admin role middleware guard | ADMIN-01-05 | Auth integration | Log in as consumer, verify /admin redirects |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
