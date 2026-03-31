"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchRecentTrades, type RecentMarketTrade } from "@/lib/api-client";

type Props = {
  pair: string;
  priceDecimals: number;
};

export function RecentTrades({ pair, priceDecimals }: Props) {
  const [trades, setTrades] = useState<RecentMarketTrade[]>([]);

  const load = useCallback(async () => {
    try {
      const data = await fetchRecentTrades(pair, 30);
      setTrades(data);
    } catch {
      // silently fail
    }
  }, [pair]);

  useEffect(() => {
    load();
    const id = setInterval(load, 3_000);
    return () => clearInterval(id);
  }, [load]);

  const qtyDecimals = trades[0]?.price > 100 ? 5 : 3;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Market Trades
        </h3>
      </div>

      <div className="grid grid-cols-3 px-3 py-1 text-[10px] text-slate-500 border-b border-slate-800/50">
        <span>Price(USDT)</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Time</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
        {trades.map((t) => (
          <div
            key={t.id}
            className="grid grid-cols-3 px-3 py-[2px] text-[11px] font-mono"
          >
            <span className={t.isBuyerMaker ? "text-rose-400" : "text-emerald-400"}>
              {t.price.toFixed(priceDecimals)}
            </span>
            <span className="text-right text-slate-300">
              {t.qty.toFixed(qtyDecimals)}
            </span>
            <span className="text-right text-slate-500">
              {new Date(t.time).toLocaleTimeString("en-US", { hour12: false })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
