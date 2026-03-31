"use client";

import { useEffect, useMemo, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { demoState } from "@/lib/mock-data";
import { formatAsset, formatCurrency } from "@/lib/format";
import type { SimulationState, TradingPair } from "@/lib/types";
import {
  cancelOrder,
  executeTrade,
  fetchDemoState,
  fetchSimulationState,
  getStoredAuth,
  placeLimitOrder,
} from "@/lib/api-client";

const PAIRS: TradingPair[] = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT"];
const PCT_BUTTONS = [25, 50, 75, 100];

function TradePageInner() {
  const searchParams = useSearchParams();
  const initialPair = (searchParams.get("pair") as TradingPair) ?? "BTC/USDT";

  const [state, setState] = useState<SimulationState>(demoState);
  const [pair, setPair] = useState<TradingPair>(PAIRS.includes(initialPair) ? initialPair : "BTC/USDT");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [quantity, setQuantity] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [result, setResult] = useState<{ msg: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const auth = getStoredAuth();
    try {
      const s = await (auth ? fetchSimulationState() : fetchDemoState());
      setState(s);
    } catch {
      setState(demoState);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [load]);

  const mid = state.prices[pair] ?? 0;
  const spread = state.spreadBps / 10_000;
  const stats = state.marketStats?.[pair];

  const executionPrice = useMemo(() => {
    if (orderType === "limit" && limitPrice) return Number(limitPrice);
    return side === "buy" ? mid * (1 + spread / 2) : mid * (1 - spread / 2);
  }, [mid, side, spread, orderType, limitPrice]);

  const qty = Number(quantity || 0);
  const notional = qty * executionPrice;
  const fee = (notional * state.tradingFeeBps) / 10_000;

  const usdtBal = state.balances.find((b) => b.asset === "USDT");
  const baseBal = state.balances.find((b) => b.asset === pair.split("/")[0]);

  const applyPct = (pct: number) => {
    if (side === "buy" && usdtBal) {
      const maxNotional = usdtBal.available * (pct / 100);
      const maxQty = maxNotional / (executionPrice * (1 + state.tradingFeeBps / 10_000));
      setQuantity(maxQty.toFixed(6));
    } else if (side === "sell" && baseBal) {
      setQuantity((baseBal.available * (pct / 100)).toFixed(6));
    }
  };

  const submit = async () => {
    if (!quantity || qty <= 0) {
      setResult({ msg: "Enter a valid quantity.", ok: false });
      return;
    }

    const auth = getStoredAuth();
    if (!auth) {
      setResult({
        msg: `[Demo] ${side.toUpperCase()} ${formatAsset(qty, 6)} ${pair.split("/")[0]} @ ${formatCurrency(executionPrice)}`,
        ok: true,
      });
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      if (orderType === "market") {
        const { trade } = await executeTrade(pair, side, qty);
        setResult({
          msg: `${side.toUpperCase()} ${formatAsset(trade.quantity, 6)} ${pair.split("/")[0]} @ ${formatCurrency(trade.price)} — Fee: ${formatCurrency(trade.fee)}`,
          ok: true,
        });
      } else {
        if (!limitPrice || Number(limitPrice) <= 0) {
          setResult({ msg: "Enter a valid limit price.", ok: false });
          setLoading(false);
          return;
        }
        const { order } = await placeLimitOrder(pair, side, qty, Number(limitPrice));
        setResult({
          msg: `Limit order placed — ${side.toUpperCase()} ${formatAsset(order.quantity, 6)} ${pair.split("/")[0]} @ ${formatCurrency(order.limitPrice)}`,
          ok: true,
        });
      }
      setQuantity("");
      await load();
    } catch (error) {
      setResult({ msg: (error as Error).message, ok: false });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const auth = getStoredAuth();
    if (!auth) return;
    try {
      await cancelOrder(orderId);
      await load();
    } catch (error) {
      setResult({ msg: (error as Error).message, ok: false });
    }
  };

  const priceDecimals = mid > 100 ? 2 : 4;

  return (
    <AppShell title="Trade" subtitle="Spot trading with market & limit orders">
      {/* Pair selector */}
      <div className="flex gap-2 flex-wrap">
        {PAIRS.map((p) => {
          const pStats = state.marketStats?.[p];
          const change = pStats?.changePercent24h ?? 0;
          return (
            <button
              key={p}
              onClick={() => { setPair(p); setQuantity(""); setResult(null); }}
              className={`rounded-lg border px-4 py-2.5 text-sm transition ${
                pair === p
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                  : "border-slate-700 text-slate-300 hover:border-slate-600"
              }`}
            >
              <span className="font-medium">{p.replace("/USDT", "")}/USDT</span>
              {pStats && (
                <span className={`ml-2 text-xs ${change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Order form */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          {/* Buy / Sell tabs */}
          <div className="flex rounded-lg border border-slate-700 p-0.5 gap-0.5 mb-5">
            <button
              onClick={() => { setSide("buy"); setQuantity(""); }}
              className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
                side === "buy" ? "bg-emerald-500 text-black shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => { setSide("sell"); setQuantity(""); }}
              className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
                side === "sell" ? "bg-rose-500 text-white shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Sell
            </button>
          </div>

          {/* Order type */}
          <div className="flex gap-3 mb-4 text-sm">
            {(["market", "limit"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setOrderType(t); setLimitPrice(""); }}
                className={`capitalize px-3 py-1 rounded-md transition ${
                  orderType === t
                    ? "bg-slate-700 text-slate-100 font-medium"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="grid gap-3">
            {/* Price field */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                {orderType === "limit" ? "Limit Price (USDT)" : "Market Price (USDT)"}
              </label>
              {orderType === "limit" ? (
                <input
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder={mid.toFixed(priceDecimals)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-mono focus:border-emerald-500 focus:outline-none transition"
                />
              ) : (
                <div className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm font-mono text-slate-300">
                  {formatCurrency(executionPrice)} <span className="text-xs text-slate-500">(market)</span>
                </div>
              )}
            </div>

            {/* Quantity */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-400">
                  Amount ({pair.split("/")[0]})
                </label>
                {baseBal && (
                  <span className="text-xs text-slate-500">
                    Avail: {formatAsset(baseBal.available, 6)} {pair.split("/")[0]}
                  </span>
                )}
              </div>
              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-mono focus:border-emerald-500 focus:outline-none transition"
              />
            </div>

            {/* PCT quick fill */}
            <div className="grid grid-cols-4 gap-1.5">
              {PCT_BUTTONS.map((pct) => (
                <button
                  key={pct}
                  onClick={() => applyPct(pct)}
                  className="rounded-md border border-slate-700 py-1 text-xs text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400 transition"
                >
                  {pct}%
                </button>
              ))}
            </div>

            {/* Totals */}
            {qty > 0 && (
              <div className="rounded-lg bg-slate-950/60 border border-slate-800 px-3 py-2.5 text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Notional</span>
                  <span className="font-mono text-slate-200">{formatCurrency(notional)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Fee ({state.tradingFeeBps / 100}%)</span>
                  <span className="font-mono text-slate-200">{formatCurrency(fee)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-1">
                  <span className="text-slate-400">{side === "buy" ? "Total Cost" : "You Receive"}</span>
                  <span className="font-mono font-medium text-slate-100">
                    {formatCurrency(side === "buy" ? notional + fee : notional - fee)}
                  </span>
                </div>
              </div>
            )}

            {/* Validation */}
            {side === "buy" && usdtBal && notional + fee > usdtBal.available && (
              <p className="rounded-lg border border-rose-800 bg-rose-950/40 px-3 py-2 text-xs text-rose-400">
                Insufficient USDT — need {formatCurrency(notional + fee)}, available {formatCurrency(usdtBal.available)}
              </p>
            )}
            {side === "sell" && baseBal && qty > baseBal.available && (
              <p className="rounded-lg border border-rose-800 bg-rose-950/40 px-3 py-2 text-xs text-rose-400">
                Insufficient {pair.split("/")[0]} — need {formatAsset(qty, 6)}, available {formatAsset(baseBal.available, 6)}
              </p>
            )}

            <button
              onClick={submit}
              disabled={loading}
              className={`mt-1 w-full rounded-lg py-3 text-sm font-semibold transition disabled:opacity-60 ${
                side === "buy"
                  ? "bg-emerald-500 hover:bg-emerald-400 text-black"
                  : "bg-rose-500 hover:bg-rose-400 text-white"
              }`}
            >
              {loading ? "Placing order…" : `${side === "buy" ? "Buy" : "Sell"} ${pair.split("/")[0]}`}
            </button>

            {result && (
              <div className={`rounded-lg border px-3 py-2.5 text-xs ${
                result.ok
                  ? "border-emerald-800/50 bg-emerald-950/30 text-emerald-300"
                  : "border-rose-800/50 bg-rose-950/30 text-rose-400"
              }`}>
                {result.msg}
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-4">
          {/* Market snapshot */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Market</h3>
            <dl className="grid gap-2 text-sm">
              <StatRow label="Price" value={`$${mid.toLocaleString("en-US", { maximumFractionDigits: priceDecimals })}`} />
              {stats && (
                <>
                  <StatRow
                    label="24h Change"
                    value={`${stats.changePercent24h >= 0 ? "+" : ""}${stats.changePercent24h.toFixed(2)}%`}
                    className={stats.changePercent24h >= 0 ? "text-emerald-400" : "text-rose-400"}
                  />
                  <StatRow label="24h High" value={`$${stats.high24h.toLocaleString("en-US", { maximumFractionDigits: priceDecimals })}`} />
                  <StatRow label="24h Low" value={`$${stats.low24h.toLocaleString("en-US", { maximumFractionDigits: priceDecimals })}`} />
                  <StatRow
                    label="Volume"
                    value={stats.volume24h >= 1e9 ? `$${(stats.volume24h / 1e9).toFixed(2)}B` : `$${(stats.volume24h / 1e6).toFixed(0)}M`}
                  />
                </>
              )}
              <StatRow label="Spread" value={`${state.spreadBps} bps`} />
            </dl>
          </div>

          {/* Available balances */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Balances</h3>
            <div className="grid gap-2">
              {state.balances.map((b) => (
                <div key={b.asset} className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">{b.asset}</span>
                  <span className="font-mono font-medium">{formatAsset(b.available)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Open Limit Orders */}
      {state.openOrders.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h2 className="font-semibold text-sm">Open Orders ({state.openOrders.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs">
                  <th className="px-4 py-2.5 text-left">Pair</th>
                  <th className="px-4 py-2.5 text-left">Side</th>
                  <th className="px-4 py-2.5 text-right">Qty</th>
                  <th className="px-4 py-2.5 text-right">Limit</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {state.openOrders.map((o) => (
                  <tr key={o.id} className="border-b border-slate-800/50">
                    <td className="px-4 py-2.5">{o.pair}</td>
                    <td className={`px-4 py-2.5 font-medium ${o.side === "buy" ? "text-emerald-400" : "text-rose-400"}`}>
                      {o.side.toUpperCase()}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatAsset(o.quantity, 6)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(o.limit_price)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handleCancelOrder(o.id)}
                        className="text-xs text-rose-400 hover:text-rose-300 border border-rose-900/50 hover:border-rose-700 rounded px-2 py-0.5 transition"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Trades */}
      {state.trades.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <h2 className="font-semibold text-sm">Trade History</h2>
            <span className="text-xs text-slate-500">
              {state.tradePagination.total} total
            </span>
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
                  <th className="px-4 py-2.5 text-right">Fee</th>
                </tr>
              </thead>
              <tbody>
                {state.trades.filter((t) => t.pair === pair).slice(0, 10).map((t) => (
                  <tr key={t.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition">
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{new Date(t.created_at).toLocaleTimeString()}</td>
                    <td className="px-4 py-2.5">{t.pair}</td>
                    <td className={`px-4 py-2.5 font-medium ${t.side === "buy" ? "text-emerald-400" : "text-rose-400"}`}>
                      {t.side.toUpperCase()}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatAsset(t.quantity, 6)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(t.price)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-400 font-mono">{formatCurrency(t.fee)}</td>
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

function StatRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-400">{label}</dt>
      <dd className={`font-mono font-medium ${className ?? ""}`}>{value}</dd>
    </div>
  );
}

export default function TradePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <TradePageInner />
    </Suspense>
  );
}
