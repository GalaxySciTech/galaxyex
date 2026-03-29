import Link from "next/link";

const cards = [
  {
    href: "/dashboard",
    title: "Dashboard",
    description: "Portfolio overview, daily PnL and earnings status.",
  },
  {
    href: "/trade",
    title: "Trade",
    description: "Instant simulated BTC/ETH execution against live-indexed prices.",
  },
  {
    href: "/earn",
    title: "Earn",
    description: "Fixed APY pool with daily accrual and transparent payout math.",
  },
  {
    href: "/wallet",
    title: "Wallet",
    description: "Internal USDT ledger and admin-managed credits/debits.",
  },
  {
    href: "/admin",
    title: "Admin",
    description: "Tune spread, APY and bot activity in one control plane.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <section className="space-y-4">
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-400">GalaxyEx MVP</p>
          <h1 className="text-4xl font-semibold">Profit-first simulation platform</h1>
          <p className="max-w-3xl text-slate-300">
            This starter ships an exchange-style UX backed by a modular simulation engine. It is
            designed for rapid validation while remaining extensible for future real integration.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:-translate-y-0.5 hover:border-emerald-400"
            >
              <h2 className="text-lg font-medium">{card.title}</h2>
              <p className="mt-2 text-sm text-slate-400">{card.description}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
