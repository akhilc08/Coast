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
          Coast<span className="text-[#2563eb]">.</span>
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
