# Coding Conventions

**Analysis Date:** 2026-04-01

## Naming Patterns

**Files:**
- React components: PascalCase `.tsx` — `ListingCard.tsx`, `BuyNowButton.tsx`, `ListingWizard.tsx`
- Server actions: camelCase `.ts` in `app/actions/` — `listings.ts`, `checkout.ts`, `orders.ts`
- Route handlers: `route.ts` inside named `app/api/` segments
- Library modules: camelCase `.ts` — `storage.ts`, `fulfillment.ts`, `nhtsa.ts`
- Validation schemas: camelCase `.ts` in `lib/validations/` — `listing.ts`, `auth.ts`, `review.ts`
- Query files: camelCase `.ts` in `lib/queries/` — `listings.ts`, `reviews.ts`
- Utility functions: camelCase `.ts` in `lib/utils/` — `formatBuyerName.ts`
- Type files: camelCase `.ts` in `lib/types/` — `condition.ts`

**Functions:**
- Exported server actions: `verbNounAction` pattern — `createDraftAction`, `updateListingAction`, `publishListingAction`
- Exported query functions: `getResource` pattern — `getListings`, `getReviews`
- Exported React components: PascalCase named exports — `export function ListingCard(...)`
- Private internal helpers: underscore prefix — `_generateDocuments`
- Event handlers: inline arrow functions or named `handleX` conventions

**Variables:**
- camelCase throughout — `listingId`, `mockGetUser`, `mockSessionsCreate`
- Database field names use snake_case as-is from Supabase (not remapped) — `price_cents`, `seller_id`, `created_at`
- Boolean flags: `has` prefix — `hasNotes`, `has_accident_history`, `has_flood_damage`

**Types/Interfaces:**
- PascalCase with `interface` for component props — `ListingCardProps`, `ListingWizardProps`
- PascalCase with `type` for inferred Zod types — `VinStepInput`, `DetailsStepInput`, `ConditionStepInput`
- PascalCase for exported interfaces — `ListingFilters`, `VehicleDetails`
- Zod schemas: camelCase with `Schema` suffix — `vinStepSchema`, `detailsStepSchema`, `conditionStepSchema`

**Constants:**
- SCREAMING_SNAKE_CASE for module-level constants — `PAGE_SIZE`

## Code Style

**Formatting tool:** Prettier 3.x

**Key settings** (`prettier.config.js`):
- `semi: false` — no semicolons
- `singleQuote: true` — single quotes for strings
- `trailingComma: 'es5'` — trailing commas where valid in ES5 (objects, arrays; not function parameters)
- `plugins: ['prettier-plugin-tailwindcss']` — Tailwind class sorting enforced

**Linting tool:** ESLint 9.x with `eslint-config-next`

No custom `.eslintrc` — uses Next.js default config via `eslint-config-next`.

## TypeScript Patterns

**Strict typing:**
- All public function parameters and return types are typed
- Server actions return union types: `Promise<{ id: string } | { error: string }>` or `Promise<{ success: true } | { error: string }>`
- Zod schemas generate exported TypeScript types via `z.infer<typeof schema>`
- Inline `as` casts used for Stripe event objects where SDK types are narrow

**Imports:**
- `type` keyword used for type-only imports — `import type { DetailsStepInput } from '@/lib/validations/listing'`
- `import * as React from 'react'` used in non-JSX server-side files (e.g., `fulfillment.ts`)

**Path Aliases:**
- `@/` maps to project root — `@/lib/supabase/server`, `@/app/actions/checkout`, `@/components/ui/button`

## Import Organization

**Order convention (observed):**
1. Framework imports — `'use server'` / `'use client'` directive first
2. Next.js imports — `next/cache`, `next/server`, `next/navigation`
3. Third-party library imports — `stripe`, `react-hook-form`, `zod`
4. Internal `@/lib/` imports — supabase clients, validations, queries
5. Internal `@/components/` imports
6. Relative imports — `./steps`, `./WizardProgress`

