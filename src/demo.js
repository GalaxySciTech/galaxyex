const { Exchange } = require("./exchange");

function print(title, value) {
  console.log(`\n=== ${title} ===`);
  console.log(JSON.stringify(value, null, 2));
}

function runDemo() {
  const ex = new Exchange();
  ex.createUser("alice");
  ex.createUser("bob");

  ex.deposit("alice", "USDT", 50000);
  ex.deposit("bob", "BTC", 2);

  print("Initial Balances", {
    alice: ex.getBalances("alice"),
    bob: ex.getBalances("bob"),
  });

  const ask = ex.placeOrder({
    userId: "bob",
    pair: "BTC/USDT",
    side: "sell",
    price: 30000,
    amount: 1.2,
  });
  print("Bob Places Sell Order", ask);

  const bid = ex.placeOrder({
    userId: "alice",
    pair: "BTC/USDT",
    side: "buy",
    price: 31000,
    amount: 1,
  });
  print("Alice Places Buy Order (Crosses Book)", bid);

  print("Trades", ex.getTrades("BTC/USDT"));
  print("Order Book", ex.getOrderBook("BTC/USDT"));
  print("Balances After Trade", {
    alice: ex.getBalances("alice"),
    bob: ex.getBalances("bob"),
  });

  const ask2 = ex.placeOrder({
    userId: "bob",
    pair: "BTC/USDT",
    side: "sell",
    price: 35000,
    amount: 0.2,
  });
  print("Bob Places Another Sell Order", ask2);

  const cancelled = ex.cancelOrder({ userId: "bob", orderId: ask2.id });
  print("Bob Cancels Order", cancelled);
  print("Final Balances", {
    alice: ex.getBalances("alice"),
    bob: ex.getBalances("bob"),
  });
}

if (require.main === module) {
  runDemo();
}

module.exports = { runDemo };
