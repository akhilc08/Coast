# Roadmap: Coast

## Overview

Coast builds from the ground up in four phases. Phase 1 establishes the auth and schema foundation that every other feature depends on. Phase 2 creates the producer side — wholesalers can list vehicles with photos and documents. Phase 3 delivers the full consumer transaction: browsing, purchase via Stripe, and digital document signing. Phase 4 completes the platform with the admin panel and the grading scaffold callback endpoint, making Coast ready to activate AI-powered grading without any further infrastructure work.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Auth, roles, database schema, and storage architecture
- [ ] **Phase 2: Inventory** - Wholesaler listing management and public storefront
- [ ] **Phase 3: Transactions** - Purchase flow, document pipeline, and notifications
- [ ] **Phase 4: Admin and Grading Scaffold** - Admin panel and grading callback activation

## Phase Details

### Phase 1: Foundation
**Goal**: The three-role auth system, complete database schema with RLS, and storage buckets are operational — every subsequent feature can be built on a stable, secure base.
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, GRADE-03
**Success Criteria** (what must be TRUE):
  1. A consumer can create an account, verify their email, and log in — session persists across browser refresh
  2. A consumer can reset a forgotten password via email link
  3. A wholesaler can log in with admin-provided credentials and access the seller portal
  4. All three roles (consumer, wholesaler, admin) are enforced at the database layer via RLS — no cross-role data access is possible
  5. Storage buckets exist with correct public/private configuration and the listings schema includes grade scaffold columns
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Project scaffold: Next.js 15, Supabase clients, middleware, Zod schemas, Wave 0 tests
- [ ] 01-02-PLAN.md — Database migrations: full schema with RLS, Custom Access Token Hook, storage buckets
- [ ] 01-03-PLAN.md — Auth UI: signup, login, password reset, email verification, home page placeholder

### Phase 2: Inventory
**Goal**: Wholesalers can create and manage fully-detailed vehicle listings, and consumers can browse, search, and view those listings on a polished storefront.
**Depends on**: Phase 1
**Requirements**: LIST-01, LIST-02, LIST-03, LIST-04, LIST-05, LIST-06, STOR-01, STOR-02, STOR-03, STOR-04, STOR-05, STOR-06, GRADE-01, GRADE-02
**Success Criteria** (what must be TRUE):
  1. A wholesaler can create a listing with full vehicle details (VIN auto-filled from NHTSA), upload multiple photos and documents, save as draft, publish, edit, and remove it
  2. Vehicle photos are stored in Supabase Storage and served via CDN; the vehicle detail page shows a "Grade Pending" placeholder where the condition grade will appear
  3. A consumer can search listings by make, model, and year; filter by make, year range, price range, mileage range, and condition; sort by price, mileage, and newest; and paginate through results
  4. A consumer can view a vehicle detail page with a full-screen lightbox photo gallery and access uploaded documents
  5. The storefront is fully usable on mobile devices
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md — Foundation: install packages, FTS migration, NuqsAdapter, middleware role check, Wave 0 test stubs
- [ ] 02-02-PLAN.md — Wholesaler: listing creation wizard (VIN lookup, photos, documents), seller dashboard, Server Actions
- [ ] 02-03-PLAN.md — Consumer storefront: search/filter grid, listing cards, vehicle detail page with lightbox gallery

### Phase 3: Transactions
**Goal**: A consumer can purchase a vehicle via Stripe, receive all legally required documents for e-signing, and track order and document status entirely within the platform.
**Depends on**: Phase 2
**Requirements**: PURCH-01, PURCH-02, PURCH-03, PURCH-04, DOC-01, DOC-02, DOC-03, DOC-04, DOC-05, NOTF-01, NOTF-02, NOTF-03, NOTF-04
**Success Criteria** (what must be TRUE):
  1. A consumer can initiate Stripe Checkout from a vehicle detail page; the listing is atomically marked sold via webhook (not redirect) when payment completes
  2. A consumer sees an order confirmation page and receives a confirmation email after successful purchase; admin receives an order alert email
  3. Purchase agreement and title transfer PDFs are generated server-side and sent to the buyer for e-signing via Dropbox Sign — the buyer receives a signing request email and a completed documents email
  4. A consumer can view their purchase history and access their signed documents from their account
  5. Each order has a tracked document status (pending signing → signed → delivered) visible in the buyer's account
**Plans**: TBD

### Phase 4: Admin and Grading Scaffold
**Goal**: Admin can fully manage the platform — creating wholesaler accounts, monitoring all listings and orders, and viewing analytics — while the grading scaffold is complete and ready to receive AI grades.
**Depends on**: Phase 3
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, GRADE-04
**Success Criteria** (what must be TRUE):
  1. Admin can create wholesale partner accounts (set email, password, role) and view or disable any user account
  2. Admin can view all listings with status filter (draft, active, sold) and all orders with status filter
  3. Admin can view an analytics dashboard showing total revenue, listing count, and order count
  4. The /api/grading/callback endpoint is deployed, validates an API key, and writes a grade to the listing — the vehicle detail page displays the real grade when populated
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 1/3 | In Progress|  |
| 2. Inventory | 0/TBD | Not started | - |
| 3. Transactions | 0/TBD | Not started | - |
| 4. Admin and Grading Scaffold | 0/TBD | Not started | - |
