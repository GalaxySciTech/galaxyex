/**
 * Integration test suite for GalaxyEx engine API.
 * Uses a real MongoDB test database (galaxyex_test).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { app } from "../app.js";
import { ensureDemoUser, signToken } from "../auth.js";
import { UserModel, BalanceModel, TradeModel, YieldPositionModel } from "../models.js";
import { setupDB, teardownDB, cleanDB } from "./setup.js";

beforeAll(async () => {
  await setupDB();
});

afterAll(async () => {
  await cleanDB();
  await teardownDB();
});

beforeEach(async () => {
  await cleanDB();
});

// ── Health ────────────────────────────────────────────────────────────────────

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, service: "engine" });
  });
});

// ── Auth ──────────────────────────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  it("creates a new user and returns a JWT token", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "alice@test.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.email).toBe("alice@test.com");
    expect(res.body.role).toBe("user");
    expect(res.body).toHaveProperty("userId");
  });

  it("rejects duplicate email with 400", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "dup@test.com", password: "password123" });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "dup@test.com", password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already registered/i);
  });

  it("rejects invalid email format with 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "not-an-email", password: "password123" });
    expect(res.status).toBe(400);
  });

  it("rejects password shorter than 6 characters with 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "short@test.com", password: "12345" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "logintest@test.com", password: "password123" });
  });

  it("returns token for valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "logintest@test.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.email).toBe("logintest@test.com");
  });

  it("rejects wrong password with 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "logintest@test.com", password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it("rejects non-existent user with 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@test.com", password: "password123" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });
});

describe("GET /api/auth/me", () => {
  let token: string;

  beforeEach(async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "me@test.com", password: "password123" });
    token = res.body.token;
  });

  it("returns current user info when authenticated", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("me@test.com");
    expect(res.body.role).toBe("user");
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with invalid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer badtoken");
    expect(res.status).toBe(401);
  });
});

// ── State ─────────────────────────────────────────────────────────────────────

describe("GET /api/state", () => {
  let userToken: string;
  let userId: string;

  beforeEach(async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "stateuser@test.com", password: "password123" });
    userToken = res.body.token;
    userId = res.body.userId;
  });

  it("returns full state for authenticated user", async () => {
    const res = await request(app)
      .get("/api/state")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(userId);
    expect(res.body.balances).toHaveLength(3);
    expect(res.body.prices).toHaveProperty("BTC/USDT");
    expect(res.body.prices).toHaveProperty("ETH/USDT");
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/state");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/state/:userId", () => {
  it("returns 404 for non-existent valid ObjectId", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/state/${fakeId}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  it("returns 404 for garbage id string", async () => {
    const res = await request(app).get("/api/state/nonexistentid123");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/state/demo", () => {
  beforeEach(async () => {
    await ensureDemoUser();
  });

  it("returns demo user state without authentication", async () => {
    const res = await request(app).get("/api/state/demo");
    expect(res.status).toBe(200);
    expect(res.body.balances).toHaveLength(3);
    const usdt = res.body.balances.find((b: { asset: string }) => b.asset === "USDT");
    expect(usdt.available).toBe(12000);
  });
});

// ── Trade ─────────────────────────────────────────────────────────────────────

describe("POST /api/trade", () => {
  let userToken: string;

  beforeEach(async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "trader@test.com", password: "password123" });
    userToken = res.body.token;
    // Initialise balances
    await request(app).get("/api/state").set("Authorization", `Bearer ${userToken}`);
  });

  it("buys BTC/USDT and deducts USDT, credits BTC", async () => {
    const stateBefore = await request(app)
      .get("/api/state")
      .set("Authorization", `Bearer ${userToken}`);
    const usdtBefore: number = stateBefore.body.balances.find((b: { asset: string }) => b.asset === "USDT").available;
    const btcBefore: number = stateBefore.body.balances.find((b: { asset: string }) => b.asset === "BTC").available;

    const res = await request(app)
      .post("/api/trade")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ pair: "BTC/USDT", side: "buy", quantity: 0.01 });

    expect(res.status).toBe(200);
    expect(res.body.trade.pair).toBe("BTC/USDT");
    expect(res.body.trade.side).toBe("buy");
    expect(res.body.trade.status).toBe("filled");
    expect(res.body.trade.quantity).toBe(0.01);
    expect(res.body.trade.fee).toBeGreaterThan(0);

    const stateAfter = await request(app)
      .get("/api/state")
      .set("Authorization", `Bearer ${userToken}`);
    const usdtAfter: number = stateAfter.body.balances.find((b: { asset: string }) => b.asset === "USDT").available;
    const btcAfter: number = stateAfter.body.balances.find((b: { asset: string }) => b.asset === "BTC").available;

    expect(usdtAfter).toBeLessThan(usdtBefore);
    expect(btcAfter).toBeGreaterThan(btcBefore);
  });

  it("sells ETH/USDT and increases USDT, reduces ETH", async () => {
    const stateBefore = await request(app)
      .get("/api/state")
      .set("Authorization", `Bearer ${userToken}`);
    const usdtBefore: number = stateBefore.body.balances.find((b: { asset: string }) => b.asset === "USDT").available;
    const ethBefore: number = stateBefore.body.balances.find((b: { asset: string }) => b.asset === "ETH").available;

    const res = await request(app)
      .post("/api/trade")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ pair: "ETH/USDT", side: "sell", quantity: 1 });

    expect(res.status).toBe(200);
    expect(res.body.trade.side).toBe("sell");

    const stateAfter = await request(app)
      .get("/api/state")
      .set("Authorization", `Bearer ${userToken}`);
    const usdtAfter: number = stateAfter.body.balances.find((b: { asset: string }) => b.asset === "USDT").available;
    const ethAfter: number = stateAfter.body.balances.find((b: { asset: string }) => b.asset === "ETH").available;

    expect(usdtAfter).toBeGreaterThan(usdtBefore);
    expect(ethAfter).toBeLessThan(ethBefore);
  });

  it("rejects sell with insufficient BTC balance", async () => {
    const res = await request(app)
      .post("/api/trade")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ pair: "BTC/USDT", side: "sell", quantity: 9999 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/insufficient BTC/i);
  });

  it("rejects buy with insufficient USDT balance", async () => {
    const res = await request(app)
      .post("/api/trade")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ pair: "BTC/USDT", side: "buy", quantity: 9999 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/insufficient USDT/i);
  });

  it("rejects unsupported trading pair", async () => {
    const res = await request(app)
      .post("/api/trade")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ pair: "SOL/USDT", side: "buy", quantity: 1 });
    expect(res.status).toBe(400);
  });

  it("rejects zero quantity", async () => {
    const res = await request(app)
      .post("/api/trade")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ pair: "BTC/USDT", side: "buy", quantity: 0 });
    expect(res.status).toBe(400);
  });

  it("rejects negative quantity", async () => {
    const res = await request(app)
      .post("/api/trade")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ pair: "BTC/USDT", side: "buy", quantity: -1 });
    expect(res.status).toBe(400);
  });

  it("requires authentication", async () => {
    const res = await request(app)
      .post("/api/trade")
      .send({ pair: "BTC/USDT", side: "buy", quantity: 0.01 });
    expect(res.status).toBe(401);
  });
});

// ── Earn ──────────────────────────────────────────────────────────────────────

describe("POST /api/earn/subscribe", () => {
  let userToken: string;

  beforeEach(async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "earner@test.com", password: "password123" });
    userToken = res.body.token;
    await request(app).get("/api/state").set("Authorization", `Bearer ${userToken}`);
  });

  it("subscribes to earn pool and moves USDT to inEarn", async () => {
    const res = await request(app)
      .post("/api/earn/subscribe")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ amount: 1000 });

    expect(res.status).toBe(200);
    expect(res.body.position.amount).toBe(1000);
    expect(res.body.position.status).toBe("active");
    expect(res.body.position.apy).toBeGreaterThan(0);

    const state = await request(app)
      .get("/api/state")
      .set("Authorization", `Bearer ${userToken}`);
    const usdt = state.body.balances.find((b: { asset: string }) => b.asset === "USDT");
    expect(usdt.inEarn).toBe(1000);
    expect(usdt.available).toBe(11000);
  });

  it("rejects earn amount exceeding available balance", async () => {
    const res = await request(app)
      .post("/api/earn/subscribe")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ amount: 99999 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/insufficient/i);
  });

  it("rejects zero amount", async () => {
    const res = await request(app)
      .post("/api/earn/subscribe")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ amount: 0 });
    expect(res.status).toBe(400);
  });

  it("requires authentication", async () => {
    const res = await request(app)
      .post("/api/earn/subscribe")
      .send({ amount: 100 });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/earn/accrue", () => {
  let userToken: string;

  beforeEach(async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "user@test.com", password: "password123" });
    userToken = res.body.token;
  });

  it("requires admin role", async () => {
    const res = await request(app)
      .post("/api/earn/accrue")
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });
});

// ── Admin ─────────────────────────────────────────────────────────────────────

describe("POST /api/admin/config", () => {
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    const adminUser = await UserModel.create({
      email: "admin@test.com",
      passwordHash: "irrelevant",
      role: "admin",
    });
    adminToken = signToken({ userId: String(adminUser._id), email: "admin@test.com", role: "admin" });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "user@test.com", password: "password123" });
    userToken = res.body.token;
  });

  it("admin can update APY and spread", async () => {
    const res = await request(app)
      .post("/api/admin/config")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ apy: 15, spreadBps: 20 });

    expect(res.status).toBe(200);
    expect(res.body.config.apy).toBe(15);
    expect(res.body.config.spreadBps).toBe(20);
  });

  it("rejects apy > 100", async () => {
    const res = await request(app)
      .post("/api/admin/config")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ apy: 150 });
    expect(res.status).toBe(400);
  });

  it("rejects spreadBps > 300", async () => {
    const res = await request(app)
      .post("/api/admin/config")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ spreadBps: 500 });
    expect(res.status).toBe(400);
  });

  it("non-admin user gets 403", async () => {
    const res = await request(app)
      .post("/api/admin/config")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ apy: 15 });
    expect(res.status).toBe(403);
  });

  it("unauthenticated request gets 401", async () => {
    const res = await request(app)
      .post("/api/admin/config")
      .send({ apy: 15 });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/admin/adjust-balance", () => {
  let adminToken: string;
  let targetUserId: string;

  beforeEach(async () => {
    const adminUser = await UserModel.create({
      email: "admin@test.com",
      passwordHash: "irrelevant",
      role: "admin",
    });
    adminToken = signToken({ userId: String(adminUser._id), email: "admin@test.com", role: "admin" });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "target@test.com", password: "password123" });
    targetUserId = res.body.userId;

    // Trigger balance init
    const userToken = res.body.token;
    await request(app).get("/api/state").set("Authorization", `Bearer ${userToken}`);
  });

  it("admin can credit a user balance", async () => {
    const res = await request(app)
      .post("/api/admin/adjust-balance")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ userId: targetUserId, asset: "USDT", delta: 500 });

    expect(res.status).toBe(200);
    expect(res.body.balance.available).toBe(12500);
  });

  it("admin cannot reduce balance below zero", async () => {
    const res = await request(app)
      .post("/api/admin/adjust-balance")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ userId: targetUserId, asset: "USDT", delta: -99999 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/insufficient/i);
  });

  it("rejects invalid asset", async () => {
    const res = await request(app)
      .post("/api/admin/adjust-balance")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ userId: targetUserId, asset: "SOL", delta: 100 });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/bot/tick", () => {
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    const adminUser = await UserModel.create({
      email: "admin@test.com",
      passwordHash: "irrelevant",
      role: "admin",
    });
    adminToken = signToken({ userId: String(adminUser._id), email: "admin@test.com", role: "admin" });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "user@test.com", password: "password123" });
    userToken = res.body.token;
  });

  it("admin can trigger bot trades", async () => {
    const res = await request(app)
      .post("/api/bot/tick")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("generated");
    expect(Array.isArray(res.body.trades)).toBe(true);
    expect(res.body.generated).toBeGreaterThan(0);
  });

  it("all bot trades have positive non-zero quantity", async () => {
    const res = await request(app)
      .post("/api/bot/tick")
      .set("Authorization", `Bearer ${adminToken}`);

    for (const trade of res.body.trades) {
      expect(trade.quantity).toBeGreaterThan(0);
    }
  });

  it("non-admin user gets 403", async () => {
    const res = await request(app)
      .post("/api/bot/tick")
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });
});
