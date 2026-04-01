# Testing Patterns

**Analysis Date:** 2026-04-01

## Test Frameworks

**Unit/Integration Runner:** Vitest 4.x
- Config: `vitest.config.ts`
- Environment: `node` (not jsdom)
- Globals: enabled (`describe`, `it`, `expect`, `vi` available without imports, though tests explicitly import them)
- Path alias: `@/` → project root

**E2E Runner:** Playwright 1.x
- Config: `playwright.config.ts`
- Browser: Chromium only (Desktop Chrome)
- Base URL: `http://localhost:3000` (or `PLAYWRIGHT_BASE_URL` env var)
- Workers: 1 (serial execution)
- Retries: 2 on CI, 0 locally
- Web server: `npm run dev` auto-started; reuses existing server locally

**Assertion Library:** Vitest built-in (`expect`) for unit tests; Playwright `expect` for E2E.

**Run Commands:**
```bash
npm run test:unit    # vitest run (all .test.ts/.test.tsx in tests/)
npm run test:e2e     # playwright test (all .spec.ts in tests/)
npm test             # vitest run && playwright test
```

## Test File Organization

**Location:** All tests live in `/tests/` directory (separate from source, not co-located).

**Naming:**
- Unit/integration tests: `*.test.ts` — run by Vitest
- E2E browser tests: `*.spec.ts` — run by Playwright
- Both types exist in the same domain subdirectories

**Directory structure:**
```
tests/
├── admin/
│   ├── admin-queries.test.ts
│   ├── analytics.test.ts
│   ├── create-wholesaler.test.ts
│   ├── grading-callback.test.ts
│   └── user-management.test.ts
├── auth/
│   ├── email-confirm.spec.ts
│   ├── reset-password.spec.ts
│   ├── session-persistence.spec.ts
│   ├── signup.spec.ts
│   └── wholesaler-login.spec.ts
├── lib/
│   ├── utils/
│   │   └── formatBuyerName.test.ts
│   └── validations/
│       └── review.test.ts
├── listings/
│   ├── condition-schema.test.ts
│   ├── create-draft.spec.ts
│   ├── document-upload.test.ts
│   ├── listing-schema.test.ts
│   ├── manage-listings.spec.ts
│   ├── nhtsa.test.ts
│   ├── photo-reorder.test.ts
│   └── photo-upload.test.ts
├── schema/
│   └── listings.test.ts
├── storefront/
│   ├── grade-badge.test.ts
│   ├── listings-query.test.ts
│   ├── mobile-responsive.spec.ts
│   └── vehicle-detail.spec.ts
└── transactions/
    ├── checkout.spec.ts
    ├── checkout.test.ts
    ├── emails.test.ts
    ├── orders.spec.ts
    ├── pdf.test.ts
    └── webhook-stripe.test.ts
```

## Test Structure (Vitest)

**Suite organization:**
```typescript
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

describe('Feature or component name (REQ-ID)', () => {
  beforeAll(() => {
    // Set process.env values required by the module under test
    process.env.GRADING_API_KEY = 'test-key'
  })

  beforeEach(() => {
    vi.clearAllMocks()
    // Re-apply mock implementations that clearAllMocks resets
  })

  it('does the expected thing when condition is met', async () => {
    // arrange
    mockFn.mockResolvedValue({ data: { id: 'abc' }, error: null })
    // act
    const result = await functionUnderTest(input)
    // assert
    expect(result.status).toBe(200)
    expect(mockFn).toHaveBeenCalledWith(expectedArg)
  })
})
```

**Requirement traceability:** Test descriptions and `describe` labels frequently include spec codes:
```typescript
describe('getListings query builder (STOR-01 to STOR-04)', ...)
it('STOR-01: passes textSearch fts query when q param is provided', ...)
test.describe('Consumer Signup (AUTH-01)', ...)
```

## Mocking (Vitest)

**Framework:** `vi.mock()` and `vi.fn()` from Vitest.

**Critical rule:** `vi.mock()` is hoisted to the top of the file by Vitest. Variables used inside mock factories must be declared with `vi.fn()` inside the factory, not as top-level `const` that reference external variables:
```typescript
// CORRECT — factory uses vi.fn() directly
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Then import after mock declaration
import { createClient } from '@/lib/supabase/server'
```

**Chainable Supabase mock pattern:** The Supabase client uses method chaining (`.from().select().eq().single()`). Tests build chainable mock objects manually:
```typescript
const mockSingle = vi.fn()
const mockSelectEq = vi.fn(() => ({ single: mockSingle }))
const mockSelect = vi.fn(() => ({ eq: mockSelectEq }))
const mockFrom = vi.fn((table: string) => ({ select: mockSelect }))
const mockAdminClient = { from: mockFrom }

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}))
```

