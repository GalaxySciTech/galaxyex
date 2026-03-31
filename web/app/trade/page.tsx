"use client";

import { useEffect, useMemo, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { KlineChart } from "@/components/trade/kline-chart";
import { OrderBook } from "@/components/trade/order-book";
import { RecentTrades } from "@/components/trade/recent-trades";
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
      {/* Pair selector bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {PAIRS.map((p) => {
          const pStats = state.marketStats?.[p];
          const change = pStats?.changePercent24h ?? 0;
          return (
            <button
              key={p}
              onClick={() => { setPair(p); setQuantity(""); setResult(null); }}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                pair === p
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                  : "border-slate-700 text-slate-300 hover:border-slate-600"
              }`}
            >
              <span className="font-medium">{p.replace("/USDT", "")}/USDT</span>
              {pStats && (
                <span className={`text-xs ${change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                </span>
              )}
            </button>
          );
        })}

        {/* Quick stats */}
        {stats && (
          <div className="ml-auto flex items-center gap-4 text-xs">
            <div className="flex flex-col">
              <span className="text-slate-500">24h High</span>
              <span className="font-mono text-slate-200">{stats.high24h.toLocaleString("en-US", { maximumFractionDigits: priceDecimals })}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500">24h Low</span>
              <span className="font-mono text-slate-200">{stats.low24h.toLocaleString("en-US", { maximumFractionDigits: priceDecimals })}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500">24h Volume</span>
              <span className="font-mono text-slate-200">
                {stats.volume24h >= 1e9 ? `$${(stats.volume24h / 1e9).toFixed(2)}B` : `$${(stats.volume24h / 1e6).toFixed(0)}M`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ═══ MAIN TRADING GRID ═══ Binance-style: [OrderBook | Chart | Trades] on top, [OrderForm] below */}
      <div className="grid gap-[1px] bg-slate-800 rounded-xl overflow-hidden" style={{ gridTemplateColumns: "260px 1fr 260px", gridTemplateRows: "480px auto" }}>

        {/* LEFT COLUMN — Order Book */}
        <div className="bg-slate-900 row-span-1">
          <OrderBook pair={pair} currentPrice={mid} priceDecimals={priceDecimals} />
        </div>

        {/* CENTER COLUMN — Chart */}
        <div className="bg-slate-900 row-span-1">
          <KlineChart pair={pair} />
        </div>

        {/* RIGHT COLUMN — Recent Market Trades */}
        <div className="bg-slate-900 row-span-1">
          <RecentTrades pair={pair} priceDecimals={priceDecimals} />
        </div>

        {/* BOTTOM SECTION — Order Entry + Balances (full width) */}
        <div className="bg-slate-900 col-span-3">
          <div className="grid gap-6 p-5 lg:grid-cols-[1fr_1fr_300px]">
            {/* Order form */}
            <div>
              {/* Buy / Sell tabs */}
              <div className="flex rounded-lg border border-slate-700 p-0.5 gap-0.5 mb-4">
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
              <div className="flex gap-3 mb-3 text-sm">
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

              <div className="grid gap-2.5">
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
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-mono focus:border-emerald-500 focus:outline-none transition"
                    />
                  ) : (
                    <div className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-mono text-slate-300">
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
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-mono focus:border-emerald-500 focus:outline-none transition"
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

                <button
                  onClick={submit}
                  disabled={loading}
                  className={`w-full rounded-lg py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
                    side === "buy"
                      ? "bg-emerald-500 hover:bg-emerald-400 text-black"
                      : "bg-rose-500 hover:bg-rose-400 text-white"
                  }`}
                >
                  {loading ? "Placing order…" : `${side === "buy" ? "Buy" : "Sell"} ${pair.split("/")[0]}`}
                </button>

                {result && (
                  <div className={`rounded-lg border px-3 py-2 text-xs ${
                    result.ok
                      ? "border-emerald-800/50 bg-emerald-950/30 text-emerald-300"
                      : "border-rose-800/50 bg-rose-950/30 text-rose-400"
                  }`}>
                    {result.msg}
                  </div>
                )}
              </div>
            </div>

            {/* Order totals & validation */}
            <div className="flex flex-col gap-3">
              {qty > 0 && (
                <div className="rounded-lg bg-slate-950/60 border border-slate-800 px-4 py-3 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-400">
                    <span>Notional</span>
                    <span className="font-mono text-slate-200">{formatCurrency(notional)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Fee ({state.tradingFeeBps / 100}%)</span>
                    <span className="font-mono text-slate-200">{formatCurrency(fee)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-1.5">
                    <span className="text-slate-400">{side === "buy" ? "Total Cost" : "You Receive"}</span>
                    <span className="font-mono font-medium text-slate-100">
                      {formatCurrency(side === "buy" ? notional + fee : notional - fee)}
                    </span>
                  </div>
                </div>
              )}

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

              {/* Market snapshot */}
              <div className="rounded-lg bg-slate-950/60 border border-slate-800 px-4 py-3">
                <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Market Info</h4>
                <dl className="grid gap-1.5 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Price</dt>
                    <dd className="font-mono font-medium">${mid.toLocaleString("en-US", { maximumFractionDigits: priceDecimals })}</dd>
                  </div>
                  {stats && (
                    <>
                      <div className="flex justify-between">
                        <dt className="text-slate-400">24h Change</dt>
                        <dd className={`font-mono font-medium ${stats.changePercent24h >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {stats.changePercent24h >= 0 ? "+" : ""}{stats.changePercent24h.toFixed(2)}%
                        </dd>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Spread</dt>
                    <dd className="font-mono">{state.spreadBps} bps</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Balances */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Balances</h4>
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

      {/* Trade History */}
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

export default function TradePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <TradePageInner />
    </Suspense>
  );
}
