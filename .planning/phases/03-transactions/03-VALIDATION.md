---
phase: 3
slug: transactions
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `vitest.config.ts` (exists) |
| **Quick run command** | `npm run test:unit -- tests/transactions/` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit -- tests/transactions/`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 0 | PURCH-01 | unit stub | `npm run test:unit -- tests/transactions/checkout.test.ts` | Wave 0 | ⬜ pending |
| 03-01-02 | 01 | 0 | PURCH-02 | unit stub | `npm run test:unit -- tests/transactions/webhook-stripe.test.ts` | Wave 0 | ⬜ pending |
| 03-01-03 | 01 | 0 | DOC-01, DOC-02 | unit stub | `npm run test:unit -- tests/transactions/pdf.test.ts` | Wave 0 | ⬜ pending |
| 03-01-04 | 01 | 0 | DOC-05 | unit stub | `npm run test:unit -- tests/transactions/webhook-dropbox.test.ts` | Wave 0 | ⬜ pending |
| 03-01-05 | 01 | 0 | NOTF-01–04 | unit stub | `npm run test:unit -- tests/transactions/emails.test.ts` | Wave 0 | ⬜ pending |
| 03-01-06 | 01 | 0 | PURCH-03 | e2e stub | `npm run test:e2e -- tests/transactions/checkout.spec.ts` | Wave 0 | ⬜ pending |
| 03-01-07 | 01 | 0 | PURCH-04 | e2e stub | `npm run test:e2e -- tests/transactions/orders.spec.ts` | Wave 0 | ⬜ pending |
| 03-02-xx | 02 | 1 | PURCH-01 | unit | `npm run test:unit -- tests/transactions/checkout.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-xx | 02 | 1 | PURCH-02 | unit | `npm run test:unit -- tests/transactions/webhook-stripe.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-xx | 03 | 2 | DOC-01, DOC-02 | unit | `npm run test:unit -- tests/transactions/pdf.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-xx | 03 | 2 | DOC-05 | unit | `npm run test:unit -- tests/transactions/webhook-dropbox.test.ts` | ❌ W0 | ⬜ pending |
| 03-04-xx | 04 | 3 | NOTF-01–04 | unit | `npm run test:unit -- tests/transactions/emails.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/transactions/checkout.test.ts` — stubs for PURCH-01 (mock Supabase + Stripe)
- [ ] `tests/transactions/webhook-stripe.test.ts` — stubs for PURCH-02 (mock constructEvent, Supabase admin)
- [ ] `tests/transactions/pdf.test.ts` — stubs for DOC-01, DOC-02 (pure PDFKit, no mocking needed)
- [ ] `tests/transactions/webhook-dropbox.test.ts` — stubs for DOC-05 callback handler
- [ ] `tests/transactions/emails.test.ts` — stubs for NOTF-01–04 template rendering (React Email render to string)
- [ ] `tests/transactions/checkout.spec.ts` — e2e stub with `test.fixme()`
- [ ] `tests/transactions/orders.spec.ts` — e2e stub with `test.fixme()`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stripe Checkout redirect works with real card | PURCH-01 | Requires Stripe test mode with real browser | Use test card 4242... on deployed preview |
| Dropbox Sign embedded signing UX | DOC-03 | Requires Dropbox Sign sandbox with real browser | Trigger signing from order page, verify embed loads |
| Email delivery and rendering | NOTF-01–04 | Requires Resend API key and real email inbox | Send test emails, verify inbox delivery and formatting |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
