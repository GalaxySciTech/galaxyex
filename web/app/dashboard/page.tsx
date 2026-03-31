"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { formatAsset, formatCurrency, percent } from "@/lib/format";
import type { SimulationState } from "@/lib/types";
import { demoState } from "@/lib/mock-data";
import { fetchDemoState, fetchSimulationState, getStoredAuth } from "@/lib/api-client";

function ChangeIndicator({ value }: { value: number }) {
  const pos = value >= 0;
  return (
    <span className={`text-xs font-medium ${pos ? "text-emerald-400" : "text-rose-400"}`}>
      {pos ? "▲" : "▼"} {Math.abs(value).toFixed(2)}%
    </span>
  );
}

export default function DashboardPage() {
  const [state, setState] = useState<SimulationState>(demoState);

  useEffect(() => {
    const load = async () => {
      const auth = getStoredAuth();
      try {
        const s = await (auth ? fetchSimulationState() : fetchDemoState());
        setState(s);
      } catch {
        setState(demoState);
      }
    };
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, []);

  // Portfolio valuation
  const spotValue = state.balances.reduce((sum, b) => {
    if (b.asset === "USDT") return sum + b.available;
    const pair = `${b.asset}/USDT` as const;
    const px = state.prices[pair] ?? 0;
    return sum + b.available * px;
  }, 0);

  const earnValue = state.yieldPositions
    .filter((p) => p.status === "active")
    .reduce((sum, p) => sum + p.amount + p.accrued_profit, 0);

  const totalValue = spotValue + earnValue;

  const totalEarned = state.yieldPositions
    .filter((p) => p.status === "active")
    .reduce((sum, p) => sum + p.accrued_profit, 0);

  const dailyRate = state.apy / 365;

  return (
    <AppShell title="Dashboard" subtitle="Portfolio overview">
      {/* Portfolio summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs text-slate-400">Total Portfolio</p>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(totalValue)}</p>
          <p className="mt-1 text-xs text-slate-500">Spot + Earn</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs text-slate-400">Spot Value</p>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(spotValue)}</p>
          <p className="mt-1 text-xs text-slate-500">{state.balances.length} assets</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs text-slate-400">Earn Value</p>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(earnValue)}</p>
          <p className="mt-1 text-emerald-400 text-xs font-medium">+{formatCurrency(totalEarned)} earned</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs text-slate-400">Pool APY</p>
          <p className="mt-2 text-2xl font-bold text-emerald-400">{percent(state.apy)}</p>
          <p className="mt-1 text-xs text-slate-500">{percent(dailyRate)} daily</p>
        </div>
      </div>

      {/* Market snapshot */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-sm">Market Prices</h2>
          <Link href="/markets" className="text-xs text-emerald-400 hover:text-emerald-300">
            View all markets →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-slate-800">
          {Object.values(state.marketStats ?? {}).map((s) => {
            const priceDecimals = s.price > 100 ? 2 : 4;
            return (
              <Link
                key={s.pair}
                href={`/trade?pair=${encodeURIComponent(s.pair)}`}
                className="px-5 py-4 hover:bg-slate-800/30 transition"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-300">{s.pair.replace("/USDT", "")}/USDT</span>
                  <ChangeIndicator value={s.changePercent24h} />
                </div>
                <p className="text-lg font-bold font-mono">
                  ${s.price.toLocaleString("en-US", { maximumFractionDigits: priceDecimals })}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  H: ${s.high24h.toLocaleString("en-US", { maximumFractionDigits: priceDecimals })}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Balances */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-sm">Asset Balances</h2>
          <Link href="/wallet" className="text-xs text-emerald-400 hover:text-emerald-300">
            View wallet →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs">
                <th className="px-5 py-3 text-left font-medium">Asset</th>
                <th className="px-5 py-3 text-right font-medium">Balance</th>
                <th className="px-5 py-3 text-right font-medium hidden sm:table-cell">In Earn</th>
                <th className="px-5 py-3 text-right font-medium hidden sm:table-cell">Price</th>
                <th className="px-5 py-3 text-right font-medium">Value (USDT)</th>
                <th className="px-5 py-3 text-right font-medium hidden md:table-cell">24h</th>
              </tr>
            </thead>
            <tbody>
              {state.balances.map((b) => {
                const pair = b.asset !== "USDT" ? `${b.asset}/USDT` as const : null;
                const px = pair ? (state.prices[pair] ?? 0) : 1;
                const value = b.available * px;
                const stats = pair ? state.marketStats?.[pair] : null;
                return (
                  <tr key={b.asset} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-emerald-400">
                          {b.asset[0]}
                        </div>
                        <span className="font-medium">{b.asset}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono">{formatAsset(b.available)}</td>
                    <td className="px-5 py-3.5 text-right text-slate-400 font-mono hidden sm:table-cell">
                      {b.in_earn > 0 ? formatAsset(b.in_earn) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono hidden sm:table-cell">
                      {b.asset !== "USDT" ? formatCurrency(px) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-medium">{formatCurrency(value)}</td>
                    <td className="px-5 py-3.5 text-right hidden md:table-cell">
                      {stats ? <ChangeIndicator value={stats.changePercent24h} /> : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent trades */}
      {state.trades.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <h2 className="font-semibold text-sm">Recent Trades</h2>
            <Link href="/wallet" className="text-xs text-emerald-400 hover:text-emerald-300">
              All trades →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs">
                  <th className="px-4 py-2.5 text-left">Time</th>
                  <th className="px-4 py-2.5 text-left">Pair</th>
                  <th className="px-4 py-2.5 text-left">Side</th>
                  <th className="px-4 py-2.5 text-right">Qty</th>
                  <th className="px-4 py-2.5 text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {state.trades.slice(0, 5).map((t) => (
                  <tr key={t.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition">
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{new Date(t.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2.5">{t.pair}</td>
                    <td className={`px-4 py-2.5 font-medium ${t.side === "buy" ? "text-emerald-400" : "text-rose-400"}`}>
                      {t.side.toUpperCase()}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatAsset(t.quantity, 6)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(t.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}
