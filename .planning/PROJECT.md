# Coast

## What This Is

Coast is a wholesale car marketplace where admin-onboarded wholesale partners list vehicles and the general public can browse, purchase, and complete all transaction paperwork online. The platform handles the full purchase lifecycle — from listing discovery through Stripe payment and digital document signing — with a car grading system scaffolded for future AI-powered condition rating.

## Core Value

A buyer can find, purchase, and fully complete paperwork for a wholesale vehicle entirely online — no offline steps required.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Wholesalers can list cars with full details, photos, condition notes, and documents
- [ ] General public can browse, search, and filter car listings
- [ ] Consumers can purchase a car via Stripe checkout on-platform
- [ ] All purchase paperwork (title transfer, purchase agreement) completed digitally with e-signing
- [ ] Admin can onboard and manage wholesale partner accounts
- [ ] Admin can manage orders and handle post-purchase issues
- [ ] Admin has an analytics dashboard (revenue, listings, user stats)
- [ ] Car grading system integration point scaffolded (images accepted, grade display placeholder)
- [ ] Beautiful, easy-to-use frontend

### Out of Scope

- AI-powered car grading — deferred to future milestone, scaffold only
- Wholesale self-signup — admin creates all wholesale accounts manually
- Dealer-specific tiers / B2B pricing — general public only for v1
- Mobile native app — web-first

## Context

- Stack: Next.js on Vercel, Supabase (auth + DB + storage)
- Two user roles: wholesale partners (admin-created) and consumers (self-signup)
- Admin role is a separate panel, not consumer-facing
- Car listings include: make, model, year, mileage, color, VIN, multiple photos, condition notes, and document uploads (Carfax, service history, title)
- Paperwork flow: purchase agreement and title transfer documents generated and signed digitally on-platform
- Car grading: image upload infrastructure should exist from day one (photos go to Supabase storage); grade display UI should have a placeholder state ready for the grading service to populate

## Constraints

- **Tech Stack**: Next.js + Vercel + Supabase — no deviation
- **Payments**: Stripe only
- **Wholesaler onboarding**: Admin-created accounts, no self-serve wholesale signup
- **Design**: High visual quality, clean UX — not a generic template look

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vercel + Supabase | Rapid deployment, managed auth/DB, great DX | — Pending |
| Admin-only wholesale onboarding | Quality control over who lists cars | — Pending |
| Full on-platform transaction | Better UX, trust, and platform revenue opportunity | — Pending |
| Scaffold grading system | Future AI feature — don't block v1 launch on it | — Pending |

---
*Last updated: 2026-03-09 after initialization*
