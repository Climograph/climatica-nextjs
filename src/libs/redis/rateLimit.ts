import "server-only";

import { logger } from "@/libs/Logger";
import { RedisClient } from "./client";
import type { TRateLimitResult } from "./rateLimit.type";

export type { TRateLimitResult };

export async function checkRateLimit(
  ip: string,
  endpoint: string,
  limit: number,
  windowSeconds: number,
): Promise<TRateLimitResult> {
  const key = `rl:${endpoint}:${ip}`;

  try {
    const redis = RedisClient.getInstance();
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }

    const ttl = await redis.ttl(key);

    return {
      allowed: current <= limit,
      limit,
      remaining: Math.max(0, limit - current),
      resetInSeconds: ttl,
    };
  } catch (error) {
    logger.error(
      `[RateLimit] Redis error for key "${key}": ${error instanceof Error ? error.message : String(error)}`,
    );
    return { allowed: true, limit, remaining: limit, resetInSeconds: 0 };
  }
}
