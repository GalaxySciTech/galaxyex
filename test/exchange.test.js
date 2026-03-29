const test = require("node:test");
const assert = require("node:assert/strict");
const { Exchange } = require("../src/exchange");

test("matches buy and sell orders and updates balances", () => {
  const ex = new Exchange();
  ex.createUser("alice");
  ex.createUser("bob");

  ex.deposit("alice", "USDT", 100000);
  ex.deposit("bob", "BTC", 2);

  ex.placeOrder({
    userId: "bob",
    pair: "BTC/USDT",
    side: "sell",
    price: 30000,
    amount: 1,
  });

  ex.placeOrder({
    userId: "alice",
    pair: "BTC/USDT",
    side: "buy",
    price: 31000,
    amount: 1,
  });

  const alice = ex.getBalances("alice");
  const bob = ex.getBalances("bob");
  const trades = ex.getTrades("BTC/USDT");
  const book = ex.getOrderBook("BTC/USDT");

  assert.equal(trades.length, 1);
  assert.equal(trades[0].price, 30000);
  assert.equal(trades[0].amount, 1);

  assert.equal(alice.BTC.available, 1);
  assert.equal(alice.USDT.available, 70000);
  assert.equal(alice.USDT.locked, 0);

  assert.equal(bob.BTC.available, 1);
  assert.equal(bob.BTC.locked, 0);
  assert.equal(bob.USDT.available, 30000);

  assert.equal(book.asks.length, 0);
  assert.equal(book.bids.length, 0);
});

test("supports partial fill and cancel releases remaining funds", () => {
  const ex = new Exchange();
  ex.createUser("maker");
  ex.createUser("taker");

  ex.deposit("maker", "BTC", 1);
  ex.deposit("taker", "USDT", 60000);

  const makerOrder = ex.placeOrder({
    userId: "maker",
    pair: "BTC/USDT",
    side: "sell",
    price: 30000,
    amount: 1,
  });

  ex.placeOrder({
    userId: "taker",
    pair: "BTC/USDT",
    side: "buy",
    price: 30000,
    amount: 0.4,
  });

  let book = ex.getOrderBook("BTC/USDT");
  assert.equal(book.asks.length, 1);
  assert.equal(book.asks[0].remaining, 0.6);
  assert.equal(book.asks[0].status, "partially_filled");

  ex.cancelOrder({ userId: "maker", orderId: makerOrder.id });

  const makerBalances = ex.getBalances("maker");
  const takerBalances = ex.getBalances("taker");

  assert.equal(makerBalances.BTC.available, 0.6);
  assert.equal(makerBalances.BTC.locked, 0);
  assert.equal(makerBalances.USDT.available, 12000);

  assert.equal(takerBalances.BTC.available, 0.4);
  assert.equal(takerBalances.USDT.available, 48000);
  assert.equal(takerBalances.USDT.locked, 0);

  book = ex.getOrderBook("BTC/USDT");
  assert.equal(book.asks.length, 0);
  assert.equal(ex.getTrades("BTC/USDT").length, 1);
});

test("rejects order for insufficient balance", () => {
  const ex = new Exchange();
  ex.createUser("tiny");
  ex.deposit("tiny", "USDT", 1000);

  assert.throws(
    () =>
      ex.placeOrder({
        userId: "tiny",
        pair: "BTC/USDT",
        side: "buy",
        price: 30000,
        amount: 1,
      }),
    /insufficient available balance/
  );
});
