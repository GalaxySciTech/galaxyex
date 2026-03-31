import "dotenv/config";
import { connectDB } from "./db.js";
import { ensureDemoUser } from "./auth.js";
import { accrueYield, fillPendingLimitOrders } from "./store.js";
import { app, refreshPrices } from "./app.js";

const port = Number(process.env.PORT ?? 8080);

setInterval(() => { void refreshPrices(); }, 15_000);
setInterval(() => { void accrueYield(1 / 1440); }, 60_000);
setInterval(() => { void fillPendingLimitOrders(); }, 10_000);

async function bootstrap() {
  await connectDB();
  await ensureDemoUser();
  await refreshPrices();

  app.listen(port, () => {
    console.log(`Engine listening on port ${port}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start engine:", err);
  process.exit(1);
});