## Directives

**Server components (default):** No directive needed; pages and layouts are RSC by default.

**Client components:** `'use client'` at top of file — `ListingWizard.tsx`, `storage.ts` (uses browser Supabase client).

**Server actions:** `'use server'` at top of file — all files in `app/actions/`.

## Error Handling

**Server actions:** Return discriminated union objects, never throw:
```typescript
// Success
return { id: data.id }
// Error
return { error: error.message }
// Typed return
Promise<{ success: true } | { error: string }>
```

**Route handlers:** Return `new Response(...)` with explicit status codes:
```typescript
return new Response('Webhook signature verification failed', { status: 400 })
return new Response(JSON.stringify({ listing_id }), { status: 200 })
```

**Next.js redirect:** `redirect()` from `next/navigation` throws `NEXT_REDIRECT` — callers must be aware this halts execution.

**Async operations:** `Promise.allSettled` for parallel operations where partial failure is acceptable (e.g., `fulfillment.ts` runs document gen and transport dispatch in parallel).

**Database errors:** Check `if (error || !data)` pattern immediately after Supabase queries; use early returns.

## Logging

**Approach:** `console.error` only; no structured logging library.

**Pattern:** Tagged with module context in brackets:
```typescript
console.error('[fulfillment] Document pipeline failed for order', orderId, reason)
console.error('[fulfillment] Failed to fetch order', orderId, orderError)
```

**When to log:** Errors and unexpected states in server-side async pipelines. No logging in route handlers (rely on status codes).

## Comments

**JSDoc/TSDoc:** Block comments on complex server-side functions explaining intent, critical behavior, and step-by-step logic:
```typescript
/**
 * Post-payment pipeline orchestrator.
 *
 * Called asynchronously (fire-and-forget) from the Stripe webhook via after().
 * Runs document generation and transport dispatch in parallel via Promise.allSettled
 * so a dispatch failure never blocks documents (and vice versa).
 */
```

**Inline comments:** Used to explain non-obvious decisions (e.g., why `request.text()` is used instead of `request.json()` for Stripe webhook, why `vi.resetModules()` is needed between idempotency test cases).

**Step comments:** Long async functions use `// --- Step N: Description ---` markers to orient readers:
```typescript
// --- Step 1: Fetch order data ---
// --- Step 2: Generate PDFs ---
```

**Test comments:** Requirement codes (e.g., `// AUTH-01:`, `// STOR-01:`) used to link tests to spec identifiers.

## Validation

**Library:** Zod 4.x — all input schemas defined in `lib/validations/`.

**Pattern:** Define schema → export inferred type:
```typescript
export const detailsStepSchema = z.object({ ... })
export type DetailsStepInput = z.infer<typeof detailsStepSchema>
```

**Form integration:** `react-hook-form` + `@hookform/resolvers` with Zod resolver for client-side forms.

**Boundary enforcement:** Validation at system entry points (API routes, server actions) — not assumed to be pre-validated in internal functions.

## Supabase Query Style

**Alignment:** Named fields in `.insert({})` and `.update({})` calls use aligned spacing for readability:
```typescript
.insert({
  seller_id:   user.id,
  vin,
  status:      'draft',
  price_cents: 0,
})
```

**Client selection:** Three distinct clients — `@/lib/supabase/server` (RSC/actions), `@/lib/supabase/browser` (client components), `@/lib/supabase/admin` (service role for privileged ops).

## Module Design

**Exports:** Named exports only — no default exports anywhere in the codebase.

**Barrel files:** Used in `lib/transport/index.ts` to re-export transport provider. Not used broadly across all `lib/` or `components/`.

**Singleton patterns:** External SDK clients instantiated once per module — `lib/stripe.ts`, `lib/resend.ts`, `lib/dropboxsign.ts`.

---

*Convention analysis: 2026-04-01*
