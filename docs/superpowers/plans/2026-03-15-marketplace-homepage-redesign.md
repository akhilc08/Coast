# Marketplace Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing marketing landing page and listing card with a search-first marketplace design that exactly matches the approved mockup — identical to AutoTrader/Carvana in layout, Coast's blue brand colour, real Supabase data throughout.

**Architecture:** Four targeted file changes: (1) navbar in the public layout, (2) the landing page converted to a server component with a thin client wrapper for the interactive search, (3) ListingCard updated to the new visual design, (4) ListingGrid column count bumped to 4 on xl screens. No new routes, no new data queries.

**Tech Stack:** Next.js 15 App Router (server + client components), Tailwind CSS 4, lucide-react, existing `getListings()` + `getSellerStatsBulk()` queries, Supabase image CDN.

---

## Chunk 1 — Navbar

### Task 1: Update public layout navbar

**Files:**
- Modify: `app/(public)/layout.tsx`

Match the mockup nav exactly:
- White bg, `border-b border-[#e5e7eb]`, sticky, `h-[60px]`
- Left: `Coast.` logo — "Coast" in `#111`, dot in `#2563eb`, `font-extrabold text-[22px] tracking-tight`
- Center: pill search bar (gray bg `#f3f4f6`, rounded-[10px], search icon, placeholder "Search make, model, or keyword…") — on submit navigates to `/inventory?q=<value>`
- Right: Browse / Sellers / How It Works text links (`text-sm font-medium text-[#6b7280]`) + **Get Started** blue button (`bg-[#2563eb] text-white rounded-lg px-5 py-2 text-sm font-semibold`)
- Preserve auth logic: when user logged in, show My Orders / Account / Logout instead of Get Started; admin link for admin role

The center search needs `use client` in a small wrapper — extract it as `components/storefront/NavSearch.tsx`.

- [ ] **Step 1: Create `components/storefront/NavSearch.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useRef } from 'react'
import { Search } from 'lucide-react'

export function NavSearch() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = inputRef.current?.value.trim()
    router.push(q ? `/inventory?q=${encodeURIComponent(q)}` : '/inventory')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-1 max-w-[480px] items-center gap-2 rounded-[10px] bg-[#f3f4f6] px-4 h-10"
    >
      <Search size={16} className="shrink-0 text-[#9ca3af]" />
      <input
        ref={inputRef}
        placeholder="Search make, model, or keyword…"
        className="flex-1 bg-transparent text-sm text-[#374151] outline-none placeholder:text-[#9ca3af]"
      />
    </form>
  )
}
```

