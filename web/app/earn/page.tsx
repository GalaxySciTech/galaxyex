"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { demoState } from "@/lib/mock-data";
import { formatCurrency, percent } from "@/lib/format";
import type { SimulationState } from "@/lib/types";
import { fetchDemoState, fetchSimulationState, getStoredAuth, subscribeEarn } from "@/lib/api-client";

export default function EarnPage() {
  const [state, setState] = useState<SimulationState>(demoState);
  const [amount, setAmount] = useState("1000");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const auth = getStoredAuth();
    const load = auth ? fetchSimulationState() : fetchDemoState();
    load.then(setState).catch(() => setState(demoState));
  }, []);

  const numericAmount = Number(amount || 0);

  const projections = useMemo(() => {
    const daily = (numericAmount * state.apy) / 100 / 365;
    const monthly = daily * 30;
    const yearly = (numericAmount * state.apy) / 100;
    return { daily, monthly, yearly };
  }, [numericAmount, state.apy]);

  const enroll = async () => {
    if (!amount || numericAmount <= 0) {
      setMessage("Enter an amount greater than 0.");
      return;
    }

    const auth = getStoredAuth();
    if (!auth) {
      setMessage(
        `Enrolled ${formatCurrency(numericAmount)} in simulation earning pool at ${percent(state.apy)} APY.`,
      );
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const { position } = await subscribeEarn(numericAmount);
      setMessage(
        `Enrolled ${formatCurrency(position.amount)} at ${percent(position.apy)} APY. ✓`,
      );
      const updated = await fetchSimulationState();
      setState(updated);
    } catch (error) {
      setMessage(`Error: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Earn" subtitle="Fixed APY product with daily accrual">
      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-medium">Earning pool</h2>
          <p className="mt-2 text-sm text-slate-300">
            Fixed-rate simulation with daily accrual snapshots.
          </p>

          <label className="mt-5 grid gap-1 text-sm text-slate-300">
            Deposit amount (USDT)
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
            />
          </label>

          <button
            onClick={enroll}
            disabled={loading}
            className="mt-4 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
          >
            {loading ? "Processing…" : "Join earning pool"}
          </button>

          {message ? (
            <p className="mt-4 rounded-md border border-slate-700 bg-slate-950 p-3 text-sm">{message}</p>
          ) : null}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="text-sm font-medium uppercase tracking-[0.15em] text-slate-400">Projection</h3>
          <dl className="mt-4 grid gap-3 text-sm">
            <Metric label="APY" value={percent(state.apy)} />
            <Metric label="Daily Est." value={formatCurrency(projections.daily)} />
            <Metric label="Monthly Est." value={formatCurrency(projections.monthly)} />
            <Metric label="Yearly Est." value={formatCurrency(projections.yearly)} />
          </dl>
        </div>
      </section>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-700 px-3 py-2">
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
