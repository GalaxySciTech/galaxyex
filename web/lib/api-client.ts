import { SimulationState, PriceStats, TradingPair } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_ENGINE_URL ?? "http://localhost:8080";

export interface AuthResponse {
  token: string;
  userId: string;
  email: string;
  role: "user" | "admin";
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("galaxyex_token");
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("galaxyex_token", token);
  }
}

export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("galaxyex_token");
  }
}

export function getStoredAuth(): AuthResponse | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("galaxyex_auth");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthResponse;
  } catch {
    return null;
  }
}

export function setStoredAuth(auth: AuthResponse) {
  if (typeof window !== "undefined") {
    localStorage.setItem("galaxyex_auth", JSON.stringify(auth));
    localStorage.setItem("galaxyex_token", auth.token);
  }
}

export function clearAuth() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("galaxyex_auth");
    localStorage.removeItem("galaxyex_token");
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function register(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// ── Market Data ───────────────────────────────────────────────────────────────

export async function fetchMarketStats(): Promise<PriceStats[]> {
  const data = await request<{ stats: Array<{
    pair: string;
    price: number;
    open24h: number;
    high24h: number;
    low24h: number;
    volume24h: number;
    changePercent24h: number;
  }> }>("/api/markets");
  return data.stats.map((s) => ({
    pair: s.pair as TradingPair,
    price: s.price,
    open24h: s.open24h,
    high24h: s.high24h,
    low24h: s.low24h,
    volume24h: s.volume24h,
    changePercent24h: s.changePercent24h,
  }));
}

// ── Simulation state ──────────────────────────────────────────────────────────

type RawState = {
  userId: string;
  balances: Array<{ asset: string; available: number; inEarn: number }>;
  trades: Array<{
    id: string;
    userId: string;
    pair: string;
    side: string;
    quantity: number;
    price: number;
    fee: number;
    status: "filled";
    createdAt: string;
  }>;
  tradePagination: { page: number; limit: number; total: number; pages: number };
  yieldPositions: Array<{
    id: string;
    userId: string;
    amount: number;
    apy: number;
    accruedProfit: number;
    startedAt: string;
    lastAccruedAt: string;
    redeemedAt?: string;
    status: "active" | "closed";
    productName: string;
    durationDays: number;
    flexible: boolean;
  }>;
  openOrders: Array<{
    id: string;
    userId: string;
    pair: string;
    side: string;
    quantity: number;
    limitPrice: number;
    filledQuantity: number;
    status: "open" | "filled" | "cancelled";
    createdAt: string;
  }>;
  apy: number;
  tradingFeeBps: number;
  spreadBps: number;
  botConfig: { enabled: boolean; trades_per_minute: number; max_order_notional: number };
  prices: Record<string, number>;
  marketStats: Record<string, {
    pair: string;
    price: number;
    open24h: number;
    high24h: number;
    low24h: number;
    volume24h: number;
    changePercent24h: number;
  }>;
};

function normalizeState(data: RawState): SimulationState {
  return {
    userId: data.userId,
    balances: data.balances.map((b, i) => ({
      id: `bal-${b.asset.toLowerCase()}-${i}`,
      user_id: data.userId,
      asset: b.asset as SimulationState["balances"][number]["asset"],
      available: b.available,
      in_earn: b.inEarn,
      updated_at: new Date().toISOString(),
    })),
    trades: data.trades.map((t) => ({
      id: t.id,
      user_id: t.userId,
      pair: t.pair as SimulationState["trades"][number]["pair"],
      side: t.side as "buy" | "sell",
      quantity: t.quantity,
      price: t.price,
      fee: t.fee,
      status: t.status,
      created_at: t.createdAt,
    })),
    tradePagination: data.tradePagination ?? { page: 1, limit: 25, total: 0, pages: 1 },
    yieldPositions: data.yieldPositions.map((y) => ({
      id: y.id,
      user_id: y.userId,
      amount: y.amount,
      apy: y.apy,
      accrued_profit: y.accruedProfit,
      started_at: y.startedAt,
      last_accrued_at: y.lastAccruedAt,
      redeemed_at: y.redeemedAt,
      status: y.status,
      product_name: y.productName ?? "Flexible Savings",
      duration_days: y.durationDays ?? 0,
      flexible: y.flexible ?? true,
    })),
    openOrders: (data.openOrders ?? []).map((o) => ({
      id: o.id,
      user_id: o.userId,
      pair: o.pair as SimulationState["trades"][number]["pair"],
      side: o.side as "buy" | "sell",
      quantity: o.quantity,
      limit_price: o.limitPrice,
      filled_quantity: o.filledQuantity,
      status: o.status,
      created_at: o.createdAt,
    })),
    apy: data.apy,
    tradingFeeBps: data.tradingFeeBps,
    spreadBps: data.spreadBps,
    botConfig: {
      enabled: data.botConfig.enabled,
      trades_per_minute: data.botConfig.trades_per_minute,
      max_order_notional: data.botConfig.max_order_notional,
    },
    prices: data.prices as SimulationState["prices"],
    marketStats: Object.fromEntries(
      Object.entries(data.marketStats ?? {}).map(([k, v]) => [k, {
        pair: v.pair as TradingPair,
        price: v.price,
        open24h: v.open24h,
        high24h: v.high24h,
        low24h: v.low24h,
        volume24h: v.volume24h,
        changePercent24h: v.changePercent24h,
      }])
    ) as SimulationState["marketStats"],
  };
}

export async function fetchSimulationState(page = 1): Promise<SimulationState> {
  const data = await request<RawState>(`/api/state?page=${page}`);
  return normalizeState(data);
}

export async function fetchDemoState(): Promise<SimulationState> {
  const data = await request<RawState>("/api/state/demo");
  return normalizeState(data);
}

// ── Trade ─────────────────────────────────────────────────────────────────────

export interface TradeResult {
  trade: {
    id: string;
    pair: string;
    side: "buy" | "sell";
    quantity: number;
    price: number;
    fee: number;
    status: "filled";
    createdAt: string;
  };
}

export async function executeTrade(pair: string, side: "buy" | "sell", quantity: number): Promise<TradeResult> {
  return request<TradeResult>("/api/trade", {
    method: "POST",
    body: JSON.stringify({ pair, side, quantity }),
  });
}

export interface LimitOrderResult {
  order: {
    id: string;
    pair: string;
    side: "buy" | "sell";
    quantity: number;
    limitPrice: number;
    status: "open";
    createdAt: string;
  };
}

export async function placeLimitOrder(
  pair: string,
  side: "buy" | "sell",
  quantity: number,
  limitPrice: number,
): Promise<LimitOrderResult> {
  return request<LimitOrderResult>("/api/orders/limit", {
    method: "POST",
    body: JSON.stringify({ pair, side, quantity, limitPrice }),
  });
}

export async function cancelOrder(orderId: string): Promise<{ orderId: string; status: string }> {
  return request(`/api/orders/${orderId}`, { method: "DELETE" });
}

// ── Earn ──────────────────────────────────────────────────────────────────────

export interface EarnResult {
  position: {
    id: string;
    amount: number;
    apy: number;
    accruedProfit: number;
    startedAt: string;
    status: "active";
    productName: string;
    durationDays: number;
    flexible: boolean;
  };
}

export async function subscribeEarn(
  amount: number,
  productName?: string,
  durationDays?: number,
  flexible?: boolean,
): Promise<EarnResult> {
  return request<EarnResult>("/api/earn/subscribe", {
    method: "POST",
    body: JSON.stringify({ amount, productName, durationDays, flexible }),
  });
}

export async function redeemEarn(positionId: string): Promise<{ redeemed: number }> {
  return request<{ redeemed: number }>(`/api/earn/redeem/${positionId}`, {
    method: "POST",
  });
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function saveAdminConfig(config: {
  apy?: number;
  spreadBps?: number;
  tradingFeeBps?: number;
  bot?: { enabled?: boolean; tradesPerMinute?: number; maxOrderNotional?: number };
}) {
  return request("/api/admin/config", {
    method: "POST",
    body: JSON.stringify(config),
  });
}

export async function adjustBalance(userId: string, asset: string, delta: number) {
  return request("/api/admin/adjust-balance", {
    method: "POST",
    body: JSON.stringify({ userId, asset, delta }),
  });
}
