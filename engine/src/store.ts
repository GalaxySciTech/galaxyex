import { randomUUID } from "node:crypto";
import {
  BalanceModel,
  PlatformConfigModel,
  TradeModel,
  UserModel,
  YieldPositionModel,
} from "./models.js";
import type { Asset, PlatformConfig, Trade, TradeSide, TradingPair, YieldPosition } from "./types.js";

type Prices = Record<TradingPair, number>;

let prices: Prices = {
  "BTC/USDT": 65000,
  "ETH/USDT": 3400,
};

export function setPrices(nextPrices: Partial<Prices>) {
  prices = { ...prices, ...nextPrices };
}

export function getCurrentPrices() {
  return prices;
}

async function getConfig(): Promise<PlatformConfig> {
  let doc = await PlatformConfigModel.findOne({ key: "global" });
  if (!doc) {
    doc = await PlatformConfigModel.create({ key: "global" });
  }
  return {
    apy: doc.apy,
    tradingFeeBps: doc.tradingFeeBps,
    spreadBps: doc.spreadBps,
    bot: {
      enabled: doc.bot.enabled,
      tradesPerMinute: doc.bot.tradesPerMinute,
      maxOrderNotional: doc.bot.maxOrderNotional,
    },
  };
}

async function ensureBalances(userId: string) {
  const defaults: Array<{ asset: Asset; available: number; inEarn: number }> = [
    { asset: "USDT", available: 12000, inEarn: 0 },
    { asset: "BTC", available: 0.15, inEarn: 0 },
    { asset: "ETH", available: 2.5, inEarn: 0 },
  ];

  for (const d of defaults) {
    await BalanceModel.findOneAndUpdate(
      { userId, asset: d.asset },
      { $setOnInsert: { userId, asset: d.asset, available: d.available, inEarn: d.inEarn } },
      { upsert: true, returnDocument: "before" },
    );
  }
}

