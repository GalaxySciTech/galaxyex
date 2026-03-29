const http = require("http");
const { URL } = require("url");
const { Exchange } = require("./exchange");

const exchange = new Exchange();
const PORT = Number(process.env.PORT || 3000);

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function notFound(res) {
  sendJson(res, 404, { error: "not found" });
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("request body too large"));
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error("invalid JSON body"));
      }
    });
    req.on("error", () => reject(new Error("failed to read request body")));
  });
}

function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const method = req.method || "GET";
      const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

      if (method === "GET" && url.pathname === "/health") {
        sendJson(res, 200, { ok: true, service: "galaxyex" });
        return;
      }

      if (method === "POST" && url.pathname === "/users") {
        const body = await parseJsonBody(req);
        const result = exchange.createUser(body.userId);
        sendJson(res, 201, result);
        return;
      }

      if (method === "POST" && url.pathname === "/deposit") {
        const body = await parseJsonBody(req);
        const balances = exchange.deposit(body.userId, body.asset, body.amount);
        sendJson(res, 200, { userId: body.userId, balances });
        return;
      }

      if (method === "GET" && url.pathname.startsWith("/balances/")) {
        const userId = decodeURIComponent(url.pathname.replace("/balances/", ""));
        const balances = exchange.getBalances(userId);
        sendJson(res, 200, { userId, balances });
        return;
      }

      if (method === "POST" && url.pathname === "/orders") {
        const body = await parseJsonBody(req);
        const order = exchange.placeOrder(body);
        sendJson(res, 201, { order });
        return;
      }

      if (method === "POST" && url.pathname === "/orders/cancel") {
        const body = await parseJsonBody(req);
        const order = exchange.cancelOrder(body);
        sendJson(res, 200, { order });
        return;
      }

      if (method === "GET" && url.pathname === "/orderbook") {
        const pair = url.searchParams.get("pair");
        if (!pair) {
          throw new Error("pair is required");
        }
        sendJson(res, 200, exchange.getOrderBook(pair));
        return;
      }

      if (method === "GET" && url.pathname === "/trades") {
        const pair = url.searchParams.get("pair");
        const trades = exchange.getTrades(pair || undefined);
        sendJson(res, 200, { pair: pair || null, trades });
        return;
      }

      notFound(res);
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`GalaxyEx API listening on http://localhost:${PORT}`);
  });
}

module.exports = { createServer };
