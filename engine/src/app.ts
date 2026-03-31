import cors from "cors";
import express from "express";
import { z } from "zod";
import {
  accrueYield,
  adjustBalance,
  cancelLimitOrder,
  generateBotTrades,
  getMarketStats,
  getState,
  openYieldPosition,
  placeLimitOrder,
  redeemYieldPosition,
  setPrices,
  setMarketStats,
  simulateTrade,
  updateConfig,
} from "./store.js";
import {
  getMarketPrices,
  getMarketStats as fetchMarketStats,
  getKlines,
  getOrderBook,
  getRecentTrades,
  SYMBOL_MAP,
  type KlineInterval,
} from "./price-feed.js";
import {
  getDemoUser,
  requireAdmin,
  requireAuth,
  signToken,
  type AuthRequest,
} from "./auth.js";

export const app = express();

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : true;

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// ── Health ────────────────────────────────────────────────────────────────────

app.get("/health", (_, res) => {
  res.json({ ok: true, service: "engine" });
});

// ── Auth ──────────────────────────────────────────────────────────────────────

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

import { loginUser, registerUser } from "./auth.js";

app.post("/api/auth/register", async (req, res) => {
  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload." });
    return;
  }

  try {
    const user = await registerUser(parsed.data.email, parsed.data.password);
    const token = signToken({ userId: String(user._id), email: user.email, role: user.role });
    res.json({ token, userId: String(user._id), email: user.email, role: user.role });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload." });
    return;
  }

  try {
    const user = await loginUser(parsed.data.email, parsed.data.password);
    const token = signToken({ userId: String(user._id), email: user.email, role: user.role });
    res.json({ token, userId: String(user._id), email: user.email, role: user.role });
  } catch (error) {
    res.status(401).json({ message: (error as Error).message });
  }
});

app.get("/api/auth/me", requireAuth, (req: AuthRequest, res) => {
  res.json(req.auth);
});

// ── Market data ───────────────────────────────────────────────────────────────

app.get("/api/markets", (_, res) => {
  res.json({ stats: Object.values(getMarketStats()) });
});

app.get("/api/markets/:pair", (req, res) => {
  const pair = String(req.params.pair).replace("-", "/");
  const stats = getMarketStats();
  const stat = Object.values(stats).find((s) => s.pair === pair);
  if (!stat) {
    res.status(404).json({ message: "Pair not found." });
    return;
  }
  res.json(stat);
});

// ── Klines, Order Book, Recent Trades ─────────────────────────────────────────

const VALID_INTERVALS = ["1m", "5m", "15m", "1h", "4h", "1d", "1w"];
const VALID_PAIRS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT"];

app.get("/api/klines/:pair", async (req, res) => {
  const pair = String(req.params.pair).replace("-", "/");
  if (!VALID_PAIRS.includes(pair)) {
    res.status(400).json({ message: "Invalid pair." });
    return;
  }
  const interval = (String(req.query.interval ?? "1h")) as KlineInterval;
  if (!VALID_INTERVALS.includes(interval)) {
    res.status(400).json({ message: "Invalid interval." });
    return;
  }
  const limit = Math.min(Number(req.query.limit ?? 200), 1000);
  const klines = await getKlines(pair as typeof VALID_PAIRS[number] & string as import("./types.js").TradingPair, interval, limit);
  res.json({ pair, interval, klines });
});

app.get("/api/depth/:pair", async (req, res) => {
  const pair = String(req.params.pair).replace("-", "/");
  if (!VALID_PAIRS.includes(pair)) {
    res.status(400).json({ message: "Invalid pair." });
    return;
  }
  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const depth = await getOrderBook(pair as import("./types.js").TradingPair, limit);
  res.json({ pair, ...depth });
});

app.get("/api/trades/:pair", async (req, res) => {
  const pair = String(req.params.pair).replace("-", "/");
  if (!VALID_PAIRS.includes(pair)) {
    res.status(400).json({ message: "Invalid pair." });
    return;
  }
  const limit = Math.min(Number(req.query.limit ?? 50), 100);
  const trades = await getRecentTrades(pair as import("./types.js").TradingPair, limit);
  res.json({ pair, trades });
});

// ── Simulation state ──────────────────────────────────────────────────────────