export async function getState(userId: string) {
  const user = await UserModel.findById(userId).catch(() => null);
  if (!user) {
    throw new Error(`User ${userId} not found.`);
  }

  await ensureBalances(userId);

  const [balanceDocs, tradeDocs, yieldDocs, config] = await Promise.all([
    BalanceModel.find({ userId }),
    TradeModel.find({ userId }).sort({ createdAt: -1 }).limit(25),
    YieldPositionModel.find({ userId }),
    getConfig(),
  ]);

  return {
    userId,
    balances: balanceDocs.map((b) => ({
      asset: b.asset,
      available: b.available,
      inEarn: b.inEarn,
    })),
    trades: tradeDocs.map((t) => ({
      id: t.tradeId,
      userId: t.userId,
      pair: t.pair,
      side: t.side,
      quantity: t.quantity,
      price: t.price,
      fee: t.fee,
      status: t.status,
      createdAt: t.createdAt,
    })),
    yieldPositions: yieldDocs.map((y) => ({
      id: y.positionId,
      userId: y.userId,
      amount: y.amount,
      apy: y.apy,
      accruedProfit: y.accruedProfit,
      startedAt: y.startedAt,
      lastAccruedAt: y.lastAccruedAt,
      status: y.status,
    })),
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

function quotePrice(pair: TradingPair, side: TradeSide, spreadBps: number) {
  const mid = prices[pair];
  const spread = spreadBps / 10_000;
  return side === "buy" ? mid * (1 + spread / 2) : mid * (1 - spread / 2);
}

export async function simulateTrade(input: {
  userId: string;
  pair: TradingPair;
  side: TradeSide;
  quantity: number;
}): Promise<Trade> {
  const { userId, pair, side, quantity } = input;
  const config = await getConfig();
  const base = pair.split("/")[0] as Exclude<Asset, "USDT">;
  const executionPrice = quotePrice(pair, side, config.spreadBps);
  const notional = quantity * executionPrice;
  const fee = (notional * config.tradingFeeBps) / 10_000;

  await ensureBalances(userId);

  if (side === "buy") {
    const required = notional + fee;
    const usdtBal = await BalanceModel.findOne({ userId, asset: "USDT" });
    if (!usdtBal || usdtBal.available < required) {
      throw new Error("Insufficient USDT for trade.");
    }
    await BalanceModel.updateOne({ userId, asset: "USDT" }, { $inc: { available: -required } });
    await BalanceModel.updateOne({ userId, asset: base }, { $inc: { available: quantity } });
  } else {
    const baseBal = await BalanceModel.findOne({ userId, asset: base });
    if (!baseBal || baseBal.available < quantity) {
      throw new Error(`Insufficient ${base} for trade.`);
    }
    await BalanceModel.updateOne({ userId, asset: base }, { $inc: { available: -quantity } });
    await BalanceModel.updateOne({ userId, asset: "USDT" }, { $inc: { available: notional - fee } });
  }

  const tradeId = randomUUID();
  await TradeModel.create({ tradeId, userId, pair, side, quantity, price: executionPrice, fee, status: "filled" });

  return {
    id: tradeId,
    userId,
    pair,
    side,
    quantity,
    price: executionPrice,
    fee,
    status: "filled",
    createdAt: new Date().toISOString(),
  };
}

export async function openYieldPosition(userId: string, amount: number): Promise<YieldPosition> {
  if (amount <= 0) {
    throw new Error("Amount must be greater than zero.");
  }

  await ensureBalances(userId);
  const config = await getConfig();

  const usdtBal = await BalanceModel.findOne({ userId, asset: "USDT" });
  if (!usdtBal || usdtBal.available < amount) {
    throw new Error("Insufficient USDT balance for earn position.");
  }

  await BalanceModel.updateOne({ userId, asset: "USDT" }, { $inc: { available: -amount, inEarn: amount } });

  const positionId = randomUUID();
  const now = new Date();
  await YieldPositionModel.create({
    positionId,
    userId,
    amount,
    apy: config.apy,
    accruedProfit: 0,
    startedAt: now,
    lastAccruedAt: now,
    status: "active",
  });

  return {
    id: positionId,
    userId,
    amount,
    apy: config.apy,
    accruedProfit: 0,
    startedAt: now.toISOString(),
    lastAccruedAt: now.toISOString(),
    status: "active",
  };
}

export async function accrueYield(days = 1) {
  const positions = await YieldPositionModel.find({ status: "active" });
  const updates: Array<{ id: string; reward: number }> = [];

  for (const position of positions) {
    const ratePerDay = position.apy / 100 / 365;
    const reward = position.amount * ratePerDay * days;
    await YieldPositionModel.updateOne(
      { positionId: position.positionId },
      { $inc: { accruedProfit: reward }, $set: { lastAccruedAt: new Date() } },
    );
    updates.push({ id: position.positionId, reward });
  }

  return updates;
}

export async function updateConfig(next: {
  apy?: number;
  spreadBps?: number;
  tradingFeeBps?: number;
  bot?: { enabled?: boolean; tradesPerMinute?: number; maxOrderNotional?: number };
}) {
  const update: Record<string, unknown> = {};
  if (typeof next.apy === "number") update["apy"] = next.apy;
  if (typeof next.spreadBps === "number") update["spreadBps"] = next.spreadBps;
  if (typeof next.tradingFeeBps === "number") update["tradingFeeBps"] = next.tradingFeeBps;
  if (next.bot) {
    if (typeof next.bot.enabled === "boolean") update["bot.enabled"] = next.bot.enabled;
    if (typeof next.bot.tradesPerMinute === "number") update["bot.tradesPerMinute"] = next.bot.tradesPerMinute;
    if (typeof next.bot.maxOrderNotional === "number") update["bot.maxOrderNotional"] = next.bot.maxOrderNotional;
  }

  const doc = await PlatformConfigModel.findOneAndUpdate(
    { key: "global" },
    { $set: update },
    { upsert: true, returnDocument: "after" },
  );

  return doc;
}

export async function adjustBalance(userId: string, asset: Asset, delta: number) {
  await ensureBalances(userId);

  if (delta < 0) {
    const current = await BalanceModel.findOne({ userId, asset });
    if (!current || current.available + delta < 0) {
      throw new Error(`Insufficient ${asset} balance for adjustment.`);
    }
  }

  const doc = await BalanceModel.findOneAndUpdate(
    { userId, asset },
    { $inc: { available: delta } },
    { returnDocument: "after" },
  );
  return doc;
}

export async function generateBotTrades() {
  const config = await getConfig();
  if (!config.bot.enabled) return [];

  const trades: Trade[] = [];
  const count = Math.max(1, Math.min(config.bot.tradesPerMinute, 30));
  const pairs: TradingPair[] = ["BTC/USDT", "ETH/USDT"];

  for (let i = 0; i < count; i++) {
    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    const side: TradeSide = Math.random() > 0.5 ? "buy" : "sell";
    const px = prices[pair];
    const maxQty = config.bot.maxOrderNotional / px;
    const qty = Number((Math.max(1e-6, Math.random() * maxQty)).toFixed(6));
    const tradeId = randomUUID();
    const botUserId = "bot-liquidity";

    await TradeModel.create({
      tradeId,
      userId: botUserId,
      pair,
      side,
      quantity: qty,
      price: quotePrice(pair, side, config.spreadBps),
      fee: 0,
      status: "filled",
    });

    trades.push({
      id: tradeId,
      userId: botUserId,
      pair,
      side,
      quantity: qty,
      price: quotePrice(pair, side, config.spreadBps),
      fee: 0,
      status: "filled",
      createdAt: new Date().toISOString(),
    });
  }

  return trades;
}
