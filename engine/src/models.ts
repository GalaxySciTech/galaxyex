import mongoose, { Schema, Document } from "mongoose";
import type { Asset, TradingPair, TradeSide } from "./types.js";

// ── User ──────────────────────────────────────────────────────────────────────

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  role: "user" | "admin";
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true },
);

export const UserModel = mongoose.model<IUser>("User", userSchema);

// ── Balance ───────────────────────────────────────────────────────────────────

export interface IBalance extends Document {
  userId: string;
  asset: Asset;
  available: number;
  inEarn: number;
}

const balanceSchema = new Schema<IBalance>({
  userId: { type: String, required: true, index: true },
  asset: { type: String, enum: ["USDT", "BTC", "ETH"], required: true },
  available: { type: Number, default: 0 },
  inEarn: { type: Number, default: 0 },
});

balanceSchema.index({ userId: 1, asset: 1 }, { unique: true });

export const BalanceModel = mongoose.model<IBalance>("Balance", balanceSchema);

// ── Trade ─────────────────────────────────────────────────────────────────────

export interface ITrade extends Document {
  tradeId: string;
  userId: string;
  pair: TradingPair;
  side: TradeSide;
  quantity: number;
  price: number;
  fee: number;
  status: "filled";
  createdAt: Date;
}

const tradeSchema = new Schema<ITrade>(
  {
    tradeId: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    pair: { type: String, enum: ["BTC/USDT", "ETH/USDT"], required: true },
    side: { type: String, enum: ["buy", "sell"], required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    fee: { type: Number, required: true },
    status: { type: String, default: "filled" },
  },
  { timestamps: true },
);

export const TradeModel = mongoose.model<ITrade>("Trade", tradeSchema);

// ── YieldPosition ─────────────────────────────────────────────────────────────

export interface IYieldPosition extends Document {
  positionId: string;
  userId: string;
  amount: number;
  apy: number;
  accruedProfit: number;
  startedAt: Date;
  lastAccruedAt: Date;
  status: "active" | "closed";
}

const yieldPositionSchema = new Schema<IYieldPosition>({
  positionId: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  apy: { type: Number, required: true },
  accruedProfit: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now },
  lastAccruedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["active", "closed"], default: "active" },
});

export const YieldPositionModel = mongoose.model<IYieldPosition>("YieldPosition", yieldPositionSchema);

// ── PlatformConfig ────────────────────────────────────────────────────────────

export interface IPlatformConfig extends Document {
  key: "global";
  apy: number;
  tradingFeeBps: number;
  spreadBps: number;
  bot: {
    enabled: boolean;
    tradesPerMinute: number;
    maxOrderNotional: number;
  };
}

const platformConfigSchema = new Schema<IPlatformConfig>({
  key: { type: String, default: "global", unique: true },
  apy: { type: Number, default: 12 },
  tradingFeeBps: { type: Number, default: 8 },
  spreadBps: { type: Number, default: 18 },
  bot: {
    enabled: { type: Boolean, default: true },
    tradesPerMinute: { type: Number, default: 6 },
    maxOrderNotional: { type: Number, default: 1200 },
  },
});

export const PlatformConfigModel = mongoose.model<IPlatformConfig>("PlatformConfig", platformConfigSchema);
