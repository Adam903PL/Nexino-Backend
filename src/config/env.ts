import dotenv from "dotenv";

dotenv.config();

export const ENV = {
  PORT: process.env.PORT ?? 3333,
  JWT_SECRET:process.env.JWT_SECRET ?? "",
  COIN_GEKO_API:process.env.COIN_GEKO_API ??"",
  REDIS:{
    HOST:process.env.REDIS_HOST ?? '127.0.0.1',
    PORT:process.env.REDIS_PORT ??  6379
  }
  
};
