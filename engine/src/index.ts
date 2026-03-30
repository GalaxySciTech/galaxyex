import "dotenv/config";
import cors from "cors";
import express from "express";
import { z } from "zod";
import { connectDB } from "./db.js";
import {
  accrueYield,
  adjustBalance,
  generateBotTrades,
  getState,
  openYieldPosition,
  setPrices,
  simulateTrade,
  updateConfig,
} from "./store.js";
import { getMarketPrices } from "./price-feed.js";
import {
  ensureDemoUser,
  loginUser,
  registerUser,
  requireAdmin,
  requireAuth,
  signToken,
  type AuthRequest,
} from "./auth.js";

const app = express();
const port = Number(process.env.PORT ?? 8080);

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

// ── Simulation state ──────────────────────────────────────────────────────────

app.get("/api/state/:userId", async (req, res) => {
  try {
    const state = await getState(req.params.userId);
    res.json(state);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

app.get("/api/state", requireAuth, async (req: AuthRequest, res) => {
  try {
    const state = await getState(req.auth!.userId);
    res.json(state);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

// ── Trade ─────────────────────────────────────────────────────────────────────

const tradeSchema = z.object({
  pair: z.enum(["BTC/USDT", "ETH/USDT"]),
  side: z.enum(["buy", "sell"]),
  quantity: z.number().positive(),
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

// ── Earn ──────────────────────────────────────────────────────────────────────

const earnSchema = z.object({
  amount: z.number().positive(),
});

app.post("/api/earn/subscribe", requireAuth, async (req: AuthRequest, res) => {
  const parsed = earnSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid earn payload." });
    return;
  }

  try {
    const position = await openYieldPosition(req.auth!.userId, parsed.data.amount);
    res.json({ position });
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
  asset: z.enum(["USDT", "BTC", "ETH"]),
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
    res.status(500).json({ message: (error as Error).message });
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

// ── Price refresh & yield accrual intervals ───────────────────────────────────

async function refreshPrices() {
  const latest = await getMarketPrices();
  setPrices(latest);
}

setInterval(() => { void refreshPrices(); }, 15_000);
setInterval(() => { void accrueYield(1 / 1440); }, 60_000);

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function bootstrap() {
  await connectDB();
  await ensureDemoUser();
  await refreshPrices();

  app.listen(port, () => {
    console.log(`Engine listening on port ${port}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start engine:", err);
  process.exit(1);
});
