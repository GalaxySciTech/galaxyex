export type Asset = "USDT" | "BTC" | "ETH";

export type TradingPair = "BTC/USDT" | "ETH/USDT";

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
  status: "active" | "closed";
};

export type BotConfig = {
  enabled: boolean;
  trades_per_minute: number;
  max_order_notional: number;
};

export type SimulationState = {
  userId: string;
  balances: BalanceRow[];
  trades: TradeRow[];
  yieldPositions: YieldPositionRow[];
  apy: number;
  tradingFeeBps: number;
  spreadBps: number;
  botConfig: BotConfig;
  prices: Record<TradingPair, number>;
};
