'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import {
  Search,
  ClipboardList,
  CreditCard,
  Truck,
  ShieldCheck,
  Laptop,
  Tag,
  Globe,
  ArrowRight,
  Star,
  TrendingUp,
  BarChart3,
  Users,
  Building2,
  CheckCircle2,
} from 'lucide-react'

export default function LandingPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -48px 0px' }
    )
    document.querySelectorAll('.fade-in').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="[font-family:var(--font-dm-sans)]">

      {/* ─── HERO ───────────────────────────────────────────── */}
      <section className="bg-[#faf9f6] px-6 pt-24 pb-24 sm:pt-32 sm:pb-32 lg:pt-40">
        <div className="mx-auto max-w-5xl text-center">

          {/* Eyebrow */}
          <div className="fade-in mb-8 inline-flex items-center gap-2 rounded-full border border-[#e7e5e4] bg-white px-4 py-1.5 text-sm text-[#78716c]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1d4ed8]" />
            The Modern Wholesale Marketplace
          </div>

          {/* Headline */}
          <h1 className="fade-in [font-family:var(--font-serif-display)] text-5xl leading-tight tracking-tight text-[#1c1917] sm:text-6xl lg:text-7xl">
            Buy wholesale vehicles,
            <br />
            <em className="text-[#1d4ed8]">entirely online.</em>
          </h1>

          {/* Subhead */}
          <p className="fade-in mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#78716c] sm:text-xl">
            Coast brings the wholesale auto market into the 21st century. Browse
            AI-graded inventory, purchase with confidence, and get vehicles delivered
            to your lot — no auctions, no wasted trips, no offline steps.
          </p>

          {/* CTAs */}
          <div className="fade-in mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/inventory"
              className="w-full rounded-lg bg-[#1c1917] px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-[#292524] sm:w-auto"
            >
              Browse Inventory
            </Link>
            <Link
              href="/signup"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#e7e5e4] bg-white px-8 py-4 text-sm font-medium text-[#1c1917] transition-colors hover:bg-[#f5f4f0] sm:w-auto"
            >
              Create Free Account <ArrowRight size={14} />
            </Link>
          </div>

          {/* Stats bar */}
          <div className="fade-in mt-16 overflow-hidden rounded-xl border border-[#e7e5e4] bg-white">
            <div className="grid divide-x divide-[#e7e5e4] sm:grid-cols-3">
              {[
                { n: '2,400+', label: 'Vehicles listed' },
                { n: '500+',   label: 'Active dealers' },
                { n: '$180M+', label: 'Transacted on platform' },
              ].map((s) => (
                <div key={s.label} className="px-8 py-7">
                  <div className="[font-family:var(--font-serif-display)] text-3xl text-[#1c1917] sm:text-4xl">
                    {s.n}
                  </div>
                  <div className="mt-1 text-sm text-[#78716c]">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ────────────────────────────────────── */}
      <section className="bg-white px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">

          <div className="fade-in mb-16 text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#a8a29e]">
              How It Works
            </p>
            <h2 className="[font-family:var(--font-serif-display)] text-4xl text-[#1c1917] sm:text-5xl">
              From search to delivered,
              <br />
              <em>without leaving your desk.</em>
            </h2>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: '01',
                icon: <Search size={20} strokeWidth={1.5} />,
                title: 'Search & Filter',
                desc: 'Browse thousands of AI-graded vehicles by make, model, year, mileage, and condition score. Powerful filters, no noise.',
              },
              {
                step: '02',
                icon: <ClipboardList size={20} strokeWidth={1.5} />,
                title: 'Review AI Grade',
                desc: "Every vehicle includes a detailed AI condition report. Know exactly what you're buying — before you commit.",
              },
              {
                step: '03',
                icon: <CreditCard size={20} strokeWidth={1.5} />,
                title: 'Buy Securely Online',
                desc: 'Purchase at wholesale price. Secure payments, digital documents, and title transfer — all handled on Coast.',
              },
              {
                step: '04',
                icon: <Truck size={20} strokeWidth={1.5} />,
                title: 'Get It Delivered',
                desc: 'We coordinate transport from seller to your lot. Your inventory arrives ready to sell, without you lifting a finger.',
              },
            ].map((item, i) => (
              <div key={item.step} className={`fade-in fade-in-delay-${i}`}>
                <div className="[font-family:var(--font-serif-display)] mb-4 text-5xl text-[#e7e5e4]">
                  {item.step}
                </div>
                <div className="mb-3 text-[#1d4ed8]">{item.icon}</div>
                <h3 className="mb-2 text-sm font-semibold text-[#1c1917]">{item.title}</h3>
                <p className="text-sm leading-relaxed text-[#78716c]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHY COAST ───────────────────────────────────────── */}
      <section className="bg-[#faf9f6] px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">

          <div className="fade-in mb-16 text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#a8a29e]">
              Why Coast
            </p>
            <h2 className="[font-family:var(--font-serif-display)] text-4xl text-[#1c1917] sm:text-5xl">
              Built for how dealers
              <br />
              <em>actually work.</em>
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {[
              {
                icon: <ShieldCheck size={20} strokeWidth={1.5} />,
                title: 'AI-Graded Condition Reports',
                desc: "No more surprises at pickup. Our proprietary grading algorithm analyzes hundreds of data points — photos, mileage, history, wear patterns — and issues an objective condition score for every vehicle on the platform.",
              },
              {
                icon: <Laptop size={20} strokeWidth={1.5} />,
                title: 'Fully Digital Transactions',
                desc: 'From purchase to title transfer, every step happens on Coast. Sign documents, transfer funds, and manage your entire inventory pipeline — all in one place, with a complete audit trail.',
              },
              {
                icon: <Tag size={20} strokeWidth={1.5} />,
                title: 'Transparent Wholesale Pricing',
                desc: "Wholesale prices with no hidden fees, no buyer's premiums, no surprises. The price you see is the price you pay. Full transparency at every step, on every vehicle.",
              },
              {
                icon: <Globe size={20} strokeWidth={1.5} />,
                title: 'No Dealer Visits Required',
                desc: "Stop burning Tuesdays driving to auction lanes. Buy from anywhere, at any time, on any device. Coast puts the entire wholesale market in your pocket — 24/7.",
              },
            ].map((item, i) => (
              <div
                key={item.title}
                className={`fade-in fade-in-delay-${i % 2} rounded-xl border border-[#e7e5e4] bg-white p-8 transition-shadow hover:shadow-sm`}
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#e7e5e4] text-[#1d4ed8]">
                  {item.icon}
                </div>
                <h3 className="mb-3 text-sm font-semibold text-[#1c1917]">{item.title}</h3>
                <p className="text-sm leading-relaxed text-[#78716c]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── MARKET CONTEXT ──────────────────────────────────── */}
      <section className="bg-[#1c1917] px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-16 lg:grid-cols-2">

            <div className="fade-in">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#57534e]">
                Market Context
              </p>
              <h2 className="[font-family:var(--font-serif-display)] mb-8 text-4xl text-white sm:text-5xl">
                An $800 billion market
                <br />
                <em className="text-[#93c5fd]">still stuck in 1985.</em>
              </h2>
              <p className="mb-5 leading-relaxed text-[#a8a29e]">
                The US wholesale auto market processes over 40 million vehicle transactions
                every year. Yet more than 70% of those transactions still happen in person —
                at physical auction lanes, through phone calls, and on paper forms.
              </p>
              <p className="leading-relaxed text-[#a8a29e]">
                Dealers spend hours each week just traveling to and from auctions, before
                they've even seen a vehicle. Coast is built to fix that. We're bringing the
                same digital transformation that reshaped banking, insurance, and B2B commerce
                to wholesale automotive — starting with the transaction layer.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { stat: '$800B+',  label: 'US wholesale auto market',          delay: 0 },
                { stat: '40M+',    label: 'vehicle transactions per year',      delay: 1 },
                { stat: '70%+',    label: 'still done at physical auctions',    delay: 2 },
                { stat: '3–4 hrs', label: 'wasted per vehicle on transit runs', delay: 3 },
              ].map((item) => (
                <div
                  key={item.stat}
                  className={`fade-in fade-in-delay-${item.delay} rounded-xl border border-white/10 bg-white/5 p-6`}
                >
                  <div className="[font-family:var(--font-serif-display)] mb-2 text-3xl text-white">
                    {item.stat}
                  </div>
                  <div className="text-sm leading-snug text-[#78716c]">{item.label}</div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ─── WHO WE ARE ──────────────────────────────────────── */}
      <section className="bg-white px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-4xl">

          <div className="fade-in text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#a8a29e]">
              Who We Are
            </p>
            <h2 className="[font-family:var(--font-serif-display)] mb-10 text-4xl text-[#1c1917] sm:text-5xl">
              Built by people who know
              <br />
              <em>the industry inside out.</em>
            </h2>
          </div>

          <div className="fade-in space-y-5 text-center">
            <p className="text-lg leading-relaxed text-[#78716c]">
              We're a team of automotive industry veterans, fintech engineers, and marketplace
              builders who've spent careers watching dealers burn time and money on a process
              that hasn't meaningfully changed since the 1950s.
            </p>
            <p className="text-lg leading-relaxed text-[#78716c]">
              We started Coast with a simple belief: the wholesale vehicle market deserves the
              same transformation that has reshaped how we bank, insure, and run businesses.
              The technology exists. The demand is there. What's been missing is execution.
            </p>
            <p className="text-lg leading-relaxed text-[#78716c]">
              Coast is the infrastructure for the next generation of dealer inventory — fast,
              transparent, and fully digital.
            </p>
          </div>

          <div className="fade-in mt-14 grid divide-y divide-[#e7e5e4] rounded-xl border border-[#e7e5e4] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              { icon: <Building2 size={18} strokeWidth={1.5} />, label: 'Detroit, MI', sub: 'Headquarters' },
              { icon: <Users size={18} strokeWidth={1.5} />,     label: '25+ team',    sub: 'Across engineering, ops & growth' },
              { icon: <TrendingUp size={18} strokeWidth={1.5} />, label: 'Seed funded', sub: 'Backed by top-tier investors' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 px-8 py-6">
                <div className="text-[#1d4ed8]">{item.icon}</div>
                <div>
                  <div className="text-sm font-semibold text-[#1c1917]">{item.label}</div>
                  <div className="text-xs text-[#78716c]">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─── SOCIAL PROOF ────────────────────────────────────── */}
      <section className="bg-[#faf9f6] px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">

          <div className="fade-in mb-16 text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#a8a29e]">
              Trusted by Dealers
            </p>
            <h2 className="[font-family:var(--font-serif-display)] text-4xl text-[#1c1917] sm:text-5xl">
              Dealers are <em>buying differently.</em>
            </h2>
          </div>

          <div className="mb-16 grid gap-5 sm:grid-cols-3">
            {[
              {
                quote: "Coast saved us 6+ hours a week we used to spend at the auction. The AI condition reports are more reliable than what I'd see in person half the time.",
                name: 'Marcus T.',
                title: 'GM, Metro Ford Dealers Group',
                delay: 0,
              },
              {
                quote: "I was skeptical about buying wholesale online — but the grading is transparent and the process is genuinely seamless. We've done 30+ vehicles through Coast this quarter alone.",
                name: 'Jennifer K.',
                title: 'Inventory Director, Lakeside Auto',
                delay: 1,
              },
              {
                quote: "The days of burning fuel to drive to a lane and lose on a car you couldn't properly inspect are over. Coast changed how we think about sourcing inventory.",
                name: 'David R.',
                title: 'Owner, Riverside Pre-Owned',
                delay: 2,
              },
            ].map((item) => (
              <div
                key={item.name}
                className={`fade-in fade-in-delay-${item.delay} rounded-xl border border-[#e7e5e4] bg-white p-8`}
              >
                <div className="mb-4 flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={13} className="fill-[#1d4ed8] text-[#1d4ed8]" />
                  ))}
                </div>
                <p className="mb-6 text-sm leading-relaxed text-[#1c1917]">
                  &ldquo;{item.quote}&rdquo;
                </p>
                <div>
                  <div className="text-sm font-semibold text-[#1c1917]">{item.name}</div>
                  <div className="mt-0.5 text-xs text-[#78716c]">{item.title}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Platform trust markers */}
          <div className="fade-in rounded-xl border border-[#e7e5e4] bg-white px-8 py-6">
            <div className="grid gap-6 sm:grid-cols-4">
              {[
                { icon: <ShieldCheck size={18} strokeWidth={1.5} />, label: 'Verified Dealers Only',    sub: 'Licensed dealers exclusively' },
                { icon: <CreditCard size={18} strokeWidth={1.5} />,  label: 'Secure Payments',          sub: 'Bank-grade transaction security' },
                { icon: <CheckCircle2 size={18} strokeWidth={1.5} />, label: '100% Digital Titles',    sub: 'No paperwork, no delays' },
                { icon: <BarChart3 size={18} strokeWidth={1.5} />,   label: 'Real-Time Pricing Data',   sub: 'Wholesale market intelligence' },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="mt-0.5 text-[#1d4ed8]">{item.icon}</div>
                  <div>
                    <div className="text-sm font-semibold text-[#1c1917]">{item.label}</div>
                    <div className="text-xs text-[#78716c]">{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ─── CTA BANNER ──────────────────────────────────────── */}
      <section className="bg-[#1c1917] px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-3xl text-center fade-in">
          <h2 className="[font-family:var(--font-serif-display)] mb-6 text-4xl text-white sm:text-5xl lg:text-6xl">
            Ready to transform
            <br />
            <em className="text-[#93c5fd]">how you buy inventory?</em>
          </h2>
          <p className="mb-10 text-lg text-[#a8a29e]">
            Join hundreds of dealers already buying smarter on Coast.
            Free to create an account. No commitments.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="w-full rounded-lg bg-white px-8 py-4 text-sm font-semibold text-[#1c1917] transition-colors hover:bg-[#f5f4f0] sm:w-auto"
            >
              Create Free Account
            </Link>
            <Link
              href="/inventory"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 px-8 py-4 text-sm font-medium text-white transition-colors hover:bg-white/5 sm:w-auto"
            >
              Browse Inventory <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────── */}
      <footer className="border-t border-white/10 bg-[#1c1917] px-6 py-16">
        <div className="mx-auto max-w-6xl">

          <div className="mb-12 grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <div className="[font-family:var(--font-serif-display)] mb-3 text-xl text-white">
                Coast
              </div>
              <p className="text-sm leading-relaxed text-[#78716c]">
                The wholesale vehicle marketplace, fully online.
              </p>
            </div>

            {[
              {
                heading: 'Product',
                links: ['Browse Inventory', 'How It Works', 'AI Condition Reports', 'Pricing'],
              },
              {
                heading: 'Company',
                links: ['About', 'Careers', 'Blog', 'Contact'],
              },
              {
                heading: 'Legal',
                links: ['Privacy Policy', 'Terms of Service', 'Dealer Agreement', 'Cookie Policy'],
              },
            ].map((col) => (
              <div key={col.heading}>
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#57534e]">
                  {col.heading}
                </p>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-[#78716c] transition-colors hover:text-white">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-start justify-between gap-2 border-t border-white/10 pt-8 sm:flex-row sm:items-center">
            <p className="text-xs text-[#57534e]">
              © 2025 Coast Marketplace, Inc. All rights reserved.
            </p>
            <p className="text-xs text-[#57534e]">hello@coastauto.com</p>
          </div>

        </div>
      </footer>

    </div>
  )
}
