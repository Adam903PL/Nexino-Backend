import "reflect-metadata";
import express from "express";
import bodyParser from "body-parser";
import { ENV } from "./config/env";
import { casinoController } from "./api/casino/controller/casino.controller";
import { authController } from "./api/auth/controller/auth.controller";
import { authenticateMiddleware } from "./middlewares/authMiddleware";
import { walletController } from "./api/wallet/controller/wallet.controller";
import { marketController } from "./api/market/controller/market.controller";
import { LootBoxController } from "./api/lootbox/controller/lootbox.controller";
import { RateLimiter } from "./middlewares/rateLimiterMiddleware";
import { ExportController } from "./api/export/controller/export.controller";
import cors from 'cors';
import { GitHubController } from "./api/github/controller/github.controller";
import { LocalisationController } from "./api/localisation/controller/Localisation.controller";
import { setupSwagger } from './config/swagger';

const app = express();
setupSwagger(app);

app.use(cors({
  origin: 'http://localhost:3000', 
  methods: ['GET', 'POST', 'PUT','PATCH', 'DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'], 
}));

app.use(bodyParser.json());

app.use(RateLimiter);

app.use("/auth", authController);
app.use(["/market", "/wallet", "/casino", "/lootbox","/export","/github","/localisation"], authenticateMiddleware);

app.use("/casino", casinoController);
app.use("/github",GitHubController)
app.use("/wallet", walletController);
app.use("/market", marketController);
app.use("/lootbox", LootBoxController);
app.use("/export",ExportController)
app.use("/localisation", LocalisationController)

app.listen(ENV.PORT, () => {
  console.log(`Server is running on http://localhost:${ENV.PORT}`);
});

export default app;
