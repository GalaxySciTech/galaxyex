import "dotenv/config";
import cors from "cors";
import express from "express";
import { z } from "zod";
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

const app = express();
const port = Number(process.env.PORT ?? 8080);

app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => {
  res.json({ ok: true, service: "engine" });
});

app.get("/api/state/:userId", (req, res) => {
  const state = getState(req.params.userId);
  if (!state) {
    res.status(404).json({ message: "User state not found." });
    return;
  }

  res.json(state);
});

const tradeSchema = z.object({
  userId: z.string(),
  pair: z.enum(["BTC/USDT", "ETH/USDT"]),
  side: z.enum(["buy", "sell"]),
  quantity: z.number().positive(),
});

app.post("/api/trade", (req, res) => {
  const parsed = tradeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid trade payload." });
    return;
  }

  try {
    const trade = simulateTrade({
      pair: parsed.data.pair,
      side: parsed.data.side,
      quantity: parsed.data.quantity,
    });
    res.json({ trade });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
});

const earnSchema = z.object({
  userId: z.string(),
  amount: z.number().positive(),
});

app.post("/api/earn/subscribe", (req, res) => {
  const parsed = earnSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid earn payload." });
    return;
  }

  try {
    const position = openYieldPosition(parsed.data.amount);
    res.json({ position });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
});

app.post("/api/earn/accrue", (req, res) => {
  const days = Number(req.body?.days ?? 1);
  const updates = accrueYield(days);
  res.json({ updates });
});

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

app.post("/api/admin/config", (req, res) => {
  const parsed = adminSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid admin config payload." });
    return;
  }

  const config = updateConfig(parsed.data);
  res.json({ config });
});

const adjustSchema = z.object({
  asset: z.enum(["USDT", "BTC", "ETH"]),
  delta: z.number(),
});

app.post("/api/admin/adjust-balance", (req, res) => {
  const parsed = adjustSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid balance payload." });
    return;
  }

  const balance = adjustBalance(parsed.data.asset, parsed.data.delta);
  res.json({ balance });
});

app.post("/api/bot/tick", (_, res) => {
  const trades = generateBotTrades();
  res.json({ generated: trades.length, trades });
});

async function refreshPrices() {
  const latest = await getMarketPrices();
  setPrices(latest);
}

setInterval(() => {
  void refreshPrices();
}, 15_000);

setInterval(() => {
  accrueYield(1 / 1440);
}, 60_000);

void refreshPrices();

app.listen(port, () => {
  console.log(`Engine listening on port ${port}`);
});
