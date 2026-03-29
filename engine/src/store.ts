import { randomUUID } from "node:crypto";
import {
  Asset,
  PlatformConfig,
  Trade,
  TradeSide,
  TradingPair,
  UserSimulationState,
  YieldPosition,
} from "./types.js";

type Prices = Record<TradingPair, number>;

const userId = "demo-user-1";

const state: UserSimulationState = {
  userId,
  balances: {
    USDT: { asset: "USDT", available: 12000, inEarn: 0 },
    BTC: { asset: "BTC", available: 0.15, inEarn: 0 },
    ETH: { asset: "ETH", available: 2.5, inEarn: 0 },
  },
  trades: [],
  yieldPositions: [],
};

const config: PlatformConfig = {
  apy: 12,
  tradingFeeBps: 8,
  spreadBps: 18,
  bot: {
    enabled: true,
    tradesPerMinute: 6,
    maxOrderNotional: 1200,
  },
};

let prices: Prices = {
  "BTC/USDT": 65000,
  "ETH/USDT": 3400,
};

export function getState(targetUserId = userId) {
  if (targetUserId !== userId) {
    return null;
  }

  return {
    userId,
    balances: Object.values(state.balances),
    trades: state.trades.slice(0, 25),
    yieldPositions: state.yieldPositions,
    apy: config.apy,
    tradingFeeBps: config.tradingFeeBps,
    spreadBps: config.spreadBps,
    botConfig: {
      enabled: config.bot.enabled,
      trades_per_minute: config.bot.tradesPerMinute,
      max_order_notional: config.bot.maxOrderNotional,
    },
    prices,
  };
}

export function setPrices(nextPrices: Partial<Prices>) {
  prices = {
    ...prices,
    ...nextPrices,
  };
}

function quotePrice(pair: TradingPair, side: TradeSide) {
  const mid = prices[pair];
  const spread = config.spreadBps / 10_000;
  return side === "buy" ? mid * (1 + spread / 2) : mid * (1 - spread / 2);
}

export function simulateTrade(input: {
  pair: TradingPair;
  side: TradeSide;
  quantity: number;
}) {
  const { pair, side, quantity } = input;
  const base = pair.split("/")[0] as Exclude<Asset, "USDT">;
  const executionPrice = quotePrice(pair, side);
  const notional = quantity * executionPrice;
  const fee = (notional * config.tradingFeeBps) / 10_000;

  if (side === "buy") {
    const required = notional + fee;
    if (state.balances.USDT.available < required) {
      throw new Error("Insufficient USDT for trade.");
    }
    state.balances.USDT.available -= required;
    state.balances[base].available += quantity;
  } else {
    if (state.balances[base].available < quantity) {
      throw new Error(`Insufficient ${base} for trade.`);
    }
    state.balances[base].available -= quantity;
    state.balances.USDT.available += notional - fee;
  }

  const trade: Trade = {
    id: randomUUID(),
    userId,
    pair,
    side,
    quantity,
    price: executionPrice,
    fee,
    status: "filled",
    createdAt: new Date().toISOString(),
  };

  state.trades.unshift(trade);
  return trade;
}

export function openYieldPosition(amount: number) {
  if (amount <= 0) {
    throw new Error("Amount must be greater than zero.");
  }

  if (state.balances.USDT.available < amount) {
    throw new Error("Insufficient USDT balance for earn position.");
  }

  state.balances.USDT.available -= amount;
  state.balances.USDT.inEarn += amount;

  const now = new Date().toISOString();
  const position: YieldPosition = {
    id: randomUUID(),
    userId,
    amount,
    apy: config.apy,
    accruedProfit: 0,
    startedAt: now,
    lastAccruedAt: now,
    status: "active",
  };

  state.yieldPositions.push(position);
  return position;
}

export function accrueYield(days = 1) {
  const updates = state.yieldPositions
    .filter((position) => position.status === "active")
    .map((position) => {
      const ratePerDay = position.apy / 100 / 365;
      const reward = position.amount * ratePerDay * days;
      position.accruedProfit += reward;
      position.lastAccruedAt = new Date().toISOString();
      return {
        id: position.id,
        reward,
      };
    });

  return updates;
}

export function updateConfig(next: Partial<PlatformConfig>) {
  if (typeof next.apy === "number") {
    config.apy = next.apy;
  }
  if (typeof next.spreadBps === "number") {
    config.spreadBps = next.spreadBps;
  }
  if (typeof next.tradingFeeBps === "number") {
    config.tradingFeeBps = next.tradingFeeBps;
  }
  if (next.bot) {
    config.bot = {
      ...config.bot,
      ...next.bot,
    };
  }

  return config;
}

export function adjustBalance(asset: Asset, delta: number) {
  state.balances[asset].available += delta;
  return state.balances[asset];
}

export function generateBotTrades() {
  if (!config.bot.enabled) {
    return [];
  }

  const trades: Trade[] = [];
  const count = Math.max(1, Math.min(config.bot.tradesPerMinute, 30));
  const pairs: TradingPair[] = ["BTC/USDT", "ETH/USDT"];

  for (let i = 0; i < count; i += 1) {
    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    const side: TradeSide = Math.random() > 0.5 ? "buy" : "sell";
    const px = prices[pair];
    const maxQty = config.bot.maxOrderNotional / px;
    const qty = Number((Math.random() * maxQty).toFixed(6));

    const trade: Trade = {
      id: randomUUID(),
      userId: "bot-liquidity",
      pair,
      side,
      quantity: qty,
      price: quotePrice(pair, side),
      fee: 0,
      status: "filled",
      createdAt: new Date().toISOString(),
    };

    trades.push(trade);
  }

  return trades;
}
