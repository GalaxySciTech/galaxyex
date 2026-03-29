const EPSILON = 1e-8;

function toNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new Error("Invalid number");
  }
  return num;
}

function normalize(value) {
  return Number(toNumber(value).toFixed(8));
}

function ensurePositive(value, fieldName) {
  const num = toNumber(value);
  if (num <= 0) {
    throw new Error(`${fieldName} must be greater than 0`);
  }
  return normalize(num);
}

function getPairAssets(pair) {
  const [base, quote] = String(pair).split("/");
  if (!base || !quote) {
    throw new Error("pair must be in BASE/QUOTE format, for example BTC/USDT");
  }
  return { base: base.toUpperCase(), quote: quote.toUpperCase() };
}

class Exchange {
  constructor() {
    this.users = new Set();
    this.wallets = new Map();
    this.books = new Map();
    this.orders = new Map();
    this.trades = [];
    this.orderSeq = 1;
    this.tradeSeq = 1;
  }

  createUser(userId) {
    if (!userId) {
      throw new Error("userId is required");
    }
    const id = String(userId);
    this.users.add(id);
    if (!this.wallets.has(id)) {
      this.wallets.set(id, {});
    }
    return { userId: id };
  }

  deposit(userId, asset, amount) {
    const id = this.#requireUser(userId);
    const symbol = this.#normalizeAsset(asset);
    const delta = ensurePositive(amount, "amount");

    const wallet = this.#getWallet(id);
    const balance = wallet[symbol] || { available: 0, locked: 0 };
    balance.available = normalize(balance.available + delta);
    wallet[symbol] = balance;
    return this.getBalances(id);
  }

  getBalances(userId) {
    const id = this.#requireUser(userId);
    const wallet = this.#getWallet(id);
    return JSON.parse(JSON.stringify(wallet));
  }

  placeOrder({ userId, pair, side, price, amount }) {
    const id = this.#requireUser(userId);
    const direction = String(side || "").toLowerCase();
    if (!["buy", "sell"].includes(direction)) {
      throw new Error("side must be buy or sell");
    }

    const limitPrice = ensurePositive(price, "price");
    const totalAmount = ensurePositive(amount, "amount");
    const { base, quote } = getPairAssets(pair);
    const normalizedPair = `${base}/${quote}`;
    const book = this.#getBook(normalizedPair);

    const seq = this.orderSeq++;
    const order = {
      id: `o_${seq}`,
      seq,
      userId: id,
      pair: normalizedPair,
      side: direction,
      price: limitPrice,
      amount: totalAmount,
      remaining: totalAmount,
      status: "open",
      createdAt: Date.now(),
    };

    this.#reserveFunds(order);
    this.#match(order, book, { base, quote });

    if (order.remaining > EPSILON) {
      this.#insertOrder(book, order);
      order.status = order.remaining < order.amount ? "partially_filled" : "open";
    } else {
      order.remaining = 0;
      order.status = "filled";
    }

    this.orders.set(order.id, order);
    return this.#publicOrder(order);
  }

  cancelOrder({ userId, orderId }) {
    const id = this.#requireUser(userId);
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error("order not found");
    }
    if (order.userId !== id) {
      throw new Error("cannot cancel another user's order");
    }
    if (!["open", "partially_filled"].includes(order.status)) {
      throw new Error("order cannot be cancelled");
    }

    const { base, quote } = getPairAssets(order.pair);
    const wallet = this.#getWallet(order.userId);

    if (order.side === "buy") {
      const release = normalize(order.price * order.remaining);
      this.#decreaseLocked(wallet, quote, release);
      this.#increaseAvailable(wallet, quote, release);
    } else {
      this.#decreaseLocked(wallet, base, order.remaining);
      this.#increaseAvailable(wallet, base, order.remaining);
    }

    const book = this.#getBook(order.pair);
    const list = order.side === "buy" ? book.bids : book.asks;
    const idx = list.findIndex((item) => item.id === order.id);
    if (idx >= 0) {
      list.splice(idx, 1);
    }
    order.remaining = 0;
    order.status = "cancelled";

