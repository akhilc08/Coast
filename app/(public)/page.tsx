import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-7xl px-4">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center py-24 text-center sm:py-32">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-100 sm:text-6xl">
          Wholesale vehicles,
          <br />
          <span className="text-blue-500">fully online.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-zinc-400">
          Browse graded inventory, purchase, and complete all paperwork — no
          dealer visits, no offline steps.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <Link
            href="/inventory"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            Browse Inventory
          </Link>
          <Link
            href="/signup"
            className="rounded-lg border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
          >
            Create Account
          </Link>
        </div>
      </section>

      {/* Value props */}
      <section className="grid grid-cols-1 gap-8 border-t border-zinc-800 py-16 sm:grid-cols-3">
        {[
          {
            title: 'AI-Graded Condition',
            description:
              'Every vehicle gets an objective condition grade so you know exactly what you\'re buying.',
          },
          {
            title: 'Fully Digital Transaction',
            description:
              'Purchase, sign documents, and handle title transfer — all without leaving the platform.',
          },
          {
            title: 'Transparent Pricing',
            description:
              'Wholesale prices with no hidden fees. What you see is what you pay.',
          },
        ].map((item) => (
          <div key={item.title}>
            <h3 className="text-base font-semibold text-zinc-100">
              {item.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              {item.description}
            </p>
          </div>
        ))}
      </section>
    </main>
  )
}
