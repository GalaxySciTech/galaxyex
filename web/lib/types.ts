export type Asset = "USDT" | "BTC" | "ETH" | "SOL" | "BNB";

export type TradingPair = "BTC/USDT" | "ETH/USDT" | "SOL/USDT" | "BNB/USDT";

export type BalanceRow = {
  id: string;
  user_id: string;
  asset: Asset;
  available: number;
  in_earn: number;
  updated_at: string;
};

export type TradeSide = "buy" | "sell";

export type TradeRow = {
  id: string;
  user_id: string;
  pair: TradingPair;
  side: TradeSide;
  quantity: number;
  price: number;
  fee: number;
  status: "filled";
  created_at: string;
};

export type YieldPositionRow = {
  id: string;
  user_id: string;
  amount: number;
  apy: number;
  accrued_profit: number;
  started_at: string;
  last_accrued_at: string;
  redeemed_at?: string;
  status: "active" | "closed";
  product_name: string;
  duration_days: number;
  flexible: boolean;
};

export type OpenOrderRow = {
  id: string;
  user_id: string;
  pair: TradingPair;
  side: TradeSide;
  quantity: number;
  limit_price: number;
  filled_quantity: number;
  status: "open" | "filled" | "cancelled";
  created_at: string;
};

export type BotConfig = {
  enabled: boolean;
  trades_per_minute: number;
  max_order_notional: number;
};

export type PriceStats = {
  pair: TradingPair;
  price: number;
  open24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  changePercent24h: number;
};

export type TradePagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type SimulationState = {
  userId: string;
  balances: BalanceRow[];
  trades: TradeRow[];
  tradePagination: TradePagination;
  yieldPositions: YieldPositionRow[];
  openOrders: OpenOrderRow[];
  apy: number;
  tradingFeeBps: number;
  spreadBps: number;
  botConfig: BotConfig;
  prices: Record<TradingPair, number>;
  marketStats: Record<TradingPair, PriceStats>;
};

export type EarnProduct = {
  id: string;
  name: string;
  apy: number;
  minAmount: number;
  maxAmount: number;
  durationDays: number;
  flexible: boolean;
  badge?: string;
};