**Factory helper pattern:** For complex chainable mocks used across many tests, use a `buildMockQuery` factory:
```typescript
function buildMockQuery(overrides: Record<string, unknown> = {}) {
  const query: Record<string, unknown> = {}
  const chain = () => query
  query.textSearch = vi.fn(chain)
  query.in         = vi.fn(chain)
  query.range      = vi.fn().mockResolvedValue({ data: [], count: 0, error: null })
  Object.assign(query, overrides)
  return query
}
```

**Module reset between tests:** When a module caches state (e.g., `vi.resetModules()` needed after idempotency test changes mock state), use `vi.resetModules()` at the start of the test and re-declare mocks inline:
```typescript
it('is idempotent', async () => {
  vi.resetModules()
  vi.mock('@/lib/stripe', () => ({ stripe: { webhooks: { constructEvent: mockConstructEvent } } }))
  const { POST } = await import('@/app/api/webhooks/stripe/route')
  // ...
})
```

**Dynamic import pattern:** Route handlers and server actions are imported dynamically inside test cases (not at top of file) to ensure mocks are applied before the module initializes:
```typescript
it('returns 401 when api key missing', async () => {
  const { POST } = await import('@/app/api/grading/callback/route')
  // ...
})
```

**What to mock:**
- Supabase clients (`@/lib/supabase/server`, `@/lib/supabase/admin`, `@/lib/supabase/browser`)
- External SDK clients (`@/lib/stripe`, `@/lib/resend`, `@/lib/dropboxsign`)
- Next.js APIs that throw or use request context (`next/navigation` redirect, `next/server` after)
- Fulfillment and side-effect modules in webhook tests (`@/lib/fulfillment`)

**What NOT to mock:**
- Pure utility functions (`formatBuyerName`, `buildStorageKey`) — test the real implementation
- Zod validation schemas — test real schemas with valid/invalid inputs
- Query builder functions — test real builder logic against mock Supabase client

**Next.js redirect mock:** `redirect()` throws a special error in real usage. Tests replicate this:
```typescript
class NextRedirectError extends Error {
  digest: string
  constructor(url: string) {
    super(`NEXT_REDIRECT: ${url}`)
    this.digest = `NEXT_REDIRECT;replace;${url};307;`
  }
}
const mockRedirect = vi.fn((url: string) => { throw new NextRedirectError(url) })
vi.mock('next/navigation', () => ({ redirect: mockRedirect }))
```

**Environment variables in tests:** Set via `process.env` in `beforeAll`:
```typescript
beforeAll(() => {
  process.env.GRADING_API_KEY = 'test-key'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
})
```

## Test Structure (Playwright E2E)

**Approach:** Page-level interaction tests via browser automation. Tests hit the running dev server.

**Suite organization:**
```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name (REQ-ID)', () => {
  test('user can do X', async ({ page }) => {
    await page.goto('/route')
    await page.getByLabel(/label text/i).fill('value')
    await page.getByRole('button', { name: /button text/i }).click()
    await expect(page.getByText(/confirmation/i)).toBeVisible({ timeout: 10000 })
  })
})
```

**Selector strategy:** Accessible role and label selectors preferred (`getByRole`, `getByLabel`, `getByText`) with case-insensitive regex for resilience against copy changes.

**No mocking in E2E:** E2E tests hit real dev server; no mocking of external services (requires environment to have valid credentials or test accounts).

## Todo Tests

Some test files contain `it.todo()` stubs for unimplemented tests:
```typescript
// tests/admin/analytics.test.ts
describe('Admin analytics', () => {
  it.todo('computes total revenue from all completed orders')
  it.todo('counts listings by status')
})
```
These are placeholders indicating known gaps. See `CONCERNS.md` for test coverage gaps.

## Assertions

**Vitest patterns:**
```typescript
expect(res.status).toBe(200)
expect(mockFn).toHaveBeenCalledWith(expect.objectContaining({ grade: '8' }))
expect(mockFn).toHaveBeenCalledOnce()
expect(mockFn).not.toHaveBeenCalled()
expect(result).toMatchObject({ listings: expect.any(Array), total: 42 })
expect(key).toMatch(/^listing-123\/[0-9a-f-]{36}\.jpg$/)
```

**Error/throw assertions:**
```typescript
await expect(createCheckoutSession(id)).rejects.toThrow('NEXT_REDIRECT: /login')
await expect(fn()).rejects.toThrow('Listing not available')
```

**Playwright patterns:**
```typescript
await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible()
await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10000 })
```

## Coverage

**Requirements:** No coverage thresholds enforced in `vitest.config.ts`.

**View coverage:**
```bash
npx vitest run --coverage
```

## Fixtures and Factories

**No shared fixture files.** Test data is declared inline within each test or `beforeEach`. UUIDs use realistic-looking strings (e.g., `'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'`) and email addresses use `test-${Date.now()}@example.com` for uniqueness in E2E tests.

---

*Testing analysis: 2026-04-01*
