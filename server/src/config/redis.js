import IORedis from "ioredis";

import { getEnv } from "./env.js";

const redisUrl = getEnv("REDIS_URL");

const redisConnection = redisUrl
  ? new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
    })
  : new IORedis({
      host: getEnv("REDIS_HOST", "127.0.0.1"),
      port: Number(getEnv("REDIS_PORT", 6379)),
      maxRetriesPerRequest: null,
    });

redisConnection.on("connect", () => {
  console.log("Redis connected");
});

redisConnection.on("error", (error) => {
  console.error("Redis connection error:", error.message);
});

export default redisConnection;
