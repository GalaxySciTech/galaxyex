const FALLBACK_PRICES = {
  "BTC/USDT": 65000,
  "ETH/USDT": 3400,
};

export async function getMarketPrices() {
  try {
    const [btcRes, ethRes] = await Promise.all([
      fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT"),
      fetch("https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT"),
    ]);

    if (!btcRes.ok || !ethRes.ok) {
      return FALLBACK_PRICES;
    }

    const btc = (await btcRes.json()) as { price: string };
    const eth = (await ethRes.json()) as { price: string };

    return {
      "BTC/USDT": Number(btc.price),
      "ETH/USDT": Number(eth.price),
    };
  } catch {
    return FALLBACK_PRICES;
  }
}
