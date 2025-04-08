import "reflect-metadata";
import express from "express";
import bodyParser from "body-parser";
import { ENV } from "./config/env";
import { casinoController } from "./api/casino/controllers/casino.controller";
import { authController } from "./api/auth/controllers/auth.controller";
import { authenticateMiddleware } from "./middlewares/authMiddleware";
import { walletController } from "./api/wallet/controller/wallet.controller";
import { marketController } from "./api/market/controller/market.controller";
import { LootBoxController } from "./api/lootbox/controllers/lootbox.controller";
import { RateLimiter } from "./middlewares/rateLimiterMiddleware";

const app = express();

app.use(bodyParser.json());

app.use(RateLimiter);

app.use("/auth", authController);
app.use(["/market", "/wallet", "/casino", "/lootbox"], authenticateMiddleware);

app.use("/casino", casinoController);
app.use("/wallet", walletController);
app.use("/market", marketController);
app.use("/lootbox", LootBoxController);

app.listen(ENV.PORT, () => {
  console.log(`Server is running on http://localhost:${ENV.PORT}`);
});

export default app;
