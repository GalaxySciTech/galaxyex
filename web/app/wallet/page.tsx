"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { formatAsset, formatCurrency } from "@/lib/format";
import type { SimulationState } from "@/lib/types";
import { demoState } from "@/lib/mock-data";
import { fetchDemoState, fetchSimulationState, getStoredAuth } from "@/lib/api-client";

export default function WalletPage() {
  const [state, setState] = useState<SimulationState>(demoState);
  const [filterPair, setFilterPair] = useState<string>("all");
  const [tradePage, setTradePage] = useState(1);

  useEffect(() => {
    const run = async () => {
      const auth = getStoredAuth();
      try {
        const s = await (auth ? fetchSimulationState(tradePage) : fetchDemoState());
        setState(s);
      } catch {
        setState(demoState);
      }
    };
    void run();
  }, [tradePage]);

  const totalValue = state.balances.reduce((sum, b) => {
    if (b.asset === "USDT") return sum + b.available + b.in_earn;
    const pair = `${b.asset}/USDT` as const;
    const px = state.prices[pair] ?? 0;
    return sum + (b.available + b.in_earn) * px;
  }, 0);

  const allPairs = [...new Set(state.trades.map((t) => t.pair))];
  const filteredTrades = filterPair === "all" ? state.trades : state.trades.filter((t) => t.pair === filterPair);

  const pagination = state.tradePagination;

  return (
    <AppShell title="Wallet" subtitle="Asset balances and trade history">
      {/* Total value */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-xs text-slate-400">Total Wallet Value</p>
        <p className="mt-2 text-3xl font-bold">{formatCurrency(totalValue)}</p>
        <p className="mt-1 text-xs text-slate-500">Including earn positions</p>
      </div>

      {/* Balances */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-sm">Balances</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs">
                <th className="px-5 py-3 text-left font-medium">Asset</th>
                <th className="px-5 py-3 text-right font-medium">Available</th>
                <th className="px-5 py-3 text-right font-medium hidden sm:table-cell">In Earn</th>
                <th className="px-5 py-3 text-right font-medium hidden sm:table-cell">Total</th>
                <th className="px-5 py-3 text-right font-medium">Value (USDT)</th>
              </tr>
            </thead>
            <tbody>
              {state.balances.map((b) => {
                const pair = b.asset !== "USDT" ? `${b.asset}/USDT` as const : null;
                const px = pair ? (state.prices[pair] ?? 0) : 1;
                const total = b.available + b.in_earn;
                const value = total * px;
                return (
                  <tr key={b.asset} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-emerald-400">
                          {b.asset[0]}
                        </div>
                        <div>
                          <p className="font-medium">{b.asset}</p>
                          <p className="text-xs text-slate-500">{b.asset === "USDT" ? "Tether" : b.asset === "BTC" ? "Bitcoin" : b.asset === "ETH" ? "Ethereum" : b.asset === "SOL" ? "Solana" : "BNB"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono">{formatAsset(b.available)}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-slate-400 hidden sm:table-cell">
                      {b.in_earn > 0 ? <span className="text-amber-400">{formatAsset(b.in_earn)}</span> : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono hidden sm:table-cell">{formatAsset(total)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-medium">{formatCurrency(value)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trade history */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm">Trade History</h2>
            <span className="text-xs text-slate-500">{pagination.total} total</span>
          </div>
          <div className="flex gap-2">
            <select
              value={filterPair}
              onChange={(e) => setFilterPair(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">All Pairs</option>
              {allPairs.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredTrades.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-400 text-center">No trades yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs">
                    <th className="px-4 py-2.5 text-left">Time</th>
                    <th className="px-4 py-2.5 text-left">Pair</th>
                    <th className="px-4 py-2.5 text-left">Side</th>
                    <th className="px-4 py-2.5 text-right">Quantity</th>
                    <th className="px-4 py-2.5 text-right">Price</th>
                    <th className="px-4 py-2.5 text-right">Fee</th>
                    <th className="px-4 py-2.5 text-right hidden sm:table-cell">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.map((t) => (
                    <tr key={t.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition">
                      <td className="px-4 py-2.5 text-slate-400 text-xs">{new Date(t.created_at).toLocaleString()}</td>
                      <td className="px-4 py-2.5 font-medium">{t.pair}</td>
                      <td className={`px-4 py-2.5 font-medium ${t.side === "buy" ? "text-emerald-400" : "text-rose-400"}`}>
                        {t.side.toUpperCase()}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">{formatAsset(t.quantity, 6)}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(t.price)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-400">{formatCurrency(t.fee)}</td>
                      <td className="px-4 py-2.5 text-right font-mono hidden sm:table-cell">
                        {formatCurrency(t.quantity * t.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 text-xs text-slate-400">
                <span>Page {pagination.page} of {pagination.pages}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTradePage((p) => Math.max(1, p - 1))}
                    disabled={tradePage === 1}
                    className="rounded-md border border-slate-700 px-3 py-1 disabled:opacity-40 hover:border-slate-600 transition"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => setTradePage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={tradePage === pagination.pages}
                    className="rounded-md border border-slate-700 px-3 py-1 disabled:opacity-40 hover:border-slate-600 transition"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Earn positions */}
      {state.yieldPositions.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h2 className="font-semibold text-sm">Earn Positions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs">
                  <th className="px-4 py-2.5 text-left">Product</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5 text-right">APY</th>
                  <th className="px-4 py-2.5 text-right">Accrued</th>
                  <th className="px-4 py-2.5 text-right hidden sm:table-cell">Started</th>
                  <th className="px-4 py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {state.yieldPositions.map((pos) => (
                  <tr key={pos.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition">
                    <td className="px-4 py-3">
                      <p className="font-medium">{pos.product_name}</p>
                      <p className="text-xs text-slate-500">{pos.flexible ? "Flexible" : `${pos.duration_days}d fixed`}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(pos.amount)}</td>
                    <td className="px-4 py-3 text-right">{pos.apy}%</td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-mono">+{formatCurrency(pos.accrued_profit)}</td>
                    <td className="px-4 py-3 text-right text-slate-400 text-xs hidden sm:table-cell">
                      {new Date(pos.started_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        pos.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-700 text-slate-400"
                      }`}>
                        {pos.status}
                      </span>
                    </td>
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