    return this.#publicOrder(order);
  }

  getOrderBook(pair) {
    const { base, quote } = getPairAssets(pair);
    const normalizedPair = `${base}/${quote}`;
    const book = this.#getBook(normalizedPair);
    return {
      pair: normalizedPair,
      bids: book.bids.map((o) => this.#publicOrder(o)),
      asks: book.asks.map((o) => this.#publicOrder(o)),
    };
  }

  getTrades(pair) {
    if (!pair) {
      return this.trades.map((trade) => ({ ...trade }));
    }
    const { base, quote } = getPairAssets(pair);
    const normalizedPair = `${base}/${quote}`;
    return this.trades.filter((trade) => trade.pair === normalizedPair).map((trade) => ({ ...trade }));
  }

  #match(incomingOrder, book, assets) {
    const opposite = incomingOrder.side === "buy" ? book.asks : book.bids;

    while (incomingOrder.remaining > EPSILON && opposite.length > 0) {
      const top = opposite[0];
      const isCrossed =
        incomingOrder.side === "buy"
          ? incomingOrder.price + EPSILON >= top.price
          : incomingOrder.price <= top.price + EPSILON;
      if (!isCrossed) {
        break;
      }

      const tradeSize = normalize(Math.min(incomingOrder.remaining, top.remaining));
      const tradePrice = normalize(top.price);

      this.#executeTrade({
        buyOrder: incomingOrder.side === "buy" ? incomingOrder : top,
        sellOrder: incomingOrder.side === "sell" ? incomingOrder : top,
        qty: tradeSize,
        price: tradePrice,
        base: assets.base,
        quote: assets.quote,
      });

      incomingOrder.remaining = normalize(incomingOrder.remaining - tradeSize);
      top.remaining = normalize(top.remaining - tradeSize);

      if (top.remaining <= EPSILON) {
        top.remaining = 0;
        top.status = "filled";
        opposite.shift();
      } else {
        top.status = "partially_filled";
      }
    }
  }

  #executeTrade({ buyOrder, sellOrder, qty, price, base, quote }) {
    const buyerWallet = this.#getWallet(buyOrder.userId);
    const sellerWallet = this.#getWallet(sellOrder.userId);

    const reservedQuote = normalize(buyOrder.price * qty);
    const tradedQuote = normalize(price * qty);
    const refundQuote = normalize(reservedQuote - tradedQuote);

    this.#decreaseLocked(buyerWallet, quote, reservedQuote);
    this.#increaseAvailable(buyerWallet, base, qty);
    if (refundQuote > EPSILON) {
      this.#increaseAvailable(buyerWallet, quote, refundQuote);
    }

    this.#decreaseLocked(sellerWallet, base, qty);
    this.#increaseAvailable(sellerWallet, quote, tradedQuote);

    const makerOrder = buyOrder.seq < sellOrder.seq ? buyOrder : sellOrder;
    const takerOrder = makerOrder.id === buyOrder.id ? sellOrder : buyOrder;

    const trade = {
      id: `t_${this.tradeSeq++}`,
      pair: buyOrder.pair,
      price,
      amount: qty,
      buyOrderId: buyOrder.id,
      sellOrderId: sellOrder.id,
      makerOrderId: makerOrder.id,
      takerOrderId: takerOrder.id,
      timestamp: Date.now(),
    };
    this.trades.push(trade);
  }

  #insertOrder(book, order) {
    const list = order.side === "buy" ? book.bids : book.asks;
    list.push(order);
    list.sort((a, b) => {
      if (a.price !== b.price) {
        return order.side === "buy" ? b.price - a.price : a.price - b.price;
      }
      return a.createdAt - b.createdAt;
    });
  }

  #reserveFunds(order) {
    const wallet = this.#getWallet(order.userId);
    const { base, quote } = getPairAssets(order.pair);

    if (order.side === "buy") {
      const required = normalize(order.price * order.amount);
      this.#decreaseAvailable(wallet, quote, required);
      this.#increaseLocked(wallet, quote, required);
    } else {
      this.#decreaseAvailable(wallet, base, order.amount);
      this.#increaseLocked(wallet, base, order.amount);
    }
  }

  #decreaseAvailable(wallet, asset, amount) {
    const balance = wallet[asset] || { available: 0, locked: 0 };
    if (balance.available + EPSILON < amount) {
      throw new Error(`insufficient available balance for ${asset}`);
    }
    balance.available = normalize(balance.available - amount);
    wallet[asset] = balance;
  }

  #increaseAvailable(wallet, asset, amount) {
    const balance = wallet[asset] || { available: 0, locked: 0 };
    balance.available = normalize(balance.available + amount);
    wallet[asset] = balance;
  }

  #increaseLocked(wallet, asset, amount) {
    const balance = wallet[asset] || { available: 0, locked: 0 };
    balance.locked = normalize(balance.locked + amount);
    wallet[asset] = balance;
  }

  #decreaseLocked(wallet, asset, amount) {
    const balance = wallet[asset] || { available: 0, locked: 0 };
    if (balance.locked + EPSILON < amount) {
      throw new Error(`insufficient locked balance for ${asset}`);
    }
    balance.locked = normalize(balance.locked - amount);
    wallet[asset] = balance;
  }

  #getBook(pair) {
    if (!this.books.has(pair)) {
      this.books.set(pair, { bids: [], asks: [] });
    }
    return this.books.get(pair);
  }

  #requireUser(userId) {
    const id = String(userId || "");
    if (!id || !this.users.has(id)) {
      throw new Error("user does not exist");
    }
    return id;
  }

  #getWallet(userId) {
    if (!this.wallets.has(userId)) {
      this.wallets.set(userId, {});
    }
    return this.wallets.get(userId);
  }

  #normalizeAsset(asset) {
    const symbol = String(asset || "").toUpperCase();
    if (!symbol) {
      throw new Error("asset is required");
    }
    return symbol;
  }

  #publicOrder(order) {
    return {
      id: order.id,
      userId: order.userId,
      pair: order.pair,
      side: order.side,
      price: order.price,
      amount: order.amount,
      remaining: order.remaining,
      status: order.status,
      createdAt: order.createdAt,
    };
  }
}

module.exports = { Exchange };
