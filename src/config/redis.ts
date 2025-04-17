import Redis from "ioredis";
import { ENV } from "./env";

export const redis = new Redis({

  host: new URL(ENV.REDIS_URL).hostname, 
  port: 6379, 
  password: new URL(ENV.REDIS_URL).password, 
  tls: {},
  connectTimeout: 20000, 
});


redis.on("error", (err) => {
  console.error("Redis Error:", err);
});

redis.on("connect", () => {
  console.log("Połączono z Redisem");
});

redis.on("ready", () => {
  console.log("Redis gotowy do użycia");
});

redis.on("close", () => {
  console.log("Połączenie z Redisem zostało zamknięte");
});