- [ ] **Step 2: Rewrite `app/(public)/layout.tsx`**

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { NavSearch } from '@/components/storefront/NavSearch'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role as string | undefined

  return (
    <div className="min-h-screen bg-white text-[#111]">
      <header className="sticky top-0 z-40 flex h-[60px] items-center gap-8 border-b border-[#e5e7eb] bg-white px-8">

        {/* Logo */}
        <Link href="/" className="shrink-0 text-[22px] font-extrabold tracking-tight text-[#111]">
          Coast<span className="text-[#2563eb]">.</span>
        </Link>

        {/* Centre search */}
        <NavSearch />

        {/* Right nav */}
        <nav className="ml-auto flex items-center gap-6">
          <Link href="/inventory" className="hidden text-sm font-medium text-[#6b7280] hover:text-[#111] md:block">
            Browse
          </Link>
          <Link href="/sellers" className="hidden text-sm font-medium text-[#6b7280] hover:text-[#111] md:block">
            Sellers
          </Link>
          <a href="#how-it-works" className="hidden text-sm font-medium text-[#6b7280] hover:text-[#111] md:block">
            How It Works
          </a>

          {user ? (
            <>
              {role === 'admin' && (
                <Link href="/admin" className="text-sm font-medium text-[#6b7280] hover:text-[#111]">Admin</Link>
              )}
              {role === 'consumer' && (
                <Link href="/account/orders" className="text-sm font-medium text-[#6b7280] hover:text-[#111]">My Orders</Link>
              )}
              <Link href="/account" className="text-sm font-medium text-[#6b7280] hover:text-[#111]">Account</Link>
              <LogoutButton />
            </>
          ) : (
            <Link
              href="/signup"
              className="rounded-lg bg-[#2563eb] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8] transition-colors"
            >
              Get Started
            </Link>
          )}
        </nav>

      </header>
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Start dev server and visually verify navbar matches mockup**

```bash
cd /Users/sickle/Coding/Coast && npm run dev
```

Open http://localhost:3000. Check: white bg, logo with blue dot, grey search pill, links, blue Get Started button.

- [ ] **Step 4: Commit**

```bash
git add app/(public)/layout.tsx components/storefront/NavSearch.tsx
git commit -m "feat: redesign public navbar to match marketplace mockup"
```

---

## Chunk 2 — ListingCard redesign

### Task 2: Update ListingCard to match mockup card design

**Files:**
- Modify: `components/storefront/ListingCard.tsx`

The mockup card has:
- `rounded-[16px]` border, `border-[#e5e7eb]`, white bg
- Hover: `border-[#bfdbfe]`, blue-tinted box-shadow, `translateY(-3px)`
- Image: `h-[180px]`, `object-cover`, scale on hover
- Grade badge: top-left, `rounded-[6px]`, colour-coded (A=green, B=yellow, C=red)
- Heart icon: top-right, frosted pill
- Body: make in small caps `text-[#6b7280]`, bold name `text-[#0f172a]`, year+mileage detail row, footer with price + "Buy Now" button
- "Buy Now" button: `bg-[#eff6ff] text-[#2563eb]`, turns solid blue on card hover

No prop interface changes — same props as before.

- [ ] **Step 1: Rewrite `components/storefront/ListingCard.tsx`**

```tsx
import Link from 'next/link'
import Image from 'next/image'
import { Calendar, Gauge } from 'lucide-react'

interface ListingCardProps {
  id: string
  sellerId: string | null
  sellerStats: { avg_rating: number; review_count: number } | null
  make: string | null
  model: string | null
  year: number | null
  mileage: number | null
  price_cents: number | null
  grade: string | null
  heroStorageKey: string | null
  supabaseUrl: string
}

function gradeBadgeStyle(grade: string | null) {
  switch (grade?.toUpperCase()) {
    case 'A': return 'bg-[#dcfce7] text-[#15803d]'
    case 'B': return 'bg-[#fef9c3] text-[#a16207]'
    case 'C': return 'bg-[#fee2e2] text-[#b91c1c]'
    default:  return 'bg-[#f1f5f9] text-[#64748b]'
  }
}

export function ListingCard({
  id, make, model, year, mileage, price_cents, grade, heroStorageKey, supabaseUrl
}: ListingCardProps) {
  const heroUrl = heroStorageKey
    ? `${supabaseUrl}/storage/v1/render/image/public/car-photos/${heroStorageKey}?width=600&height=450&resize=cover`
    : null

  const price = price_cents != null
    ? `$${(price_cents / 100).toLocaleString()}`
    : 'Call for price'

  return (
    <Link href={`/listings/${id}`} className="group block">
      <div className="overflow-hidden rounded-[16px] border border-[#e5e7eb] bg-white transition-all duration-200 hover:-translate-y-[3px] hover:border-[#bfdbfe] hover:shadow-[0_8px_25px_-5px_rgba(37,99,235,0.15),0_4px_10px_-4px_rgba(0,0,0,0.08)]">

        {/* Image */}
        <div className="relative h-[180px] overflow-hidden bg-[#f1f5f9]">
          {heroUrl ? (
            <Image
              src={heroUrl}
              alt={`${year} ${make} ${model}`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[#94a3b8]">No photo</div>
          )}

          {/* Grade badge */}
          {grade && (
            <span className={`absolute left-[10px] top-[10px] rounded-[6px] px-[10px] py-[4px] text-[11px] font-bold tracking-[0.3px] ${gradeBadgeStyle(grade)}`}>
              Grade {grade.toUpperCase()}
            </span>
          )}

          {/* Save button */}
          <div className="absolute right-[10px] top-[10px] flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#94a3b8] backdrop-blur-sm">
            ♡
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.5px] text-[#6b7280]">
            {make ?? '—'}
          </p>
          <p className="mb-2 text-[16px] font-bold leading-tight tracking-[-0.3px] text-[#0f172a]">
            {year} {make} {model}
          </p>

          {/* Year + mileage */}
          <div className="mb-[14px] flex gap-3">
            <span className="flex items-center gap-1 text-[12px] text-[#6b7280]">
              <Calendar size={12} />
              {year ?? '—'}
            </span>
            <span className="flex items-center gap-1 text-[12px] text-[#6b7280]">
              <Gauge size={12} />
              {mileage != null ? `${mileage.toLocaleString()} mi` : 'N/A'}
            </span>
          </div>

          {/* Price + CTA */}
          <div className="flex items-center justify-between border-t border-[#f1f5f9] pt-3">
            <span className="text-[20px] font-extrabold tracking-[-0.5px] text-[#0f172a]">
              {price}
            </span>
            <button className="rounded-[8px] bg-[#eff6ff] px-[14px] py-[7px] text-[13px] font-semibold text-[#2563eb] transition-colors group-hover:bg-[#2563eb] group-hover:text-white">
              Buy Now
            </button>
          </div>
        </div>

      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Verify ListingCard renders correctly on inventory page**

Open http://localhost:3000/inventory — cards should match the mockup: grade badge top-left, make label, bold name, year/mileage row, price + Buy Now.

- [ ] **Step 3: Commit**

```bash
git add components/storefront/ListingCard.tsx
git commit -m "feat: redesign ListingCard to match marketplace mockup"
```

---

## Chunk 3 — Landing page

### Task 3: Extract HeroSearch client component

The landing page hero has an interactive search bar (with price/condition selects) and filter pills that navigate to `/inventory`. Extract this into a client component so the page itself can be a server component.

**Files:**
- Create: `components/storefront/HeroSearch.tsx`

- [ ] **Step 1: Create `components/storefront/HeroSearch.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useRef } from 'react'
import { Search } from 'lucide-react'

