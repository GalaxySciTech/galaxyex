export type Asset = "USDT" | "BTC" | "ETH" | "SOL" | "BNB";
export type TradingPair = "BTC/USDT" | "ETH/USDT" | "SOL/USDT" | "BNB/USDT";
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

export type PriceStats = {
  pair: TradingPair;
  price: number;
  open24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  changePercent24h: number;
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

export type EarnProduct = {
  id: string;
  name: string;
  asset: Asset;
  apy: number;
  minAmount: number;
  maxAmount: number;
  durationDays: number;
  flexible: boolean;
};

export type OrderType = "market" | "limit";

export type Order = {
  id: string;
  userId: string;
  pair: TradingPair;
  side: TradeSide;
  type: OrderType;
  quantity: number;
  limitPrice?: number;
  status: "open" | "filled" | "cancelled";
  createdAt: string;
};
