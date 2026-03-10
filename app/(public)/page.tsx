import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-center">
      <div className="max-w-2xl">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          <span className="text-xs font-medium text-zinc-400">Phase 1 — Foundation</span>
        </div>

        <h1 className="text-5xl font-bold tracking-tight text-zinc-100 sm:text-6xl">
          Coast
        </h1>
        <p className="mt-4 text-lg text-zinc-400 max-w-md mx-auto">
          Wholesale vehicle marketplace. Buy and sell fleet and auction vehicles — entirely online.
        </p>

        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/signup"
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
          >
            Create account
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors"
          >
            Log in
          </Link>
        </div>
      </div>
    </main>
  )
}
