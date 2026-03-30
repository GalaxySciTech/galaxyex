import { AppShell } from "@/components/app-shell";
import { formatAsset } from "@/lib/format";
import { getSimulationState } from "@/lib/sim-client";

const history = [
  {
    id: "wh-1",
    type: "admin_credit",
    asset: "USDT",
    amount: 5000,
    at: "2026-03-28 13:20 UTC",
    note: "Manual deposit approval",
  },
  {
    id: "wh-2",
    type: "earn_lock",
    asset: "USDT",
    amount: -3000,
    at: "2026-03-29 01:10 UTC",
    note: "Moved into earning pool",
  },
];

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
        <h2 className="text-lg font-medium">Ledger activity</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="pb-2">Time</th>
                <th className="pb-2">Type</th>
                <th className="pb-2">Asset</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id} className="border-t border-slate-800">
                  <td className="py-2">{item.at}</td>
                  <td className="py-2 uppercase">{item.type}</td>
                  <td className="py-2">{item.asset}</td>
                  <td className="py-2">{formatAsset(item.amount, 2)}</td>
                  <td className="py-2 text-slate-400">{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
