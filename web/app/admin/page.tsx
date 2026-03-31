"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { demoState } from "@/lib/mock-data";
import type { SimulationState } from "@/lib/types";
import { adjustBalance, fetchDemoState, fetchSimulationState, getStoredAuth, saveAdminConfig } from "@/lib/api-client";

export default function AdminPage() {
  const [state, setState] = useState<SimulationState>(demoState);
  const [apy, setApy] = useState(String(demoState.apy));
  const [spread, setSpread] = useState(String(demoState.spreadBps));
  const [fee, setFee] = useState(String(demoState.tradingFeeBps));
  const [botEnabled, setBotEnabled] = useState(demoState.botConfig.enabled);
  const [botTrades, setBotTrades] = useState(String(demoState.botConfig.trades_per_minute));
  const [message, setMessage] = useState<{ msg: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  // Balance adjustment
  const [adjUserId, setAdjUserId] = useState("");
  const [adjAsset, setAdjAsset] = useState("USDT");
  const [adjDelta, setAdjDelta] = useState("");
  const [adjMsg, setAdjMsg] = useState<{ msg: string; ok: boolean } | null>(null);
  const [adjLoading, setAdjLoading] = useState(false);

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
    () => `APY ${apy}% · spread ${spread} bps · fee ${fee} bps · bot ${botEnabled ? "ON" : "OFF"} @ ${botTrades} tpm`,
    [apy, spread, fee, botEnabled, botTrades],
  );

  const isAdmin = getStoredAuth()?.role === "admin";

  const save = async () => {
    const auth = getStoredAuth();
    if (!auth) {
      setMessage({ msg: `[Demo mock] ${summary}`, ok: true });
      return;
    }
    if (!isAdmin) {
      setMessage({ msg: "Admin access required.", ok: false });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      await saveAdminConfig({
        apy: Number(apy),
        spreadBps: Number(spread),
        tradingFeeBps: Number(fee),
        bot: { enabled: botEnabled, tradesPerMinute: Number(botTrades) },
      });
      setMessage({ msg: `Config saved: ${summary}`, ok: true });
    } catch (error) {
      setMessage({ msg: (error as Error).message, ok: false });
    } finally {
      setLoading(false);
    }
  };

  const adjustBal = async () => {
    const auth = getStoredAuth();
    if (!auth || !isAdmin) {
      setAdjMsg({ msg: "Admin access required.", ok: false });
      return;
    }
    if (!adjUserId || !adjDelta) {
      setAdjMsg({ msg: "Fill all fields.", ok: false });
      return;
    }

    setAdjLoading(true);
    setAdjMsg(null);
    try {
      await adjustBalance(adjUserId, adjAsset, Number(adjDelta));
      setAdjMsg({ msg: `Balance adjusted: ${adjDelta} ${adjAsset} → user ${adjUserId.slice(0, 8)}…`, ok: true });
    } catch (error) {
      setAdjMsg({ msg: (error as Error).message, ok: false });
    } finally {
      setAdjLoading(false);
    }
  };

  return (
    <AppShell title="Admin" subtitle="Risk and platform controls">
      {!isAdmin && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-sm text-amber-300">
          You are viewing in demo mode. Log in as an admin to save changes.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Platform config */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-semibold mb-4">Platform Controls</h2>
          <div className="grid gap-3">
            <Field label="Earn APY (%)" value={apy} onChange={setApy} hint="Flexible product rate" />
            <Field label="Trading Spread (bps)" value={spread} onChange={setSpread} hint="1 bps = 0.01%" />
            <Field label="Trading Fee (bps)" value={fee} onChange={setFee} hint="Applied to notional" />
            <Field label="Bot Trades / Minute" value={botTrades} onChange={setBotTrades} />

            <label className="flex items-center gap-3 text-sm text-slate-300 rounded-lg border border-slate-700 px-3 py-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={botEnabled}
                onChange={(e) => setBotEnabled(e.target.checked)}
                className="h-4 w-4 accent-emerald-500"
              />
              <div>
                <p className="font-medium">Liquidity simulation bot</p>
                <p className="text-xs text-slate-500">Generates synthetic market trades for realism</p>
              </div>
            </label>

            <button
              onClick={save}
              disabled={loading}
              className="mt-1 w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 py-2.5 text-sm font-semibold text-black transition disabled:opacity-60"
            >
              {loading ? "Saving…" : "Save Config"}
            </button>

            {message && (
              <div className={`rounded-lg border px-3 py-2.5 text-xs ${
                message.ok ? "border-emerald-800/50 bg-emerald-950/30 text-emerald-300" : "border-rose-800/50 bg-rose-950/30 text-rose-400"
              }`}>
                {message.msg}
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-semibold mb-4">Operator Guidelines</h2>
          <ul className="space-y-2.5 text-sm text-slate-300">
            {[
              "APY should remain below modeled gross strategy return to maintain sustainability.",
              "Spread can be widened during high volatility windows; typical Binance spread is 1–5 bps.",
              "Bot cadence should avoid repetitive fixed-size patterns that users can exploit.",
              "Manual balance adjustments require an audit trail in the database.",
              "Admin endpoints require a JWT with role=admin; never share admin credentials.",
              "Fixed products earn 15% higher APY vs flexible to incentivize lockup.",
            ].map((note, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-slate-500 shrink-0">{i + 1}.</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Balance adjustment */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="font-semibold mb-4">Balance Adjustment</h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_140px_160px_auto]">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">User ID</label>
            <input
              value={adjUserId}
              onChange={(e) => setAdjUserId(e.target.value)}
              placeholder="MongoDB ObjectId"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Asset</label>
            <select
              value={adjAsset}
              onChange={(e) => setAdjAsset(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none"
            >
              {["USDT", "BTC", "ETH", "SOL", "BNB"].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Delta (+ add / − remove)</label>
            <input
              value={adjDelta}
              onChange={(e) => setAdjDelta(e.target.value)}
              placeholder="e.g. 1000 or -500"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none font-mono"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={adjustBal}
              disabled={adjLoading}
              className="w-full rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:border-emerald-500/50 hover:text-emerald-400 transition disabled:opacity-50"
            >
              {adjLoading ? "…" : "Apply"}
            </button>
          </div>
        </div>
        {adjMsg && (
          <div className={`mt-3 rounded-lg border px-3 py-2.5 text-xs ${
            adjMsg.ok ? "border-emerald-800/50 bg-emerald-950/30 text-emerald-300" : "border-rose-800/50 bg-rose-950/30 text-rose-400"
          }`}>
            {adjMsg.msg}
          </div>
        )}
      </div>

      {/* Current config snapshot */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="font-semibold mb-4 text-sm">Live Config Snapshot</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <Stat label="APY" value={`${state.apy}%`} />
          <Stat label="Spread" value={`${state.spreadBps} bps`} />
          <Stat label="Fee" value={`${state.tradingFeeBps} bps`} />
          <Stat label="Bot" value={state.botConfig.enabled ? `ON · ${state.botConfig.trades_per_minute} tpm` : "OFF"} />
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-slate-400">{label}</label>
        {hint && <span className="text-xs text-slate-600">{hint}</span>}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none transition font-mono"
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold mt-1 font-mono">{value}</p>
    </div>
  );
}
