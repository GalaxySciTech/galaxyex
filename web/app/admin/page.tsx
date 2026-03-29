"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { demoState } from "@/lib/mock-data";

export default function AdminPage() {
  const [apy, setApy] = useState(String(demoState.apy));
  const [spread, setSpread] = useState(String(demoState.spreadBps));
  const [fee, setFee] = useState(String(demoState.tradingFeeBps));
  const [botEnabled, setBotEnabled] = useState(demoState.botConfig.enabled);
  const [botTrades, setBotTrades] = useState(String(demoState.botConfig.trades_per_minute));
  const [message, setMessage] = useState("");

  const summary = useMemo(
    () =>
      `APY ${apy}% | spread ${spread} bps | fee ${fee} bps | bot ${botEnabled ? "ON" : "OFF"} @ ${botTrades} tpm`,
    [apy, spread, fee, botEnabled, botTrades],
  );

  return (
    <AppShell title="Admin" subtitle="Risk and growth controls">
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-medium">Platform controls</h2>
          <div className="mt-4 grid gap-3">
            <Field label="Displayed APY (%)" value={apy} onChange={setApy} />
            <Field label="Trading spread (bps)" value={spread} onChange={setSpread} />
            <Field label="Trading fee (bps)" value={fee} onChange={setFee} />
            <Field label="Bot trades / minute" value={botTrades} onChange={setBotTrades} />

            <label className="mt-1 flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={botEnabled}
                onChange={(e) => setBotEnabled(e.target.checked)}
                className="h-4 w-4"
              />
              Enable liquidity simulation bot
            </label>

            <button
              onClick={() => setMessage(`Saved config: ${summary}`)}
              className="mt-2 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-black"
            >
              Save config (mock)
            </button>

            {message ? (
              <p className="rounded-md border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200">
                {message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-medium">Operator notes</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li>- APY should remain below modeled gross strategy return.</li>
            <li>- Spread can be widened during high volatility windows.</li>
            <li>- Bot cadence should avoid repetitive fixed-size patterns.</li>
            <li>- Manual balance adjustments require audit trail in DB.</li>
          </ul>
        </div>
      </section>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm text-slate-300">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
      />
    </label>
  );
}
