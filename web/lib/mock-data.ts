import { SimulationState } from "@/lib/types";

const now = new Date().toISOString();

export const demoState: SimulationState = {
  userId: "demo-user-1",
  balances: [
    {
      id: "bal-usdt",
      user_id: "demo-user-1",
      asset: "USDT",
      available: 12450.73,
      in_earn: 3000,
      updated_at: now,
    },
    {
      id: "bal-btc",
      user_id: "demo-user-1",
      asset: "BTC",
      available: 0.1842,
      in_earn: 0,
      updated_at: now,
    },
    {
      id: "bal-eth",
      user_id: "demo-user-1",
      asset: "ETH",
      available: 2.912,
      in_earn: 0,
      updated_at: now,
    },
  ],
  trades: [
    {
      id: "tr-1",
      user_id: "demo-user-1",
      pair: "BTC/USDT",
      side: "buy",
      quantity: 0.021,
      price: 65320,
      fee: 2.74,
      status: "filled",
      created_at: now,
    },
    {
      id: "tr-2",
      user_id: "demo-user-1",
      pair: "ETH/USDT",
      side: "sell",
      quantity: 0.75,
      price: 3445,
      fee: 1.29,
      status: "filled",
      created_at: now,
    },
  ],
  yieldPositions: [
    {
      id: "yp-1",
      user_id: "demo-user-1",
      amount: 3000,
      apy: 12,
      accrued_profit: 37.56,
      started_at: now,
      last_accrued_at: now,
      status: "active",
    },
  ],
  apy: 12,
  tradingFeeBps: 8,
  spreadBps: 18,
  botConfig: {
    enabled: true,
    trades_per_minute: 6,
    max_order_notional: 1500,
  },
  prices: {
    "BTC/USDT": 65442,
    "ETH/USDT": 3462,
  },
};
