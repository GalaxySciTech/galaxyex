import { demoState } from "@/lib/mock-data";
import { SimulationState } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_ENGINE_URL ?? "http://localhost:8080";

type RawState = {
  userId: string;
  balances: Array<{ asset: string; available: number; inEarn: number }>;
  trades: Array<{
    id: string;
    userId: string;
    pair: string;
    side: string;
    quantity: number;
    price: number;
    fee: number;
    status: "filled";
    createdAt: string;
  }>;
  yieldPositions: Array<{
    id: string;
    userId: string;
    amount: number;
    apy: number;
    accruedProfit: number;
    startedAt: string;
    lastAccruedAt: string;
    status: "active" | "closed";
  }>;
  apy: number;
  tradingFeeBps: number;
  spreadBps: number;
  botConfig: { enabled: boolean; trades_per_minute: number; max_order_notional: number };
  prices: Record<string, number>;
};

function normalizeState(data: RawState): SimulationState {
  return {
    userId: data.userId,
    balances: data.balances.map((b, i) => ({
      id: `bal-${b.asset.toLowerCase()}-${i}`,
      user_id: data.userId,
      asset: b.asset as SimulationState["balances"][number]["asset"],
      available: b.available,
      in_earn: b.inEarn,
      updated_at: new Date().toISOString(),
    })),
    trades: data.trades.map((t) => ({
      id: t.id,
      user_id: t.userId,
      pair: t.pair as SimulationState["trades"][number]["pair"],
      side: t.side as "buy" | "sell",
      quantity: t.quantity,
      price: t.price,
      fee: t.fee,
      status: t.status,
      created_at: t.createdAt,
    })),
    yieldPositions: data.yieldPositions.map((y) => ({
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
    prices: data.prices as SimulationState["prices"],
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

    const data = (await response.json()) as RawState;
    return normalizeState(data);
  } catch {
    return demoState;
  }
}
