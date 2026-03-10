# Feature Landscape

**Domain:** Wholesale car marketplace with full on-platform transaction lifecycle
**Researched:** 2026-03-09
**Confidence:** MEDIUM — Based on domain knowledge of comparable platforms (Carvana, Vroom, ADESA Digital, TradeRev, OVE). Web search unavailable; no Context7 queries applicable to business features. Flag for validation against specific competitors.

---

## Table Stakes

Features users expect. Missing = product feels incomplete or untrustworthy.

### Listing Management (Wholesaler-Facing)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Multi-photo upload with preview | Every car marketplace shows photos; no photos = no trust | Med | Supabase Storage + image ordering UX |
| Core vehicle data fields | VIN, year, make, model, mileage, color — bare minimum for any listing | Low | VIN decode API saves wholesaler time |
| Condition notes / description | Buyers need to know what they're buying without seeing the car | Low | Rich text or structured fields |
| Document upload (Carfax, title, service history) | Wholesale buyers expect proof of history | Med | Supabase Storage, PDF support required |
| Draft / publish workflow | Wholesalers need to stage listings before going live | Med | Status: draft → active → sold |
| Edit and remove listings | Basic CRUD — wholesalers need to update price or pull a unit | Low | Soft-delete preferred (preserve order history) |
| Per-listing asking price | No price = no purchase flow | Low | — |

### Search and Discovery (Consumer-Facing)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Full-text search by make/model/year | Users expect a search bar | Med | Supabase full-text search or ilike queries |
| Faceted filters (make, year range, price range, mileage range) | Standard on every car site; missing feels broken | Med | URL-serialized state for shareability |
| Sorted results (price, mileage, newest) | Comparison shopping requires ordering | Low | — |
| Paginated or infinite scroll listing grid | Performance — don't load 500 cars at once | Low | — |
| Vehicle detail page with photo gallery | Buyers need a full view before committing | Med | Lightbox, full-size photo access |
| Mobile-responsive layout | Half of consumer web traffic is mobile | High | Not a native app, but responsive web is non-negotiable |
| VIN displayed on listing | Required for buyer due diligence | Low | — |

### Buyer Purchase Flow

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Stripe checkout integration | Platform promise: buy online, fully | High | Stripe Payment Intents or Checkout Session |
| Order confirmation page and email | Buyers expect immediate confirmation | Med | Supabase triggers or server-side post-payment hook |
| Order status visibility | Buyer needs to know where their purchase stands | Med | Status: pending → paid → documents sent → complete |
| Listing auto-marked sold on purchase | Prevent double-selling the same car | High | Atomic transaction or Stripe webhook → DB update |
| Purchase history for buyer account | Buyers expect to review past purchases | Low | — |

### Authentication and Accounts

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Consumer self-signup (email + password) | Must be self-serve for public buyers | Low | Supabase Auth |
| Email verification | Prevents fake accounts, required before purchase | Low | Supabase built-in |
| Password reset | Baseline account management | Low | Supabase built-in |
| Role-based access (consumer, wholesaler, admin) | Three distinct actors with different permissions | Med | Supabase RLS + role column on profiles table |
| Wholesaler login (admin-created accounts) | Wholesalers need access to their listing dashboard | Low | Supabase Auth, credentials issued by admin |

### Admin Panel

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Wholesale partner account creation | Core onboarding — no self-serve signup per requirements | Low | Admin creates user, sets role |
| User management (view, disable, delete) | Admin must be able to remove bad actors | Med | — |
| All-listings view with status filter | Admin oversight of inventory | Low | — |
| All-orders view with status filter | Admin manages post-purchase issues | Med | — |
| Analytics dashboard (revenue, listing count, order count) | Required per PROJECT.md | Med | Aggregate queries, not real-time streaming |

### Document / Title Handling

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Purchase agreement generation | Legal record of sale — cannot be skipped for a vehicle transaction | High | PDF generation (server-side) from order data |
| E-signature collection on purchase agreement | PROJECT.md requires fully digital paperwork | High | DocuSign, Hellosign (Dropbox Sign), or Adobe Sign API |
| Title transfer document generation | Required for vehicle ownership change | High | State-specific forms are complex; consider PDF template approach |
| Buyer access to signed documents | Buyers need copies | Med | Supabase Storage link, emailed copy |
| Document status tracking | Admin needs to know which orders have complete paperwork | Med | Status column per document type |

### Notifications

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Order confirmation email to buyer | Expected immediately after payment | Med | Transactional email (Resend, SendGrid, or Postmark) |
| Order notification email to admin | Admin must know when a sale occurs | Low | Same transactional email system |
| Document signing request email to buyer | E-sign flow requires email delivery | Med | Handled by e-sign provider |
| Signed document delivery email to buyer | Buyer keeps a copy | Low | Handled by e-sign provider |

---

## Differentiators

