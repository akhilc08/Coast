---
phase: 2
slug: inventory
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (unit) + Playwright 1.58.x (E2E) |
| **Config file** | `vitest.config.ts` / `playwright.config.ts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run && npx playwright test` |
| **Estimated runtime** | ~5s unit / ~60s full |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run && npx playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds (unit), 60 seconds (full)

---

## Per-Task Verification Map

| Task ID | Plan | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|-------------|-----------|-------------------|-------------|--------|
| LIST-01 | Wave 0 | LIST-01 | unit | `npx vitest run tests/listings/listing-schema.test.ts` | ❌ W0 | ⬜ pending |
| LIST-02a | Wave 0 | LIST-02 | unit | `npx vitest run tests/listings/nhtsa.test.ts` | ❌ W0 | ⬜ pending |
| LIST-02b | Wave 0 | LIST-02 | unit | `npx vitest run tests/listings/nhtsa.test.ts` | ❌ W0 | ⬜ pending |
| LIST-03a | Wave 0 | LIST-03 | unit | `npx vitest run tests/listings/photo-upload.test.ts` | ❌ W0 | ⬜ pending |
| LIST-03b | Wave 0 | LIST-03 | unit | `npx vitest run tests/listings/photo-reorder.test.ts` | ❌ W0 | ⬜ pending |
| LIST-04 | Wave 0 | LIST-04 | unit | `npx vitest run tests/listings/document-upload.test.ts` | ❌ W0 | ⬜ pending |
| LIST-05 | Wave 0 | LIST-05 | E2E | `npx playwright test tests/listings/create-draft.spec.ts` | ❌ W0 | ⬜ pending |
| LIST-06 | Wave 0 | LIST-06 | E2E | `npx playwright test tests/listings/manage-listings.spec.ts` | ❌ W0 | ⬜ pending |
| STOR-01 | Wave 0 | STOR-01 | unit | `npx vitest run tests/storefront/listings-query.test.ts` | ❌ W0 | ⬜ pending |
| STOR-02 | Wave 0 | STOR-02 | unit | `npx vitest run tests/storefront/listings-query.test.ts` | ❌ W0 | ⬜ pending |
| STOR-03 | Wave 0 | STOR-03 | unit | `npx vitest run tests/storefront/listings-query.test.ts` | ❌ W0 | ⬜ pending |
| STOR-04 | Wave 0 | STOR-04 | unit | `npx vitest run tests/storefront/listings-query.test.ts` | ❌ W0 | ⬜ pending |
| STOR-05 | Wave 0 | STOR-05 | E2E | `npx playwright test tests/storefront/vehicle-detail.spec.ts` | ❌ W0 | ⬜ pending |
| STOR-06 | Wave 0 | STOR-06 | E2E | `npx playwright test tests/storefront/mobile-responsive.spec.ts` | ❌ W0 | ⬜ pending |
| GRADE-01 | Wave 0 | GRADE-01 | unit | `npx vitest run tests/listings/photo-upload.test.ts` | ❌ W0 | ⬜ pending |
| GRADE-02 | Wave 0 | GRADE-02 | unit | `npx vitest run tests/storefront/grade-badge.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/listings/listing-schema.test.ts` — Zod schema validation stubs (LIST-01)
- [ ] `tests/listings/nhtsa.test.ts` — VIN decode parse logic with fixture JSON, not live network (LIST-02)
- [ ] `tests/listings/photo-upload.test.ts` — storage key generation, CDN URL format (LIST-03, GRADE-01)
- [ ] `tests/listings/photo-reorder.test.ts` — arrayMove position logic (LIST-03)
- [ ] `tests/listings/document-upload.test.ts` — MIME type validation (LIST-04)
- [ ] `tests/storefront/listings-query.test.ts` — query builder with mocked Supabase client (STOR-01–04)
- [ ] `tests/storefront/grade-badge.test.ts` — "Grade Pending" when grade is null (GRADE-02)
- [ ] `tests/listings/create-draft.spec.ts` — E2E wizard draft flow (LIST-05)
- [ ] `tests/listings/manage-listings.spec.ts` — E2E edit/publish/archive (LIST-06)
- [ ] `tests/storefront/vehicle-detail.spec.ts` — E2E lightbox on photo click (STOR-05)
- [ ] `tests/storefront/mobile-responsive.spec.ts` — E2E filter drawer at 375px viewport (STOR-06)

*Note: `nhtsa.test.ts` must use fixture JSON — unit tests must not depend on external network.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Photo drag-and-drop reorder | LIST-03 | Visual drag interaction | Drag photo to new position; reload page; confirm order persists (DB updated) |
| Batch photo upload | LIST-03 | File system interaction | Drop 5+ photos simultaneously; confirm all appear with correct previews |
| VIN auto-advance | LIST-02 | Wizard step transition animation | Enter valid VIN; confirm step auto-advances with make/model/year pre-filled |
| Document upload + skip | LIST-04/05 | Optional step behavior | Upload a PDF, then try publishing without doc — both should succeed |
| Filter chips dismissal | STOR-02 | URL + grid sync | Apply multiple filters; click chip to dismiss one; confirm URL and grid both update |
| Mobile filter drawer | STOR-06 | Touch interaction | On 375px viewport, tap "Filters" button; confirm bottom drawer opens |
| Lightbox navigation | STOR-05 | Mouse/keyboard interaction | Click photo → lightbox opens; arrows advance; ESC closes |
| Buy CTA visibility | STOR-05 | Role-based UI | Logged-out: no Buy button; logged-in consumer: Buy button visible; wholesaler: hidden |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s (unit)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
