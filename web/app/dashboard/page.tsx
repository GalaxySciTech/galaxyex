"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { formatAsset, formatCurrency, percent } from "@/lib/format";
import type { SimulationState } from "@/lib/types";
import { demoState } from "@/lib/mock-data";
import { fetchDemoState, fetchSimulationState, getStoredAuth } from "@/lib/api-client";

export default function DashboardPage() {
  const [state, setState] = useState<SimulationState>(demoState);

  useEffect(() => {
    const auth = getStoredAuth();
    const load = auth ? fetchSimulationState() : fetchDemoState();
    load.then(setState).catch(() => setState(demoState));
  }, []);

  const totalSpot = state.balances.reduce((sum, b) => {
    if (b.asset === "USDT") return sum + b.available;
    const pair = `${b.asset}/USDT` as const;
    const px = state.prices[pair] ?? 0;
    return sum + b.available * px;
  }, 0);

  const totalEarn = state.yieldPositions
    .filter((p) => p.status === "active")
    .reduce((sum, p) => sum + p.amount + p.accrued_profit, 0);

  const dailyRate = state.apy / 365;

  return (
    <AppShell title="Dashboard" subtitle="Portfolio + earnings overview">
      <section className="grid gap-4 md:grid-cols-3">
        <Card label="Spot Value" value={formatCurrency(totalSpot)} />
        <Card label="Earn Value" value={formatCurrency(totalEarn)} />
        <Card label="Pool APY" value={percent(state.apy)} />
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-lg font-medium">Internal balances</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {state.balances.map((balance) => (
            <div key={balance.id} className="rounded-lg border border-slate-700 bg-slate-950 p-4">
              <p className="text-sm text-slate-400">{balance.asset}</p>
              <p className="mt-1 text-lg font-semibold">{formatAsset(balance.available)}</p>
              <p className="text-xs text-slate-500">In earn: {formatAsset(balance.in_earn)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-lg font-medium">Earnings snapshot</h2>
        <p className="mt-2 text-sm text-slate-300">
          Current fixed APY is {percent(state.apy)} with daily credit rate of {percent(dailyRate)}.
          Earnings are accrued daily via the engine worker.
        </p>
      </section>
    </AppShell>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
