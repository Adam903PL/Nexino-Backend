import Redis from "ioredis";
import { ENV } from "./env";


const redisConfig = {
    host: ENV.REDIS.HOST || '127.0.0.1', 
    port: Number(ENV.REDIS.PORT) || 6379 
};


export const redis = new Redis(redisConfig)


redis.on('error', (err) => {
    console.error('Redis Error:', err);
  });   