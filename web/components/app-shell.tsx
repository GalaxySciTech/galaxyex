"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { clearAuth, fetchDemoState, fetchMarketStats, fetchSimulationState, getStoredAuth } from "@/lib/api-client";
import type { PriceStats } from "@/lib/types";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/markets", label: "Markets" },
  { href: "/trade", label: "Trade" },
  { href: "/earn", label: "Earn" },
  { href: "/wallet", label: "Wallet" },
  { href: "/admin", label: "Admin" },
];

type AppShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

function PriceTicker() {
  const [stats, setStats] = useState<PriceStats[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const auth = getStoredAuth();
        if (auth) {
          const state = await fetchSimulationState();
          setStats(Object.values(state.marketStats));
        } else {
          const state = await fetchDemoState();
          setStats(Object.values(state.marketStats));
        }
      } catch {
        try {
          const s = await fetchMarketStats();
          setStats(s);
        } catch {
          // silently fail
        }
      }
    };
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, []);

  if (stats.length === 0) return null;

  return (
    <div className="border-b border-slate-800 bg-slate-950 overflow-hidden">
      <div className="flex gap-6 px-6 py-1.5 overflow-x-auto scrollbar-none text-xs">
        {stats.map((s) => (
          <div key={s.pair} className="flex items-center gap-2 shrink-0">
            <span className="text-slate-300 font-medium">{s.pair.replace("/USDT", "")}</span>
            <span className="text-slate-100 font-mono">${s.price.toLocaleString("en-US", { maximumFractionDigits: s.price > 100 ? 2 : 4 })}</span>
            <span className={s.changePercent24h >= 0 ? "text-emerald-400" : "text-rose-400"}>
              {s.changePercent24h >= 0 ? "+" : ""}{s.changePercent24h.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AppShell({ title, subtitle, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const fetchAuth = async () => {
      const auth = getStoredAuth();
      setUserEmail(auth?.email ?? null);
    };
    void fetchAuth();
  }, []);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-black font-bold text-xs">G</div>
            <span className="text-base font-bold tracking-tight">GalaxyEx</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-slate-800 text-emerald-400"
                      : "text-slate-300 hover:text-slate-100 hover:bg-slate-800/60"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {userEmail ? (
              <>
                <span className="hidden sm:block text-xs text-slate-400 truncate max-w-[140px]">{userEmail}</span>
                <button
                  onClick={handleLogout}
                  className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-rose-500 hover:text-rose-400 transition"
                >
                  Log out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-emerald-400 transition"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Price ticker */}
      <PriceTicker />

      {/* Mobile nav */}
      <div className="md:hidden border-b border-slate-800 bg-slate-900 px-4 py-2 overflow-x-auto">
        <div className="flex gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  active ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Page header */}
      <div className="border-b border-slate-800/50 bg-slate-900/30">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          </div>
          <div className="ml-auto hidden sm:block rounded-md border border-amber-500/30 bg-amber-500/8 px-3 py-1.5 text-xs text-amber-300">
            Simulation only — no real funds
          </div>
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6">
        {children}
      </main>
    </div>
  );
}