Features that set Coast apart. Not universally expected, but create competitive advantage.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Car grading system (scaffolded) | AI condition rating builds buyer trust beyond photos alone | High | Scaffold only in v1 — image upload exists, grade UI has placeholder; full AI deferred |
| Condition grade display on listing | Standardized grading reduces ambiguity vs free-text condition notes | Med | Requires grading service integration point; show "Grade Pending" in v1 |
| VIN decode auto-fill | Reduces wholesaler data entry friction, improves accuracy | Med | NHTSA free VIN decode API or paid service like Marketcheck |
| High-quality photo presentation | Wholesale car sites often look like Craigslist; polished gallery = trust signal | Med | Lightbox, multiple angles, zoom |
| Full online title/document handling | Most wholesale channels still require offline paperwork; full digital is a differentiator | High | This is the core Coast promise |
| Saved searches / watchlists | Repeat buyers come back when inventory matches their criteria | Med | Defer to post-v1 |
| Wholesaler performance metrics | Show wholesaler their own sales data — builds stickiness | Med | Defer to post-v1 |
| Instant price negotiation or offer system | Some buyers want to negotiate rather than pay list | High | Explicitly out of scope for v1 |

---

## Anti-Features

Features to explicitly NOT build in v1.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| AI-powered car grading | Complex ML infrastructure; blocks launch unnecessarily | Scaffold image upload + grade placeholder; integrate grading service post-v1 |
| Wholesale self-signup | Quality control is the admin's job; bad actors destroy trust on a marketplace | Admin creates all wholesale accounts manually |
| B2B / dealer pricing tiers | Adds role complexity, pricing logic, and negotiation flows | General public only in v1; dealer tiers can be a future pricing model |
| In-platform messaging / chat | High development cost, moderation burden | Use email/phone for pre-purchase questions in v1 |
| Auction / bidding flow | Complex time-bound state machine, high fraud risk | Fixed-price buy-now only |
| Mobile native app (iOS/Android) | Web-first is sufficient for v1 validation | Responsive web; revisit if mobile traffic demands it |
| Financing / loan origination | Lending compliance is a different product entirely | Buyers arrange their own financing externally |
| Trade-in valuation | Adds complexity; wholesale channel is sell-side focused | Out of scope for v1 |
| Inventory integration with dealer DMS | Complex enterprise integrations (CDK, Reynolds & Reynolds) | Manual listing creation by wholesaler |
| Real-time price negotiation | Auction-like complexity without the auction infrastructure | Fixed list price; wholesaler edits price directly if needed |
| Public API / webhooks for wholesalers | Premature abstraction before wholesaler workflows are validated | Internal tooling only for v1 |

---

## Feature Dependencies

```
Consumer self-signup → Purchase flow
Wholesaler account (admin-created) → Listing management
Listing management → Search and discovery
Listing management → Vehicle detail page
Stripe checkout → Order creation
Order creation → Purchase agreement generation
Purchase agreement generation → E-signature collection
E-signature collection → Document delivery to buyer
Listing auto-marked sold → Stripe webhook → DB update (atomic)
Car grading scaffold → Image upload (day one) → Grade display placeholder
Admin analytics → Orders table + Listings table + Users table
```

---

## MVP Recommendation

Prioritize in this order:

1. **Wholesaler listing management** — Nothing else works without inventory
2. **Consumer search, filter, and listing detail** — Buyers must be able to find cars
3. **Stripe payment flow with listing lock-on-purchase** — The core transaction
4. **Purchase agreement + e-signature** — Required for a legal vehicle sale; Coast's core promise
5. **Order status visibility (buyer + admin)** — Trust requires transparency
6. **Admin: wholesale account creation, order management, analytics** — Operations backbone
7. **Car grading scaffold** — Image upload + placeholder grade UI (defer AI integration)

**Defer to post-v1:**
- Saved searches / watchlists: nice for retention, not needed for first sale
- Wholesaler performance metrics: valuable but not launch-blocking
- VIN decode auto-fill: wholesalers can enter data manually in v1
- Notifications beyond email confirmation: SMS, push, etc.

---

## Complexity Notes

**High complexity items that need careful phase planning:**

- **E-signature integration** — Third-party API (Dropbox Sign recommended; DocuSign is enterprise-priced), webhook handling for signature events, PDF generation before signing, document storage after signing. This is the highest-risk feature.
- **Listing auto-marked sold on payment** — Race condition risk if two buyers reach checkout simultaneously. Must use Stripe webhook + DB transaction, not optimistic UI. Requires careful architecture.
- **Title transfer documents** — State-specific legal forms. Consider starting with a generic bill of sale / purchase agreement and flagging title transfer as a separate admin-managed step.
- **Stripe integration end-to-end** — Payment Intents, webhook verification, idempotency keys, refund handling for admin, test mode vs live mode configuration. Medium-high complexity but well-documented.
- **Role-based access with Supabase RLS** — Three roles (consumer, wholesaler, admin) across multiple tables. RLS policies must be written carefully to prevent data leakage (e.g., consumers cannot see other consumers' orders).

---

## Sources

- Domain knowledge: Comparable platforms — Carvana, Vroom (B2C); ADESA Digital/OVE, TradeRev (wholesale auction); Cars & Bids, Bring a Trailer (enthusiast marketplace)
- Project requirements: `/Users/sickle/Coding/Coast/.planning/PROJECT.md`
- Confidence: MEDIUM — Web search unavailable; findings based on training knowledge of automotive marketplace domain. Recommend validating against current competitor feature sets before finalizing phase scope.
