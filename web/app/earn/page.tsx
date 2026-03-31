"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { demoState } from "@/lib/mock-data";
import { formatCurrency, percent } from "@/lib/format";
import type { EarnProduct, SimulationState, YieldPositionRow } from "@/lib/types";
import { fetchDemoState, fetchSimulationState, getStoredAuth, redeemEarn, subscribeEarn } from "@/lib/api-client";

const EARN_PRODUCTS: EarnProduct[] = [
  { id: "flex", name: "Flexible Savings", apy: 12, minAmount: 10, maxAmount: 1_000_000, durationDays: 0, flexible: true, badge: "Flexible" },
  { id: "fixed-30", name: "30-Day Fixed", apy: 14, minAmount: 100, maxAmount: 500_000, durationDays: 30, flexible: false, badge: "30 Days" },
  { id: "fixed-90", name: "90-Day Fixed", apy: 18, minAmount: 500, maxAmount: 200_000, durationDays: 90, flexible: false, badge: "90 Days" },
];

function ProductCard({
  product,
  selected,
  onSelect,
}: {
  product: EarnProduct;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`text-left rounded-xl border p-5 transition ${
        selected
          ? "border-emerald-500 bg-emerald-500/8 shadow-emerald-900/20 shadow-lg"
          : "border-slate-700 bg-slate-900 hover:border-slate-600"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-sm">{product.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">{product.flexible ? "Redeem anytime" : `Lock ${product.durationDays} days`}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          product.flexible ? "bg-slate-700 text-slate-300" : "bg-amber-500/20 text-amber-300"
        }`}>
          {product.badge}
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold text-emerald-400">{percent(product.apy)}</p>
      <p className="text-xs text-slate-500 mt-0.5">APY</p>
      <p className="mt-2 text-xs text-slate-500">Min: {formatCurrency(product.minAmount)}</p>
    </button>
  );
}

