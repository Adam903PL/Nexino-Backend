import express from "express";
import bodyParser from "body-parser";
import { ENV } from "./config/env";
import { casinoController } from "./casino/controllers/casino.controller";

const app = express();
app.use(bodyParser.json());
app.use("/casino",casinoController)


app.listen(ENV.PORT, () => {
  console.log(`Server is running on http://localhost:${ENV.PORT}`);
});

export default app;


