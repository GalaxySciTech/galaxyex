import Link from "next/link";

const features = [
  {
    href: "/markets",
    title: "Markets",
    description: "Real-time BTC, ETH, SOL, BNB prices with 24h stats powered by Binance.",
    icon: "📊",
  },
  {
    href: "/trade",
    title: "Spot Trading",
    description: "Market & limit orders on 4 pairs. Quick % fill buttons, open order management.",
    icon: "⚡",
  },
  {
    href: "/earn",
    title: "Earn",
    description: "Flexible savings at 12% APY or fixed-term up to 18% APY with daily accrual.",
    icon: "💰",
  },
  {
    href: "/wallet",
    title: "Wallet",
    description: "Full asset breakdown, paginated trade history, and earn position ledger.",
    icon: "🗂",
  },
  {
    href: "/dashboard",
    title: "Dashboard",
    description: "Portfolio value, 24h change indicators, and earnings snapshot.",
    icon: "🖥",
  },
  {
    href: "/admin",
    title: "Admin",
    description: "Risk controls: APY, spread, trading fees, and bot liquidity settings.",
    icon: "⚙️",
  },
];

const stats = [
  { label: "Trading Pairs", value: "4" },
  { label: "Max Earn APY", value: "18%" },
  { label: "Price Refresh", value: "15s" },
  { label: "Fee", value: "0.08%" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-black font-bold text-xs">G</div>
            <span className="font-bold tracking-tight">GalaxyEx</span>
          </div>
          <div className="flex gap-3">
            <Link href="/login" className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-600 transition">
              Sign in
            </Link>
            <Link href="/dashboard" className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-black hover:bg-emerald-400 transition">
              Launch App
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/30 via-slate-950 to-cyan-950/20" />
        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/8 px-3 py-1 text-xs text-emerald-400 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Simulation Platform — Paper Trading
            </div>
            <h1 className="text-5xl font-bold leading-tight tracking-tight">
              Trade smarter.<br />
              <span className="text-emerald-400">Earn more.</span>
            </h1>
            <p className="mt-5 text-lg text-slate-300 max-w-xl">
              GalaxyEx is a professional-grade crypto exchange simulator. Practice trading BTC, ETH, SOL & BNB with real Binance prices. Zero risk, full realism.
            </p>
            <div className="mt-8 flex gap-4">
              <Link
                href="/dashboard"
                className="rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-black hover:bg-emerald-400 transition"
              >
                Start Trading
              </Link>
              <Link
                href="/markets"
                className="rounded-lg border border-slate-700 px-6 py-3 font-medium text-slate-300 hover:border-slate-500 hover:text-slate-100 transition"
              >
                View Markets
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-slate-800 bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-emerald-400">{s.value}</p>
              <p className="text-xs text-slate-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="text-2xl font-bold mb-2">Everything you need</h2>
        <p className="text-slate-400 mb-8 text-sm">Professional trading tools, all in one platform.</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="group rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:bg-slate-900/80"
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="text-base font-semibold group-hover:text-emerald-400 transition">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{f.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-800 bg-slate-900/30">
        <div className="mx-auto max-w-7xl px-6 py-16 text-center">
          <h2 className="text-3xl font-bold">Ready to start?</h2>
          <p className="mt-3 text-slate-400">Create an account or try the demo instantly.</p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/login"
              className="rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-black hover:bg-emerald-400 transition"
            >
              Create Account
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-slate-700 px-6 py-3 font-medium text-slate-300 hover:border-slate-500 transition"
            >
              Try Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-6">
        <div className="mx-auto max-w-7xl flex items-center justify-between text-xs text-slate-500">
          <span>© 2025 GalaxyEx — Simulation only. No real funds involved.</span>
          <span>Prices indexed from Binance public API</span>
        </div>
      </footer>
    </main>
  );
}
