"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { demoState } from "@/lib/mock-data";
import { formatAsset, formatCurrency } from "@/lib/format";
import type { TradingPair } from "@/lib/types";

const pairs: TradingPair[] = ["BTC/USDT", "ETH/USDT"];

export default function TradePage() {
  const [pair, setPair] = useState<TradingPair>("BTC/USDT");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("0.01");
  const [result, setResult] = useState<string>("");

  const mid = demoState.prices[pair];
  const spread = demoState.spreadBps / 10_000;

  const executionPrice = useMemo(() => {
    if (side === "buy") {
      return mid * (1 + spread / 2);
    }
    return mid * (1 - spread / 2);
  }, [mid, side, spread]);

  const notional = Number(quantity || 0) * executionPrice;
  const fee = (notional * demoState.tradingFeeBps) / 10_000;

  const submitTrade = () => {
    if (!quantity || Number(quantity) <= 0) {
      setResult("Enter a valid quantity.");
      return;
    }

    setResult(
      `Simulated ${side.toUpperCase()} ${formatAsset(Number(quantity), 6)} ${pair.split("/")[0]} at ${formatCurrency(executionPrice)}. Fee: ${formatCurrency(fee)}.`,
    );
  };

  return (
    <AppShell title="Trade" subtitle="Instant execution with simulated spread">
      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-medium">Place order</h2>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-1 text-sm text-slate-300">
              Pair
              <select
                value={pair}
                onChange={(e) => setPair(e.target.value as TradingPair)}
                className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
              >
                {pairs.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSide("buy")}
                className={`rounded-md px-3 py-2 text-sm font-medium ${side === "buy" ? "bg-emerald-500 text-black" : "border border-slate-700"}`}
              >
                Buy
              </button>
              <button
                onClick={() => setSide("sell")}
                className={`rounded-md px-3 py-2 text-sm font-medium ${side === "sell" ? "bg-rose-500 text-black" : "border border-slate-700"}`}
              >
                Sell
              </button>
            </div>

            <label className="grid gap-1 text-sm text-slate-300">
              Quantity ({pair.split("/")[0]})
              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
              />
            </label>

            <button
              onClick={submitTrade}
              className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-black"
            >
              Execute simulated trade
            </button>

            {result ? (
              <p className="rounded-md border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200">
                {result}
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="text-sm font-medium uppercase tracking-[0.15em] text-slate-400">Pricing</h3>
          <dl className="mt-4 grid gap-3 text-sm">
            <Row label="Mid Price" value={formatCurrency(mid)} />
            <Row label="Execution Price" value={formatCurrency(executionPrice)} />
            <Row label="Notional" value={formatCurrency(notional)} />
            <Row label="Trading Fee" value={formatCurrency(fee)} />
            <Row label="Spread" value={`${demoState.spreadBps} bps`} />
          </dl>
        </div>
      </section>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-700 px-3 py-2">
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
