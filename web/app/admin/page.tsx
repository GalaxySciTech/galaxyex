"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { demoState } from "@/lib/mock-data";
import type { SimulationState } from "@/lib/types";
import { fetchDemoState, fetchSimulationState, getStoredAuth, saveAdminConfig } from "@/lib/api-client";

export default function AdminPage() {
  const [, setState] = useState<SimulationState>(demoState);
  const [apy, setApy] = useState(String(demoState.apy));
  const [spread, setSpread] = useState(String(demoState.spreadBps));
  const [fee, setFee] = useState(String(demoState.tradingFeeBps));
  const [botEnabled, setBotEnabled] = useState(demoState.botConfig.enabled);
  const [botTrades, setBotTrades] = useState(String(demoState.botConfig.trades_per_minute));
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const auth = getStoredAuth();
    const load = auth ? fetchSimulationState() : fetchDemoState();
    load
      .then((s) => {
        setState(s);
        setApy(String(s.apy));
        setSpread(String(s.spreadBps));
        setFee(String(s.tradingFeeBps));
        setBotEnabled(s.botConfig.enabled);
        setBotTrades(String(s.botConfig.trades_per_minute));
      })
      .catch(() => setState(demoState));
  }, []);

  const summary = useMemo(
    () => `APY ${apy}% | spread ${spread} bps | fee ${fee} bps | bot ${botEnabled ? "ON" : "OFF"} @ ${botTrades} tpm`,
    [apy, spread, fee, botEnabled, botTrades],
  );

  const save = async () => {
    const auth = getStoredAuth();
    if (!auth) {
      setMessage(`Saved config (mock): ${summary}`);
      return;
    }
    if (auth.role !== "admin") {
      setMessage("Admin access required.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      await saveAdminConfig({
        apy: Number(apy),
        spreadBps: Number(spread),
        tradingFeeBps: Number(fee),
        bot: {
          enabled: botEnabled,
          tradesPerMinute: Number(botTrades),
        },
      });
      setMessage(`Config saved: ${summary} ✓`);
    } catch (error) {
      setMessage(`Error: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

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
              onClick={save}
              disabled={loading}
              className="mt-2 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
            >
              {loading ? "Saving…" : "Save config"}
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
            <li>- Admin endpoints require a JWT with role=admin.</li>
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
