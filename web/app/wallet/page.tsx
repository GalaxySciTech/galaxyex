import { AppShell } from "@/components/app-shell";
import { formatAsset, formatCurrency } from "@/lib/format";
import { getSimulationState } from "@/lib/sim-client";

export default async function WalletPage() {
  const state = await getSimulationState();

  return (
    <AppShell title="Wallet" subtitle="Internal custody ledger">
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-lg font-medium">Balances</h2>
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
        <h2 className="text-lg font-medium">Recent trades</h2>
        {state.trades.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">No trades yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="pb-2">Time</th>
                  <th className="pb-2">Pair</th>
                  <th className="pb-2">Side</th>
                  <th className="pb-2">Quantity</th>
                  <th className="pb-2">Price</th>
                  <th className="pb-2">Fee</th>
                </tr>
              </thead>
              <tbody>
                {state.trades.map((trade) => (
                  <tr key={trade.id} className="border-t border-slate-800">
                    <td className="py-2">{new Date(trade.created_at).toLocaleString()}</td>
                    <td className="py-2">{trade.pair}</td>
                    <td className={`py-2 font-medium ${trade.side === "buy" ? "text-emerald-400" : "text-rose-400"}`}>
                      {trade.side.toUpperCase()}
                    </td>
                    <td className="py-2">{formatAsset(trade.quantity, 6)}</td>
                    <td className="py-2">{formatCurrency(trade.price)}</td>
                    <td className="py-2 text-slate-400">{formatCurrency(trade.fee)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {state.yieldPositions.length > 0 && (
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-medium">Earn positions</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="pb-2">Started</th>
                  <th className="pb-2">Amount (USDT)</th>
                  <th className="pb-2">APY</th>
                  <th className="pb-2">Accrued</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {state.yieldPositions.map((pos) => (
                  <tr key={pos.id} className="border-t border-slate-800">
                    <td className="py-2">{new Date(pos.started_at).toLocaleDateString()}</td>
                    <td className="py-2">{formatCurrency(pos.amount)}</td>
                    <td className="py-2">{pos.apy}%</td>
                    <td className="py-2 text-emerald-400">+{formatCurrency(pos.accrued_profit)}</td>
                    <td className="py-2 capitalize">{pos.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </AppShell>
  );
}
