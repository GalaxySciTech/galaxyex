import { demoState } from "@/lib/mock-data";
import { SimulationState } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_ENGINE_URL ?? "http://localhost:8080";

function convertToCamelCase(data: any): SimulationState {
  return {
    userId: data.userId,
    balances: data.balances.map((b: any) => ({
      id: b.id || `bal-${b.asset.toLowerCase()}`,
      user_id: data.userId,
      asset: b.asset,
      available: b.available,
      in_earn: b.inEarn,
      updated_at: b.updatedAt || new Date().toISOString(),
    })),
    trades: data.trades.map((t: any) => ({
      id: t.id,
      user_id: t.userId,
      pair: t.pair,
      side: t.side,
      quantity: t.quantity,
      price: t.price,
      fee: t.fee,
      status: t.status,
      created_at: t.createdAt,
    })),
    yieldPositions: data.yieldPositions.map((y: any) => ({
      id: y.id,
      user_id: y.userId,
      amount: y.amount,
      apy: y.apy,
      accrued_profit: y.accruedProfit,
      started_at: y.startedAt,
      last_accrued_at: y.lastAccruedAt,
      status: y.status,
    })),
    apy: data.apy,
    tradingFeeBps: data.tradingFeeBps,
    spreadBps: data.spreadBps,
    botConfig: {
      enabled: data.botConfig.enabled,
      trades_per_minute: data.botConfig.trades_per_minute,
      max_order_notional: data.botConfig.max_order_notional,
    },
    prices: data.prices,
  };
}

export async function getSimulationState(): Promise<SimulationState> {
  try {
    const response = await fetch(`${API_BASE}/api/state/demo-user-1`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return demoState;
    }

    const data = await response.json();
    return convertToCamelCase(data);
  } catch {
    return demoState;
  }
}
