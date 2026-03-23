import Redis from "ioredis";
import { AgentResult } from "../types";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

redis.on("connect", () => console.log("[Redis] bağlandı"));
redis.on("error",   (err) => console.error("[Redis] hata:", err.message));

export async function getCached(key: string): Promise<AgentResult | null> {
  try {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

export async function setCache(
  key: string,
  result: AgentResult,
  ttlSeconds = 3600
): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(result), "EX", ttlSeconds);
  } catch (err) {
    console.error("[Redis] cache yazma hatası:", err);
  }
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}