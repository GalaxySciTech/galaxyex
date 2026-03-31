"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchOrderBook, type OrderBookEntry } from "@/lib/api-client";

type Props = {
  pair: string;
  currentPrice: number;
  priceDecimals: number;
};

export function OrderBook({ pair, currentPrice, priceDecimals }: Props) {
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);

  const load = useCallback(async () => {
    try {
      const data = await fetchOrderBook(pair, 15);
      setBids(data.bids);
      setAsks(data.asks);
    } catch {
      // silently fail
    }
  }, [pair]);

  useEffect(() => {
    load();
    const id = setInterval(load, 3_000);
    return () => clearInterval(id);
  }, [load]);

  const maxBidQty = Math.max(...bids.map((b) => b.quantity), 0.0001);
  const maxAskQty = Math.max(...asks.map((a) => a.quantity), 0.0001);

  const qtyDecimals = currentPrice > 100 ? 5 : 3;

  const displayAsks = [...asks].reverse().slice(-10);
  const displayBids = bids.slice(0, 10);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Order Book
        </h3>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="grid grid-cols-3 px-3 py-1 text-[10px] text-slate-500 border-b border-slate-800/50">
          <span>Price(USDT)</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Total</span>
        </div>

        <div className="flex flex-col">
          {/* Asks (sell orders) — red, from high to low */}
          {displayAsks.map((a, i) => {
            const pct = (a.quantity / maxAskQty) * 100;
            return (
              <div
                key={`ask-${i}`}
                className="relative grid grid-cols-3 px-3 py-[2px] text-[11px] font-mono"
              >
                <div
                  className="absolute inset-y-0 right-0 bg-rose-500/8"
                  style={{ width: `${pct}%` }}
                />
                <span className="text-rose-400 relative z-10">
                  {a.price.toFixed(priceDecimals)}
                </span>
                <span className="text-right text-slate-300 relative z-10">
                  {a.quantity.toFixed(qtyDecimals)}
                </span>
                <span className="text-right text-slate-500 relative z-10">
                  {(a.price * a.quantity).toFixed(2)}
                </span>
              </div>
            );
          })}

          {/* Current price row */}
          <div className="grid grid-cols-3 px-3 py-1.5 border-y border-slate-700/50 bg-slate-800/30">
            <span className="text-sm font-mono font-semibold text-emerald-400 col-span-2">
              {currentPrice.toFixed(priceDecimals)}
            </span>
            <span className="text-right text-[10px] text-slate-400 self-center">
              ${currentPrice.toLocaleString("en-US", { maximumFractionDigits: priceDecimals })}
            </span>
          </div>

          {/* Bids (buy orders) — green, from high to low */}
          {displayBids.map((b, i) => {
            const pct = (b.quantity / maxBidQty) * 100;
            return (
              <div
                key={`bid-${i}`}
                className="relative grid grid-cols-3 px-3 py-[2px] text-[11px] font-mono"
              >
                <div
                  className="absolute inset-y-0 right-0 bg-emerald-500/8"
                  style={{ width: `${pct}%` }}
                />
                <span className="text-emerald-400 relative z-10">
                  {b.price.toFixed(priceDecimals)}
                </span>
                <span className="text-right text-slate-300 relative z-10">
                  {b.quantity.toFixed(qtyDecimals)}
                </span>
                <span className="text-right text-slate-500 relative z-10">
                  {(b.price * b.quantity).toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