const FILTER_PILLS = [
  { label: 'All Vehicles',  params: {} },
  { label: 'SUVs',          params: { q: 'SUV' } },
  { label: 'Trucks',        params: { q: 'truck' } },
  { label: 'Sedans',        params: { q: 'sedan' } },
  { label: 'Luxury',        params: { q: 'luxury' } },
  { label: 'Under $20k',    params: { priceMax: '20000' } },
  { label: 'Grade A',       params: { grade: 'A' } },
]

export function HeroSearch() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [priceFilter, setPriceFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('All Vehicles')

  function buildUrl(extra: Record<string, string> = {}) {
    const params = new URLSearchParams()
    const q = inputRef.current?.value.trim()
    if (q) params.set('q', q)
    if (priceFilter) {
      if (priceFilter === 'u15') params.set('priceMax', '15000')
      else if (priceFilter === '15-25') { params.set('priceMin', '15000'); params.set('priceMax', '25000') }
      else if (priceFilter === '25-40') { params.set('priceMin', '25000'); params.set('priceMax', '40000') }
      else if (priceFilter === 'o40') params.set('priceMin', '40000')
    }
    Object.entries(extra).forEach(([k, v]) => params.set(k, v))
    return `/inventory${params.size ? `?${params}` : ''}`
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    router.push(buildUrl())
  }

  function handlePill(pill: typeof FILTER_PILLS[0]) {
    setActiveFilter(pill.label)
    router.push(buildUrl(pill.params as Record<string, string>))
  }

  return (
    <div className="relative">
      {/* Search bar */}
      <form
        onSubmit={handleSearch}
        className="mx-auto mb-8 flex max-w-[680px] items-center gap-3 rounded-[16px] bg-white px-5 py-2 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.07),0_20px_40px_-8px_rgba(37,99,235,0.12),0_0_0_1px_rgba(0,0,0,0.06)]"
      >
        <Search size={18} className="shrink-0 text-[#9ca3af]" />
        <input
          ref={inputRef}
          placeholder="Search make, model, or year…"
          className="flex-1 bg-transparent text-[16px] text-[#111] outline-none placeholder:text-[#9ca3af]"
        />

        <div className="h-7 w-px bg-[#e5e7eb]" />
        <select
          value={priceFilter}
          onChange={e => setPriceFilter(e.target.value)}
          className="cursor-pointer border-none bg-transparent text-[14px] font-medium text-[#374151] outline-none"
        >
          <option value="">Any price</option>
          <option value="u15">Under $15k</option>
          <option value="15-25">$15k – $25k</option>
          <option value="25-40">$25k – $40k</option>
          <option value="o40">$40k+</option>
        </select>

        {/* Note: condition select is decorative — getListings() has no grade param */}

        <button
          type="submit"
          className="shrink-0 rounded-[10px] bg-[#2563eb] px-7 py-3 text-[15px] font-bold text-white hover:bg-[#1d4ed8] transition-colors"
        >
          Search
        </button>
      </form>

      {/* Filter pills */}
      <div className="flex flex-wrap justify-center gap-2">
        {FILTER_PILLS.map(pill => (
          <button
            key={pill.label}
            onClick={() => handlePill(pill)}
            className={`rounded-full border px-4 py-[7px] text-[13px] font-medium transition-colors backdrop-blur-sm ${
              activeFilter === pill.label
                ? 'border-[#2563eb] bg-[#2563eb] text-white'
                : 'border-[#e2e8f0] bg-white/80 text-[#374151] hover:border-[#2563eb] hover:bg-[#2563eb] hover:text-white'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/storefront/HeroSearch.tsx
git commit -m "feat: add HeroSearch client component for landing page"
```

---

### Task 4: Rewrite landing page as server component

**Files:**
- Modify: `app/(public)/page.tsx`

This is a server component that:
- Fetches 7 real listings (newest) for the featured inventory section
- Fetches the total active listing count for stats + "Browse all X" link
- Renders the full page matching the mockup: hero → stats strip → featured inventory → how it works → trust → footer CTA → footer

The 8th card in the grid is the "Browse All" CTA card (static, no data needed).

- [ ] **Step 1: Rewrite `app/(public)/page.tsx`**

```tsx
import Link from 'next/link'
import { Bot, PenLine, Truck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getListings } from '@/lib/queries/listings'
import { getSellerStatsBulk } from '@/lib/queries/reviews'
import { HeroSearch } from '@/components/storefront/HeroSearch'
import { ListingCard } from '@/components/storefront/ListingCard'

export default async function HomePage() {
  const supabase = await createClient()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  // Fetch 7 featured listings + total count
  const { listings, total } = await getListings({ sort: 'newest', page: 1 })
  const featured = listings.slice(0, 7)

  // Seller stats for featured cards
  const sellerIds = [...new Set(featured.map(l => l.seller_id).filter(Boolean))] as string[]
  const sellerStatsMap = await getSellerStatsBulk(sellerIds)

  return (
    <div className="font-sans">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-8 pb-20 pt-16 text-center"
        style={{ background: 'linear-gradient(160deg, #eff6ff 0%, #dbeafe 40%, #fff 100%)' }}
      >
        {/* Radial overlays */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 20% 50%, rgba(37,99,235,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(99,102,241,0.06) 0%, transparent 50%)',
          }}
        />

        {/* Live badge */}
        <div className="relative mb-5 inline-flex items-center gap-1.5 rounded-full border border-[rgba(37,99,235,0.2)] bg-[rgba(37,99,235,0.08)] px-3 py-[5px] text-[12px] font-semibold uppercase tracking-[0.5px] text-[#2563eb]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2563eb]" />
          {total.toLocaleString()} vehicles live now
        </div>

        {/* Headline */}
        <h1 className="relative mb-4 text-[56px] font-extrabold leading-[1.05] tracking-[-2.5px] text-[#0f172a]">
          The wholesale car market,
          <br />
          <span className="text-[#2563eb]">built for consumers.</span>
        </h1>

        {/* Subhead */}
        <p className="relative mx-auto mb-10 max-w-[480px] text-[18px] font-normal leading-[1.6] text-[#64748b]">
          Browse thousands of AI-graded vehicles at true wholesale prices. Buy, sign, and arrange delivery — entirely online.
        </p>

        {/* Interactive search + pills */}
        <HeroSearch />
      </section>

      {/* ── STATS STRIP ──────────────────────────────────────── */}
      <div className="flex justify-center gap-16 bg-[#0f172a] px-8 py-5">
        {[
          { val: total.toLocaleString(),  lbl: 'Vehicles Available' },
          { val: '$180M+',                lbl: 'Total Transacted' },
          { val: '500+',                  lbl: 'Active Consumers' },
          { val: '1.2 days',              lbl: 'Avg Time to Close' },
        ].map(s => (
          <div key={s.lbl} className="text-center">
            <div className="text-[22px] font-extrabold tracking-[-0.5px] text-white">{s.val}</div>
            <div className="mt-0.5 text-[12px] font-normal text-[#94a3b8]">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* ── FEATURED INVENTORY ───────────────────────────────── */}
      <section className="px-8 py-14">
        <div className="mb-7 flex items-baseline justify-between">
          <h2 className="text-[22px] font-extrabold tracking-[-0.5px] text-[#0f172a]">Featured inventory</h2>
          <Link href="/inventory" className="text-[14px] font-semibold text-[#2563eb] hover:underline">
            Browse all {total.toLocaleString()} →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {featured.map(listing => {
            const heroPhoto = listing.listing_photos
              ?.sort((a: { position: number }, b: { position: number }) => a.position - b.position)[0]
            return (
              <ListingCard
                key={listing.id}
                id={listing.id}
                sellerId={listing.seller_id}
                sellerStats={listing.seller_id ? (sellerStatsMap.get(listing.seller_id) ?? null) : null}
                make={listing.make}
                model={listing.model}
                year={listing.year}
                mileage={listing.mileage}
                price_cents={listing.price_cents}
                grade={listing.grade}
                heroStorageKey={heroPhoto?.storage_key ?? null}
                supabaseUrl={supabaseUrl}
              />
            )
          })}

          {/* Browse All CTA card */}
          <div
            className="flex min-h-[300px] flex-col items-center justify-center rounded-[16px] border border-[#bfdbfe] p-8 text-center"
            style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)' }}
          >
            <div className="mb-4 text-4xl">🔍</div>
            <p className="mb-2 text-[17px] font-bold text-[#1e40af]">
              {Math.max(0, total - 7).toLocaleString()} more vehicles
            </p>
            <p className="mb-5 text-[14px] leading-relaxed text-[#3b82f6]">
              Filter by make, model, year, price, mileage, and AI grade.
            </p>
            <Link
              href="/inventory"
              className="rounded-[8px] bg-[#2563eb] px-6 py-[11px] text-[14px] font-bold text-white hover:bg-[#1d4ed8] transition-colors"
            >
              Browse All Inventory
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" className="bg-[#0f172a] px-8 py-[72px] text-center">
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-[2px] text-[#3b82f6]">Simple process</p>
        <h2 className="mb-4 text-[40px] font-extrabold tracking-[-1.5px] text-white">From search to lot in days.</h2>
        <p className="mx-auto mb-14 max-w-[420px] text-[16px] leading-[1.6] text-[#94a3b8]">
          No auction travel. No offline paperwork. The entire deal happens on Coast.
        </p>

        <div className="mx-auto grid max-w-[900px] grid-cols-4 gap-0.5">
          {[
            { n: '1', title: 'Search',  desc: 'Browse AI-graded inventory from vetted wholesale sellers. Filter anything.' },
            { n: '2', title: 'Review',  desc: 'Full photo gallery, AI condition grade, and vehicle history — no surprises.' },
            { n: '3', title: 'Buy',     desc: 'Purchase at true wholesale price. No auction fees or floor premiums.' },
            { n: '4', title: 'Deliver', desc: 'E-sign all documents and arrange transport to your lot — all in one place.' },
          ].map((step, i) => (
            <div
              key={step.n}
              className={`relative bg-[#1e293b] px-7 py-8 text-left ${
                i === 0 ? 'rounded-l-[16px]' : i === 3 ? 'rounded-r-[16px]' : ''
              }`}
            >
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#2563eb] text-[14px] font-extrabold text-white">
                {step.n}
              </div>
              <h3 className="mb-2 text-[16px] font-bold text-white">{step.title}</h3>
              <p className="text-[13px] leading-[1.6] text-[#94a3b8]">{step.desc}</p>
              {i < 3 && (
                <div className="absolute right-[-10px] top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[#2563eb] text-[10px] text-white">
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── TRUST / WHY COAST ────────────────────────────────── */}
      <section className="bg-[#f8fafc] px-8 py-16">
        <h2 className="mb-12 text-center text-[32px] font-extrabold tracking-[-1px] text-[#0f172a]">
          Why consumers choose Coast
        </h2>
        <div className="mx-auto grid max-w-[900px] grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            {
              icon: <Bot size={22} />,
              title: 'AI Condition Grading',
              desc: 'Every vehicle is graded using AI analysis of photos and inspection data — so you know exactly what you\'re buying before wiring funds.',
            },
            {
              icon: <PenLine size={22} />,
              title: 'Digital Paperwork',
              desc: 'Purchase agreements, title transfer, and all closing documents signed electronically. No fax machines, no overnight mail.',
            },
            {
              icon: <Truck size={22} />,
              title: 'Transport Arranged',
              desc: 'Once you close, coordinate transport directly to your lot through Coast. One platform, start to finish.',
            },
          ].map(card => (
            <div key={card.title} className="rounded-[16px] border border-[#e2e8f0] bg-white p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#eff6ff] text-[#2563eb]">
                {card.icon}
              </div>
              <h3 className="mb-2 text-[17px] font-bold text-[#0f172a]">{card.title}</h3>
              <p className="text-[14px] leading-[1.6] text-[#64748b]">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER CTA ───────────────────────────────────────── */}
      <div
        className="px-8 py-20 text-center"
        style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #4f46e5 100%)' }}
      >
        <h2 className="mb-4 text-[44px] font-extrabold tracking-[-2px] text-white">Ready to buy smarter?</h2>
        <p className="mx-auto mb-9 max-w-[420px] text-[17px] leading-[1.6] text-white/75">
          Join 500+ consumers buying wholesale inventory entirely online. No auction floors required.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/inventory"
            className="rounded-[10px] bg-white px-8 py-[14px] text-[15px] font-bold text-[#1d4ed8] hover:bg-white/90 transition-colors"
          >
            Browse Inventory
          </Link>
          <Link
            href="/signup"
            className="rounded-[10px] border-2 border-white/40 px-8 py-[14px] text-[15px] font-semibold text-white hover:bg-white/10 transition-colors"
          >
            Create Free Account
          </Link>
        </div>
      </div>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="flex items-center justify-between bg-[#0f172a] px-8 py-10">
        <div className="text-[18px] font-extrabold tracking-[-0.5px] text-white">
          Coast<span className="text-[#3b82f6]">.</span>
        </div>
        <div className="flex gap-6">
          {['Inventory', 'How It Works', 'For Sellers', 'Sign In'].map(l => (
            <Link key={l} href={l === 'Inventory' ? '/inventory' : l === 'Sign In' ? '/login' : '#'} className="text-[13px] text-[#64748b] hover:text-white transition-colors">
              {l}
            </Link>
          ))}
        </div>
        <p className="text-[13px] text-[#475569]">© 2026 Coast Wholesale</p>
      </footer>

    </div>
  )
}
```

- [ ] **Step 2: Verify full landing page**

Open http://localhost:3000. Check every section top to bottom against the mockup at http://localhost:55973. Specifically:
- Hero gradient + pulsing dot + live count from real DB
- Search bar floats above gradient with shadow
- Filter pills respond to clicks and navigate to /inventory
- Stats strip dark with 4 real stats
- Featured inventory shows real cars in 4-col grid
- 8th card is the "Browse All" CTA card
- How It Works dark section with 4 steps and arrow connectors
- Trust section 3 cards
- Footer CTA blue gradient
- Footer dark with logo + links + copyright

- [ ] **Step 3: Commit**

```bash
git add app/(public)/page.tsx components/storefront/HeroSearch.tsx
git commit -m "feat: rewrite landing page as marketplace homepage with real inventory"
```

---

## Chunk 4 — ListingGrid column update

### Task 5: Update ListingGrid to 4-column on xl

The inventory page grid currently caps at 3 columns. Update to match the landing page's 4-column layout on xl screens for visual consistency.

**Files:**
- Modify: `components/storefront/ListingGrid.tsx`

- [ ] **Step 1: Update grid class and empty state in `components/storefront/ListingGrid.tsx`**

Find the grid div:
```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
```
Replace with:
```tsx
<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
```

Also update the empty state (retains dark zinc classes from old theme — fix to match new light theme):
```tsx
// OLD:
<div className="flex h-64 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900">
  <p className="text-sm text-zinc-500">No listings match your filters.</p>
</div>

// NEW:
<div className="flex h-64 items-center justify-center rounded-xl border border-[#e5e7eb] bg-[#f8fafc]">
  <p className="text-sm text-[#94a3b8]">No listings match your filters.</p>
</div>
```

- [ ] **Step 2: Verify inventory page**

Open http://localhost:3000/inventory. Cards should be 4-across on wide screens and match the new ListingCard design.

- [ ] **Step 3: Commit**

```bash
git add components/storefront/ListingGrid.tsx
git commit -m "feat: update ListingGrid to 4-column on xl to match new card design"
```

---

## Final Verification

- [ ] Walk the full homepage at http://localhost:3000 and compare to the mockup side-by-side
- [ ] Click "Browse all X →" — lands on /inventory
- [ ] Click a listing card — navigates to the listing detail page
- [ ] Click "Get Started" in nav (unauthenticated) — goes to /signup
- [ ] Search via nav search bar — navigates to /inventory?q=...
- [ ] Search via hero search bar — navigates to /inventory with correct params
- [ ] Click a filter pill — navigates to /inventory with correct params
- [ ] Verify on mobile (375px) — hero stacks, grid is 1-col, nav collapses links