export default function EarnPage() {
  const [state, setState] = useState<SimulationState>(demoState);
  const [selectedProduct, setSelectedProduct] = useState<EarnProduct>(EARN_PRODUCTS[0]);
  const [amount, setAmount] = useState("1000");
  const [message, setMessage] = useState<{ msg: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const load = async () => {
    const auth = getStoredAuth();
    try {
      const s = await (auth ? fetchSimulationState() : fetchDemoState());
      setState(s);
    } catch {
      setState(demoState);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const numericAmount = Number(amount || 0);
  const usdtBal = state.balances.find((b) => b.asset === "USDT");

  const projections = useMemo(() => {
    const apy = selectedProduct.apy;
    const daily = (numericAmount * apy) / 100 / 365;
    const monthly = daily * 30;
    const yearly = (numericAmount * apy) / 100;
    return { daily, monthly, yearly };
  }, [numericAmount, selectedProduct.apy]);

  const enroll = async () => {
    if (!amount || numericAmount < selectedProduct.minAmount) {
      setMessage({ msg: `Minimum amount is ${formatCurrency(selectedProduct.minAmount)}.`, ok: false });
      return;
    }

    const auth = getStoredAuth();
    if (!auth) {
      setMessage({
        msg: `[Demo] Enrolled ${formatCurrency(numericAmount)} in ${selectedProduct.name} at ${percent(selectedProduct.apy)} APY.`,
        ok: true,
      });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const { position } = await subscribeEarn(
        numericAmount,
        selectedProduct.name,
        selectedProduct.durationDays,
        selectedProduct.flexible,
      );
      setMessage({
        msg: `Enrolled ${formatCurrency(position.amount)} in ${position.productName} at ${percent(position.apy)} APY.`,
        ok: true,
      });
      setAmount("1000");
      await load();
    } catch (error) {
      setMessage({ msg: (error as Error).message, ok: false });
    } finally {
      setLoading(false);
    }
  };

  const redeem = async (pos: YieldPositionRow) => {
    const auth = getStoredAuth();
    if (!auth) {
      setMessage({ msg: "[Demo] Redemption requires login.", ok: false });
      return;
    }

    setRedeemingId(pos.id);
    setMessage(null);
    try {
      const { redeemed } = await redeemEarn(pos.id);
      setMessage({ msg: `Redeemed ${formatCurrency(redeemed)} to your USDT balance.`, ok: true });
      await load();
    } catch (error) {
      setMessage({ msg: (error as Error).message, ok: false });
    } finally {
      setRedeemingId(null);
    }
  };

  const activePositions = state.yieldPositions.filter((p) => p.status === "active");
  const totalEarned = activePositions.reduce((s, p) => s + p.accrued_profit, 0);
  const totalInEarn = activePositions.reduce((s, p) => s + p.amount, 0);

  return (
    <AppShell title="Earn" subtitle="Fixed APY products with daily accrual">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="In Earn" value={formatCurrency(totalInEarn)} />
        <StatCard label="Total Earned" value={formatCurrency(totalEarned)} highlight />
        <StatCard label="Active Positions" value={String(activePositions.length)} />
        <StatCard label="Available USDT" value={formatCurrency(usdtBal?.available ?? 0)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Products */}
        <div className="space-y-5">
          <div>
            <h2 className="text-base font-semibold mb-3">Choose a product</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {EARN_PRODUCTS.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  selected={selectedProduct.id === p.id}
                  onSelect={() => setSelectedProduct(p)}
                />
              ))}
            </div>
          </div>

          {/* Subscribe form */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-sm font-semibold mb-4">Subscribe to {selectedProduct.name}</h3>
            <div className="grid gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-400">Deposit Amount (USDT)</label>
                  {usdtBal && (
                    <button
                      onClick={() => setAmount(String(Math.floor(usdtBal.available)))}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      Max: {formatCurrency(usdtBal.available)}
                    </button>
                  )}
                </div>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-mono focus:border-emerald-500 focus:outline-none transition"
                  placeholder="0.00"
                />
              </div>

              {/* Quick amounts */}
              <div className="grid grid-cols-4 gap-1.5">
                {[500, 1000, 5000, 10000].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(String(v))}
                    className="rounded-md border border-slate-700 py-1 text-xs text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400 transition"
                  >
                    {v >= 1000 ? `${v / 1000}K` : v}
                  </button>
                ))}
              </div>

              <button
                onClick={enroll}
                disabled={loading}
                className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 py-3 text-sm font-semibold text-black transition disabled:opacity-60"
              >
                {loading ? "Processing…" : `Subscribe ${selectedProduct.name}`}
              </button>

              {message && (
                <div className={`rounded-lg border px-3 py-2.5 text-xs ${
                  message.ok
                    ? "border-emerald-800/50 bg-emerald-950/30 text-emerald-300"
                    : "border-rose-800/50 bg-rose-950/30 text-rose-400"
                }`}>
                  {message.msg}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Projection panel */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 h-fit">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Earnings Projection</h3>
          <dl className="grid gap-3 text-sm">
            <Metric label="Product" value={selectedProduct.name} />
            <Metric label="APY" value={percent(selectedProduct.apy)} highlight />
            <Metric label="Daily Est." value={formatCurrency(projections.daily)} />
            <Metric label="Monthly Est." value={formatCurrency(projections.monthly)} />
            <Metric label="Yearly Est." value={formatCurrency(projections.yearly)} />
            <Metric
              label="Lock Period"
              value={selectedProduct.flexible ? "None (Flexible)" : `${selectedProduct.durationDays} days`}
            />
          </dl>
        </div>
      </div>

      {/* Active positions */}
      {activePositions.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h2 className="font-semibold text-sm">Active Positions ({activePositions.length})</h2>
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
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {activePositions.map((pos) => (
                  <tr key={pos.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition">
                    <td className="px-4 py-3">
                      <p className="font-medium">{pos.product_name}</p>
                      <p className="text-xs text-slate-500">{pos.flexible ? "Flexible" : `${pos.duration_days}d fixed`}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(pos.amount)}</td>
                    <td className="px-4 py-3 text-right">{pos.apy}%</td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-mono">+{formatCurrency(pos.accrued_profit)}</td>
                    <td className="px-4 py-3 text-right text-slate-400 hidden sm:table-cell text-xs">
                      {new Date(pos.started_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {pos.flexible && (
                        <button
                          onClick={() => redeem(pos)}
                          disabled={redeemingId === pos.id}
                          className="text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-900/50 hover:border-emerald-700 rounded px-2 py-0.5 transition disabled:opacity-50"
                        >
                          {redeemingId === pos.id ? "…" : "Redeem"}
                        </button>
                      )}
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

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1.5 text-xl font-bold ${highlight ? "text-emerald-400" : ""}`}>{value}</p>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-700/50 px-3 py-2 text-xs">
      <dt className="text-slate-400">{label}</dt>
      <dd className={`font-medium ${highlight ? "text-emerald-400" : ""}`}>{value}</dd>
    </div>
  );
}
