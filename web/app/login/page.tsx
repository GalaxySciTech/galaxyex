import Link from "next/link";
import { EmailLoginForm } from "@/components/auth/email-login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-black font-bold text-xs">G</div>
            <span className="font-bold tracking-tight">GalaxyEx</span>
          </Link>
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-200 transition">
            Continue as demo →
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="grid w-full max-w-4xl gap-12 lg:grid-cols-2">
          {/* Left side */}
          <section className="flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/8 px-3 py-1 text-xs text-emerald-400 mb-6 w-fit">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Paper Trading Platform
            </div>
            <h1 className="text-3xl font-bold">Sign in to GalaxyEx</h1>
            <p className="mt-4 text-slate-300 text-sm leading-relaxed">
              Access your simulation portfolio. Trade BTC, ETH, SOL & BNB with real Binance prices. Earn up to 18% APY on your simulated balance.
            </p>
            <div className="mt-8 space-y-3 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Real-time prices from Binance
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Market & limit orders
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Fixed & flexible earn products
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Simulation only — no real funds
              </div>
            </div>
          </section>

          {/* Right side - form */}
          <div>
            <EmailLoginForm />
            <p className="mt-4 text-center text-xs text-slate-500">
              Just exploring?{" "}
              <Link href="/dashboard" className="text-emerald-400 hover:text-emerald-300">
                Continue as demo user
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
