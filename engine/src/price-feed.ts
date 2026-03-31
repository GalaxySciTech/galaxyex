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

const SYMBOL_MAP: Record<TradingPair, string> = {
  "BTC/USDT": "BTCUSDT",
  "ETH/USDT": "ETHUSDT",
  "SOL/USDT": "SOLUSDT",
  "BNB/USDT": "BNBUSDT",
};

const PAIRS: TradingPair[] = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT"];

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
