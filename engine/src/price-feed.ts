import type { TradingPair, PriceStats } from "./types.js";

const FALLBACK_PRICES: Record<TradingPair, number> = {
  "BTC/USDT": 65000,
  "ETH/USDT": 3400,
  "SOL/USDT": 155,
  "BNB/USDT": 580,
};

const FALLBACK_STATS: Record<TradingPair, PriceStats> = {
  "BTC/USDT": { pair: "BTC/USDT", price: 65000, open24h: 63800, high24h: 66200, low24h: 63200, volume24h: 18420000000, changePercent24h: 1.88 },
  "ETH/USDT": { pair: "ETH/USDT", price: 3400, open24h: 3320, high24h: 3480, low24h: 3300, volume24h: 8900000000, changePercent24h: 2.41 },
  "SOL/USDT": { pair: "SOL/USDT", price: 155, open24h: 149, high24h: 158, low24h: 147, volume24h: 2100000000, changePercent24h: 4.03 },
  "BNB/USDT": { pair: "BNB/USDT", price: 580, open24h: 571, high24h: 588, low24h: 568, volume24h: 1250000000, changePercent24h: 1.58 },
};

export const SYMBOL_MAP: Record<TradingPair, string> = {
  "BTC/USDT": "BTCUSDT",
  "ETH/USDT": "ETHUSDT",
  "SOL/USDT": "SOLUSDT",
  "BNB/USDT": "BNBUSDT",
};

const PAIRS: TradingPair[] = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT"];

export type KlineInterval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1w";

export type Kline = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type OrderBookEntry = {
  price: number;
  quantity: number;
};

export type OrderBookData = {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
};

export type RecentTrade = {
  id: number;
  price: number;
  qty: number;
  time: number;
  isBuyerMaker: boolean;
};

export async function getKlines(
  pair: TradingPair,
  interval: KlineInterval = "1h",
  limit = 200,
): Promise<Kline[]> {
  try {
    const symbol = SYMBOL_MAP[pair];
    if (!symbol) return [];
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];

    const data = (await res.json()) as Array<
      [number, string, string, string, string, string, number, string, number, string, string, string]
    >;

    return data.map((k) => ({
      time: k[0],
      open: Number(k[1]),
      high: Number(k[2]),
      low: Number(k[3]),
      close: Number(k[4]),
      volume: Number(k[5]),
    }));
  } catch {
    return [];
  }
}

export async function getOrderBook(pair: TradingPair, limit = 20): Promise<OrderBookData> {
  const empty: OrderBookData = { bids: [], asks: [] };
  try {
    const symbol = SYMBOL_MAP[pair];
    if (!symbol) return empty;
    const url = `https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=${limit}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return empty;

    const data = (await res.json()) as {
      bids: [string, string][];
      asks: [string, string][];
    };

    return {
      bids: data.bids.map(([p, q]) => ({ price: Number(p), quantity: Number(q) })),
      asks: data.asks.map(([p, q]) => ({ price: Number(p), quantity: Number(q) })),
    };
  } catch {
    return empty;
  }
}

export async function getRecentTrades(pair: TradingPair, limit = 50): Promise<RecentTrade[]> {
  try {
    const symbol = SYMBOL_MAP[pair];
    if (!symbol) return [];
    const url = `https://api.binance.com/api/v3/trades?symbol=${symbol}&limit=${limit}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];

    const data = (await res.json()) as Array<{
      id: number;
      price: string;
      qty: string;
      time: number;
      isBuyerMaker: boolean;
    }>;

    return data.map((t) => ({
      id: t.id,
      price: Number(t.price),
      qty: Number(t.qty),
      time: t.time,
      isBuyerMaker: t.isBuyerMaker,
    }));
  } catch {
    return [];
  }
}

export async function getMarketPrices(): Promise<Record<TradingPair, number>> {
  try {
    const symbols = PAIRS.map((p) => SYMBOL_MAP[p]);
    const url = `https://api.binance.com/api/v3/ticker/price?symbols=[${symbols.map((s) => `"${s}"`).join(",")}]`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return FALLBACK_PRICES;

    const data = (await res.json()) as Array<{ symbol: string; price: string }>;
    const result: Record<TradingPair, number> = { ...FALLBACK_PRICES };
    for (const item of data) {
      const pair = PAIRS.find((p) => SYMBOL_MAP[p] === item.symbol);
      if (pair) result[pair] = Number(item.price);
    }
    return result;
  } catch {
    return FALLBACK_PRICES;
  }
}

export async function getMarketStats(): Promise<Record<TradingPair, PriceStats>> {
  try {
    const symbols = PAIRS.map((p) => SYMBOL_MAP[p]);
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=[${symbols.map((s) => `"${s}"`).join(",")}]`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return FALLBACK_STATS;

    const data = (await res.json()) as Array<{
      symbol: string;
      lastPrice: string;
      openPrice: string;
      highPrice: string;
      lowPrice: string;
      quoteVolume: string;
      priceChangePercent: string;
    }>;

    const result: Record<TradingPair, PriceStats> = { ...FALLBACK_STATS };
    for (const item of data) {
      const pair = PAIRS.find((p) => SYMBOL_MAP[p] === item.symbol);
      if (pair) {
        result[pair] = {
          pair,
          price: Number(item.lastPrice),
          open24h: Number(item.openPrice),
          high24h: Number(item.highPrice),
          low24h: Number(item.lowPrice),
          volume24h: Number(item.quoteVolume),
          changePercent24h: Number(item.priceChangePercent),
        };
      }
    }
    return result;
  } catch {
    return FALLBACK_STATS;
  }
}
