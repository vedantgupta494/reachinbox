import IORedis from "ioredis";
import { env } from "./env";

// BullMQ requires maxRetriesPerRequest: null on the connection it manages.
export const redisConnection = new IORedis({
  host: env.redis.host,
  port: env.redis.port,
  maxRetriesPerRequest: null,
});

redisConnection.on("error", (err) => {
  console.error("[redis] connection error:", err.message);
});
