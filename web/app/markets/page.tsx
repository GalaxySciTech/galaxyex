"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { demoState } from "@/lib/mock-data";
import { fetchDemoState, fetchSimulationState, getStoredAuth } from "@/lib/api-client";
import type { PriceStats } from "@/lib/types";

function formatVolume(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  return `$${v.toLocaleString()}`;
}

function ChangeCell({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span className={`font-medium tabular-nums ${positive ? "text-emerald-400" : "text-rose-400"}`}>
      {positive ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

export default function MarketsPage() {
  const [stats, setStats] = useState<PriceStats[]>(Object.values(demoState.marketStats));

  useEffect(() => {
    const load = async () => {
      try {
        const auth = getStoredAuth();
        const state = await (auth ? fetchSimulationState() : fetchDemoState());
        setStats(Object.values(state.marketStats));
      } catch {
        setStats(Object.values(demoState.marketStats));
      }
    };
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, []);

  const totalVolume = stats.reduce((s, p) => s + p.volume24h, 0);

  return (
    <AppShell title="Markets" subtitle="Live price data from Binance">
      {/* Summary row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.pair} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{s.pair.replace("/USDT", "")}</span>
              <ChangeCell value={s.changePercent24h} />
            </div>
            <p className="mt-2 text-xl font-bold font-mono">
              ${s.price.toLocaleString("en-US", { maximumFractionDigits: s.price > 100 ? 2 : 4 })}
            </p>
            <p className="mt-1 text-xs text-slate-500">Vol {formatVolume(s.volume24h)}</p>
          </div>
        ))}
      </div>

      {/* Detailed table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="font-semibold">Spot Markets</h2>
          <span className="text-xs text-slate-400">24h Vol: {formatVolume(totalVolume)}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-medium">Pair</th>
                <th className="px-5 py-3 text-right font-medium">Price</th>
                <th className="px-5 py-3 text-right font-medium">24h Change</th>
                <th className="px-5 py-3 text-right font-medium hidden sm:table-cell">24h High</th>
                <th className="px-5 py-3 text-right font-medium hidden sm:table-cell">24h Low</th>
                <th className="px-5 py-3 text-right font-medium hidden md:table-cell">Volume</th>
                <th className="px-5 py-3 text-right font-medium">Trade</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => {
                const priceDecimals = s.price > 100 ? 2 : 4;
                return (
                  <tr key={s.pair} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-emerald-400">
                          {s.pair.split("/")[0][0]}
                        </div>
                        <div>
                          <p className="font-medium">{s.pair.replace("/USDT", "")}<span className="text-slate-500">/USDT</span></p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-medium">
                      ${s.price.toLocaleString("en-US", { maximumFractionDigits: priceDecimals })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <ChangeCell value={s.changePercent24h} />
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-300 hidden sm:table-cell font-mono">
                      ${s.high24h.toLocaleString("en-US", { maximumFractionDigits: priceDecimals })}
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-300 hidden sm:table-cell font-mono">
                      ${s.low24h.toLocaleString("en-US", { maximumFractionDigits: priceDecimals })}
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-400 hidden md:table-cell">
                      {formatVolume(s.volume24h)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/trade?pair=${encodeURIComponent(s.pair)}`}
                        className="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition"
                      >
                        Trade
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
