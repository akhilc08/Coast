# Requirements: Coast

**Defined:** 2026-03-09
**Core Value:** A buyer can find, purchase, and fully complete paperwork for a wholesale vehicle entirely online — no offline steps required.

## v1 Requirements

### Authentication

- [x] **AUTH-01**: Consumer can create an account with email and password
- [x] **AUTH-02**: Consumer receives email verification after signup and must verify before purchasing
- [x] **AUTH-03**: Consumer can reset password via email link
- [x] **AUTH-04**: Wholesaler can log in with admin-provided credentials
- [x] **AUTH-05**: User session persists across browser refresh

### Listings

- [x] **LIST-01**: Wholesaler can create a listing with core details (VIN, make, model, year, mileage, color, price, condition notes)
- [x] **LIST-02**: VIN auto-fill via NHTSA API populates vehicle details when VIN is entered
- [x] **LIST-03**: Wholesaler can upload multiple photos per listing
- [x] **LIST-04**: Wholesaler can upload documents to a listing (Carfax, service history, title)
- [x] **LIST-05**: Wholesaler can save a listing as draft before publishing
- [x] **LIST-06**: Wholesaler can edit and remove their own listings

### Storefront

- [x] **STOR-01**: Consumer can search listings by make, model, and year via full-text search
- [x] **STOR-02**: Consumer can filter listings by make, year range, price range, mileage range, and condition
- [x] **STOR-03**: Consumer can sort listings by price, mileage, and newest first
- [x] **STOR-04**: Consumer can browse a paginated listing grid
- [x] **STOR-05**: Consumer can view a vehicle detail page with full-screen lightbox photo gallery
- [x] **STOR-06**: Platform is fully mobile-responsive

### Purchase

- [x] **PURCH-01**: Consumer can purchase a vehicle via Stripe Checkout
- [x] **PURCH-02**: Listing is atomically marked as sold when payment completes (via Stripe webhook, not redirect)
- [x] **PURCH-03**: Consumer sees an order confirmation page after successful purchase
- [x] **PURCH-04**: Consumer can view their purchase history

### Documents

- [x] **DOC-01**: Purchase agreement PDF is generated server-side after payment completes
- [x] **DOC-02**: Title transfer document is generated server-side after payment completes
- [ ] **DOC-03**: Buyer receives e-signing request for both documents via Dropbox Sign
- [x] **DOC-04**: Buyer can access their signed documents from their account
- [x] **DOC-05**: Document completion status is tracked per order (pending → signed → delivered)

### Notifications

- [x] **NOTF-01**: Buyer receives order confirmation email after payment
- [x] **NOTF-02**: Admin receives order alert email when a sale occurs
- [x] **NOTF-03**: Buyer receives document signing request email (via Dropbox Sign)
- [x] **NOTF-04**: Buyer receives completed document delivery email (via Dropbox Sign)

### Admin

- [ ] **ADMIN-01**: Admin can create wholesale partner accounts (set email, password, role)
- [ ] **ADMIN-02**: Admin can view and disable user accounts
- [ ] **ADMIN-03**: Admin can view all listings with status filter (draft, active, sold)
- [ ] **ADMIN-04**: Admin can view all orders with status filter
- [ ] **ADMIN-05**: Admin can view an analytics dashboard showing revenue, listing count, and order count

### Grading Scaffold

- [x] **GRADE-01**: Car photos are stored in Supabase Storage and served with optimized delivery
- [x] **GRADE-02**: Vehicle detail page shows a "Grade Pending" placeholder where the condition grade will display
- [x] **GRADE-03**: Listings table includes grade, grade_source, and graded_at columns (nullable)
- [ ] **GRADE-04**: /api/grading/callback endpoint is scaffolded and ready to receive grade results from future AI service

## v2 Requirements

### Grading

- **GRADE-AI-01**: AI-powered car condition grading from uploaded photos
- **GRADE-AI-02**: Automatic grade assignment updates listing display

### Engagement

- **ENG-01**: Consumer can save searches and receive alerts when matching listings are added
- **ENG-02**: Wholesaler can view their own sales performance metrics

### Notifications

- **NOTF-05**: SMS notifications for order and document events

## Out of Scope

| Feature | Reason |
|---------|--------|
| AI car grading | Complex ML infrastructure; scaffold only in v1 |
| Wholesale self-signup | Admin creates all wholesale accounts — quality control |
| B2B / dealer pricing tiers | General public only for v1 |
| In-platform messaging / chat | Email/phone for pre-purchase questions; moderation burden |
| Auction / bidding flow | Fixed-price buy-now only |
| Mobile native app | Responsive web is sufficient for v1 |
| Financing / loan origination | Buyers arrange own financing externally |
| Trade-in valuation | Sell-side focused marketplace |
| DMS integration (CDK, Reynolds) | Manual listing creation in v1 |
| Price negotiation | Fixed list price; wholesaler edits directly |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| GRADE-03 | Phase 1 | Complete |
| LIST-01 | Phase 2 | Complete |
| LIST-02 | Phase 2 | Complete |
| LIST-03 | Phase 2 | Complete |
| LIST-04 | Phase 2 | Complete |
| LIST-05 | Phase 2 | Complete |
| LIST-06 | Phase 2 | Complete |
| STOR-01 | Phase 2 | Complete |
| STOR-02 | Phase 2 | Complete |
| STOR-03 | Phase 2 | Complete |
| STOR-04 | Phase 2 | Complete |
| STOR-05 | Phase 2 | Complete |
| STOR-06 | Phase 2 | Complete |
| GRADE-01 | Phase 2 | Complete |
| GRADE-02 | Phase 2 | Complete |
| PURCH-01 | Phase 3 | Complete |
| PURCH-02 | Phase 3 | Complete |
| PURCH-03 | Phase 3 | Complete |
| PURCH-04 | Phase 3 | Complete |
| DOC-01 | Phase 3 | Complete |
| DOC-02 | Phase 3 | Complete |
| DOC-03 | Phase 3 | Pending |
| DOC-04 | Phase 3 | Complete |
| DOC-05 | Phase 3 | Complete |
| NOTF-01 | Phase 3 | Complete |
| NOTF-02 | Phase 3 | Complete |
| NOTF-03 | Phase 3 | Complete |
| NOTF-04 | Phase 3 | Complete |
| ADMIN-01 | Phase 4 | Pending |
| ADMIN-02 | Phase 4 | Pending |
| ADMIN-03 | Phase 4 | Pending |
| ADMIN-04 | Phase 4 | Pending |
| ADMIN-05 | Phase 4 | Pending |
| GRADE-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 39 total
- Mapped to phases: 39
- Unmapped: 0

---
*Requirements defined: 2026-03-09*
*Last updated: 2026-03-09 — traceability updated after roadmap creation (4-phase coarse structure)*
