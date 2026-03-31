import { SimulationState } from "@/lib/types";

const now = new Date().toISOString();

export const demoState: SimulationState = {
  userId: "demo-user-1",
  balances: [
    { id: "bal-usdt", user_id: "demo-user-1", asset: "USDT", available: 12450.73, in_earn: 3000, updated_at: now },
    { id: "bal-btc", user_id: "demo-user-1", asset: "BTC", available: 0.1842, in_earn: 0, updated_at: now },
    { id: "bal-eth", user_id: "demo-user-1", asset: "ETH", available: 2.912, in_earn: 0, updated_at: now },
    { id: "bal-sol", user_id: "demo-user-1", asset: "SOL", available: 50, in_earn: 0, updated_at: now },
    { id: "bal-bnb", user_id: "demo-user-1", asset: "BNB", available: 10, in_earn: 0, updated_at: now },
  ],
  trades: [
    { id: "tr-1", user_id: "demo-user-1", pair: "BTC/USDT", side: "buy", quantity: 0.021, price: 65320, fee: 2.74, status: "filled", created_at: now },
    { id: "tr-2", user_id: "demo-user-1", pair: "ETH/USDT", side: "sell", quantity: 0.75, price: 3445, fee: 1.29, status: "filled", created_at: now },
    { id: "tr-3", user_id: "demo-user-1", pair: "SOL/USDT", side: "buy", quantity: 10, price: 152, fee: 0.12, status: "filled", created_at: now },
  ],
  tradePagination: { page: 1, limit: 25, total: 3, pages: 1 },
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
      product_name: "Flexible Savings",
      duration_days: 0,
      flexible: true,
    },
  ],
  openOrders: [],
  apy: 12,
  tradingFeeBps: 8,
  spreadBps: 18,
  botConfig: { enabled: true, trades_per_minute: 6, max_order_notional: 1500 },
  prices: {
    "BTC/USDT": 65442,
    "ETH/USDT": 3462,
    "SOL/USDT": 155,
    "BNB/USDT": 580,
  },
  marketStats: {
    "BTC/USDT": { pair: "BTC/USDT", price: 65442, open24h: 63800, high24h: 66200, low24h: 63200, volume24h: 18420000000, changePercent24h: 2.57 },
    "ETH/USDT": { pair: "ETH/USDT", price: 3462, open24h: 3320, high24h: 3480, low24h: 3300, volume24h: 8900000000, changePercent24h: 4.28 },
    "SOL/USDT": { pair: "SOL/USDT", price: 155, open24h: 149, high24h: 158, low24h: 147, volume24h: 2100000000, changePercent24h: 4.03 },
    "BNB/USDT": { pair: "BNB/USDT", price: 580, open24h: 571, high24h: 588, low24h: 568, volume24h: 1250000000, changePercent24h: 1.58 },
  },
};
