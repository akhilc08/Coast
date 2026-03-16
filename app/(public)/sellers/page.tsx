'use client'

import { useState } from 'react'
import { PackageCheck, BarChart3, Zap, ShieldCheck } from 'lucide-react'

export default function SellersPage() {
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setStatus(res.ok ? 'success' : 'error')
  }

  return (
    <div className="font-sans">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-6 pb-20 pt-16 text-center"
        style={{ background: 'linear-gradient(160deg, #eff6ff 0%, #dbeafe 40%, #fff 100%)' }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 20% 50%, rgba(37,99,235,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(99,102,241,0.06) 0%, transparent 50%)',
          }}
        />

        <div className="relative mb-5 inline-flex items-center gap-1.5 rounded-full border border-[rgba(37,99,235,0.2)] bg-[rgba(37,99,235,0.08)] px-3 py-[5px] text-[12px] font-semibold uppercase tracking-widest text-[#2563eb]">
          For Wholesale Dealers
        </div>

        <h1 className="relative mb-5 text-4xl font-extrabold leading-tight tracking-tight text-[#0f172a] sm:text-5xl">
          Sell your inventory
          <br />
          <span className="text-[#2563eb]">directly to consumers.</span>
        </h1>

        <p className="relative mx-auto mb-10 max-w-xl text-lg font-normal leading-relaxed text-[#64748b]">
          Coast connects licensed wholesale dealers with retail consumers — no auction fees, no middlemen. List your vehicles, get paid at wholesale plus margin.
        </p>

        <a
          href="#contact"
          className="relative inline-block rounded-[10px] bg-[#2563eb] px-8 py-3.5 text-[15px] font-semibold text-white hover:bg-[#1d4ed8] transition-colors"
        >
          Get in touch
        </a>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="bg-[#0f172a] px-8 py-[72px] text-center">
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-[#3b82f6]">Simple process</p>
        <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">List once. Sell fast.</h2>
        <p className="mx-auto mb-14 max-w-md text-base leading-relaxed text-[#94a3b8]">
          We handle the consumer side. You focus on acquiring great inventory.
        </p>

        <div className="mx-auto grid max-w-[900px] grid-cols-4 gap-0.5">
          {[
            { n: '1', title: 'Apply',   desc: 'Submit your dealer info. We verify your wholesale license and onboard you in days.' },
            { n: '2', title: 'List',    desc: 'Upload photos, enter vehicle details, and set your asking price. AI grades condition automatically.' },
            { n: '3', title: 'Sell',    desc: 'Consumers browse and buy at your listed price. No bidding wars, no floor fees.' },
            { n: '4', title: 'Get paid', desc: 'Funds released after e-sign closes. We coordinate transport to the buyer — you\'re done.' },
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

      {/* ── WHY COAST ────────────────────────────────────────── */}
      <section className="bg-[#f8fafc] px-8 py-16">
        <h2 className="mb-12 text-center text-3xl font-extrabold tracking-tight text-[#0f172a]">
          Why dealers choose Coast
        </h2>
        <div className="mx-auto grid max-w-[900px] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: <BarChart3 size={22} />,
              title: 'Better margins',
              desc: 'Skip the auction floor. Sell directly to retail consumers at wholesale-plus pricing.',
            },
            {
              icon: <Zap size={22} />,
              title: 'Fast listings',
              desc: 'Upload a vehicle in under 5 minutes. AI auto-grades condition from your photos.',
            },
            {
              icon: <PackageCheck size={22} />,
              title: 'Digital closing',
              desc: 'All paperwork handled electronically. No couriers, no delays, no lost docs.',
            },
            {
              icon: <ShieldCheck size={22} />,
              title: 'Verified buyers',
              desc: 'Every consumer is identity-verified before they can complete a purchase.',
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

      {/* ── CONTACT ──────────────────────────────────────────── */}
      <section id="contact" className="px-8 py-20">
        <div className="mx-auto max-w-[560px]">
          <div className="mb-10 text-center">
            <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-[#0f172a]">Get in touch</h2>
            <p className="text-[16px] leading-[1.6] text-[#64748b]">
              Interested in listing your inventory on Coast? Send us a message and we'll get back to you within one business day.
            </p>
          </div>

          {status === 'success' ? (
            <div className="rounded-[16px] border border-blue-200 bg-blue-50 p-8 text-center">
              <div className="mb-3 text-3xl">✓</div>
              <h3 className="mb-2 text-[18px] font-bold text-[#1e40af]">Message sent</h3>
              <p className="text-[14px] text-[#3b82f6]">We'll be in touch within one business day.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[14px] font-medium text-[#374151]">Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="Jane Smith"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-[8px] border border-[#d1d5db] px-3 py-2.5 text-[14px] text-[#111] placeholder:text-[#9ca3af] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[14px] font-medium text-[#374151]">Email *</label>
                  <input
                    required
                    type="email"
                    placeholder="jane@dealership.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full rounded-[8px] border border-[#d1d5db] px-3 py-2.5 text-[14px] text-[#111] placeholder:text-[#9ca3af] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[14px] font-medium text-[#374151]">Dealership / Company</label>
                <input
                  type="text"
                  placeholder="Smith Auto Group"
                  value={form.company}
                  onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                  className="w-full rounded-[8px] border border-[#d1d5db] px-3 py-2.5 text-[14px] text-[#111] placeholder:text-[#9ca3af] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[14px] font-medium text-[#374151]">Message *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Tell us about your inventory, how many vehicles you move per month, and any questions you have..."
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  className="w-full rounded-[8px] border border-[#d1d5db] px-3 py-2.5 text-[14px] text-[#111] placeholder:text-[#9ca3af] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 resize-none"
                />
              </div>

              {status === 'error' && (
                <p className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-[14px] text-red-600">
                  Something went wrong. Please email us directly at admin@drivewithcoast.com
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full rounded-[10px] bg-[#2563eb] py-[14px] text-[15px] font-bold text-white hover:bg-[#1d4ed8] transition-colors disabled:opacity-60"
              >
                {status === 'loading' ? 'Sending...' : 'Send message'}
              </button>
            </form>
          )}
        </div>
      </section>

    </div>
  )
}