app.get("/api/state/demo", async (_, res) => {
  try {
    const demoUser = await getDemoUser();
    if (!demoUser) {
      res.status(404).json({ message: "Demo user not found." });
      return;
    }
    const page = 1;
    const state = await getState(String(demoUser._id), page);
    res.json(state);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

// Authenticated user's own state
app.get("/api/state", requireAuth, async (req: AuthRequest, res) => {
  try {
    const page = Number(Array.isArray(req.query.page) ? req.query.page[0] : req.query.page ?? 1);
    const limit = Number(Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit ?? 25);
    const state = await getState(req.auth!.userId, page, limit);
    res.json(state);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

// ── Trade ─────────────────────────────────────────────────────────────────────

const tradeSchema = z.object({
  pair: z.enum(["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT"]),
  side: z.enum(["buy", "sell"]),
  quantity: z.number().positive(),
});

const limitOrderSchema = z.object({
  pair: z.enum(["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT"]),
  side: z.enum(["buy", "sell"]),
  quantity: z.number().positive(),
  limitPrice: z.number().positive(),
});

app.post("/api/trade", requireAuth, async (req: AuthRequest, res) => {
  const parsed = tradeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid trade payload." });
    return;
  }

  try {
    const trade = await simulateTrade({
      userId: req.auth!.userId,
      pair: parsed.data.pair,
      side: parsed.data.side,
      quantity: parsed.data.quantity,
    });
    res.json({ trade });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
});

app.post("/api/orders/limit", requireAuth, async (req: AuthRequest, res) => {
  const parsed = limitOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid limit order payload." });
    return;
  }

  try {
    const order = await placeLimitOrder({
      userId: req.auth!.userId,
      pair: parsed.data.pair,
      side: parsed.data.side,
      quantity: parsed.data.quantity,
      limitPrice: parsed.data.limitPrice,
    });
    res.json({ order });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
});

app.delete("/api/orders/:orderId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const orderId = String(req.params.orderId);
    const result = await cancelLimitOrder(req.auth!.userId, orderId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
});

// ── Earn ──────────────────────────────────────────────────────────────────────

const earnSchema = z.object({
  amount: z.number().positive(),
  productName: z.string().optional(),
  durationDays: z.number().int().min(0).optional(),
  flexible: z.boolean().optional(),
});

app.post("/api/earn/subscribe", requireAuth, async (req: AuthRequest, res) => {
  const parsed = earnSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid earn payload." });
    return;
  }

  try {
    const position = await openYieldPosition(
      req.auth!.userId,
      parsed.data.amount,
      parsed.data.productName,
      parsed.data.durationDays,
      parsed.data.flexible,
    );
    res.json({ position });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
});

app.post("/api/earn/redeem/:positionId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const positionId = String(req.params.positionId);
    const result = await redeemYieldPosition(req.auth!.userId, positionId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
});

app.post("/api/earn/accrue", requireAdmin, async (_, res) => {
  try {
    const days = 1;
    const updates = await accrueYield(days);
    res.json({ updates });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

// ── Admin ─────────────────────────────────────────────────────────────────────

const adminSchema = z.object({
  apy: z.number().positive().max(100).optional(),
  spreadBps: z.number().nonnegative().max(300).optional(),
  tradingFeeBps: z.number().nonnegative().max(100).optional(),
  bot: z
    .object({
      enabled: z.boolean().optional(),
      tradesPerMinute: z.number().int().min(1).max(30).optional(),
      maxOrderNotional: z.number().positive().max(100000).optional(),
    })
    .optional(),
});

app.post("/api/admin/config", requireAdmin, async (req, res) => {
  const parsed = adminSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid admin config payload." });
    return;
  }

  try {
    const config = await updateConfig(parsed.data);
    res.json({ config });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

const adjustSchema = z.object({
  userId: z.string(),
  asset: z.enum(["USDT", "BTC", "ETH", "SOL", "BNB"]),
  delta: z.number(),
});

app.post("/api/admin/adjust-balance", requireAdmin, async (req, res) => {
  const parsed = adjustSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid balance payload." });
    return;
  }

  try {
    const balance = await adjustBalance(parsed.data.userId, parsed.data.asset, parsed.data.delta);
    res.json({ balance });
  } catch (error) {
    const msg = (error as Error).message;
    const status = msg.includes("Insufficient") ? 400 : 500;
    res.status(status).json({ message: msg });
  }
});

app.post("/api/bot/tick", requireAdmin, async (_, res) => {
  try {
    const trades = await generateBotTrades();
    res.json({ generated: trades.length, trades });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

// ── Price refresh ─────────────────────────────────────────────────────────────

export async function refreshPrices() {
  const [latestPrices, latestStats] = await Promise.all([
    getMarketPrices(),
    fetchMarketStats(),
  ]);
  setPrices(latestPrices);
  setMarketStats(latestStats);
}
