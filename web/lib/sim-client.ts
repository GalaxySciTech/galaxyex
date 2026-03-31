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
  tradePagination: { page: number; limit: number; total: number; pages: number };
  yieldPositions: Array<{
    id: string;
    userId: string;
    amount: number;
    apy: number;
    accruedProfit: number;
    startedAt: string;
    lastAccruedAt: string;
    redeemedAt?: string;
    status: "active" | "closed";
    productName?: string;
    durationDays?: number;
    flexible?: boolean;
  }>;
  openOrders: Array<{
    id: string;
    userId: string;
    pair: string;
    side: string;
    quantity: number;
    limitPrice: number;
    filledQuantity: number;
    status: "open" | "filled" | "cancelled";
    createdAt: string;
  }>;
  apy: number;
  tradingFeeBps: number;
  spreadBps: number;
  botConfig: { enabled: boolean; trades_per_minute: number; max_order_notional: number };
  prices: Record<string, number>;
  marketStats?: Record<string, {
    pair: string;
    price: number;
    open24h: number;
    high24h: number;
    low24h: number;
    volume24h: number;
    changePercent24h: number;
  }>;
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
    tradePagination: data.tradePagination ?? { page: 1, limit: 25, total: 0, pages: 1 },
    yieldPositions: data.yieldPositions.map((y) => ({
      id: y.id,
      user_id: y.userId,
      amount: y.amount,
      apy: y.apy,
      accrued_profit: y.accruedProfit,
      started_at: y.startedAt,
      last_accrued_at: y.lastAccruedAt,
      redeemed_at: y.redeemedAt,
      status: y.status,
      product_name: y.productName ?? "Flexible Savings",
      duration_days: y.durationDays ?? 0,
      flexible: y.flexible ?? true,
    })),
    openOrders: (data.openOrders ?? []).map((o) => ({
      id: o.id,
      user_id: o.userId,
      pair: o.pair as SimulationState["trades"][number]["pair"],
      side: o.side as "buy" | "sell",
      quantity: o.quantity,
      limit_price: o.limitPrice,
      filled_quantity: o.filledQuantity,
      status: o.status,
      created_at: o.createdAt,
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
    marketStats: (Object.fromEntries(
      Object.entries(data.marketStats ?? {}).map(([k, v]) => [k, {
        pair: v.pair as SimulationState["trades"][number]["pair"],
        price: v.price,
        open24h: v.open24h,
        high24h: v.high24h,
        low24h: v.low24h,
        volume24h: v.volume24h,
        changePercent24h: v.changePercent24h,
      }])
    )) as SimulationState["marketStats"],
  };
}

export async function getSimulationState(): Promise<SimulationState> {
  try {
    const response = await fetch(`${API_BASE}/api/state/demo`, {
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
