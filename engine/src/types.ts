export type Asset = "USDT" | "BTC" | "ETH";
export type TradingPair = "BTC/USDT" | "ETH/USDT";
export type TradeSide = "buy" | "sell";

export type Balance = {
  asset: Asset;
  available: number;
  inEarn: number;
};

export type Trade = {
  id: string;
  userId: string;
  pair: TradingPair;
  side: TradeSide;
  quantity: number;
  price: number;
  fee: number;
  status: "filled";
  createdAt: string;
};

export type YieldPosition = {
  id: string;
  userId: string;
  amount: number;
  apy: number;
  accruedProfit: number;
  startedAt: string;
  lastAccruedAt: string;
  status: "active" | "closed";
};

export type BotConfig = {
  enabled: boolean;
  tradesPerMinute: number;
  maxOrderNotional: number;
};

export type UserSimulationState = {
  userId: string;
  balances: Record<Asset, Balance>;
  trades: Trade[];
  yieldPositions: YieldPosition[];
};

export type PlatformConfig = {
  apy: number;
  tradingFeeBps: number;
  spreadBps: number;
  bot: BotConfig;
};
