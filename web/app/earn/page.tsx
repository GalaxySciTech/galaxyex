"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { demoState } from "@/lib/mock-data";
import { formatCurrency, percent } from "@/lib/format";

export default function EarnPage() {
  const [amount, setAmount] = useState("1000");
  const [message, setMessage] = useState("");

  const numericAmount = Number(amount || 0);

  const projections = useMemo(() => {
    const daily = (numericAmount * demoState.apy) / 100 / 365;
    const monthly = daily * 30;
    const yearly = (numericAmount * demoState.apy) / 100;

    return { daily, monthly, yearly };
  }, [numericAmount]);

  const enroll = () => {
    if (!amount || numericAmount <= 0) {
      setMessage("Enter an amount greater than 0.");
      return;
    }

    setMessage(
      `Enrolled ${formatCurrency(numericAmount)} in simulation earning pool at ${percent(demoState.apy)} APY.`,
    );
  };

  return (
    <AppShell title="Earn" subtitle="Fixed APY product with daily accrual">
      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-medium">Earning pool</h2>
          <p className="mt-2 text-sm text-slate-300">
            Product is configured as fixed-rate simulation with daily accrual snapshots.
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
            className="mt-4 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-black"
          >
            Join earning pool
          </button>

          {message ? (
            <p className="mt-4 rounded-md border border-slate-700 bg-slate-950 p-3 text-sm">{message}</p>
          ) : null}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="text-sm font-medium uppercase tracking-[0.15em] text-slate-400">Projection</h3>
          <dl className="mt-4 grid gap-3 text-sm">
            <Metric label="APY" value={percent(demoState.apy)} />
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
