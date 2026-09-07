import "server-only";

import { TIME } from "@/constants";
import { isRecoverableRedisError } from "@/utils";
import Redis from "ioredis";
import { env } from "../Env";
import { logger } from "../Logger";

const singletonsRedisInstance = globalThis as unknown as { __redisInstance?: Redis };

export class RedisClient {
  private constructor() {}

  public static getInstance(): Redis {
    if (!singletonsRedisInstance.__redisInstance) {
      const redisUrl = env.REDIS_URL;

      const instance = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          if (times >= 10) {
            logger.error("[Redis] Max retries reached");
            return null;
          }

          // * exponential backoff, capped at 2s
          return Math.min(Math.pow(2, times) * TIME.IN_MILLISECONDS.ONE_HUNDRED_MS, 2000);
        },
        reconnectOnError(error) {
          logger.error(`[Redis] Connection error: ${error.message}`);
          return isRecoverableRedisError(error.message);
        },
        lazyConnect: true,
        enableOfflineQueue: true,
      });

      instance.on("connect", () => {
        logger.info("[Redis] Connected");
      });

      instance.on("error", (error) => {
        logger.error(`[Redis] Error: ${error.message}`);
      });

      singletonsRedisInstance.__redisInstance = instance;
    }

    return singletonsRedisInstance.__redisInstance;
  }

  public static async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await RedisClient.getInstance().get(key);

      if (!cached) return null;

      return JSON.parse(cached) as T;
    } catch (error: any) {
      logger.error(`[Redis] GET error for key "${key}": ${error.message}`);
      return null;
    }
  }

  public static async set<T>(key: string, value: T, ttl: number): Promise<void> {
    try {
      await RedisClient.getInstance().set(key, JSON.stringify(value), "EX", ttl);
    } catch (error: any) {
      logger.error(`[Redis] SET error for key "${key}": ${error.message}`);
    }
  }

  public static async incrementCounter(key: string, ttl: number): Promise<number> {
    try {
      const redis = RedisClient.getInstance();
      const count = await redis.incr(key);

      if (count === 1) {
        await redis.expire(key, ttl);
      }

      return count;
    } catch (error: any) {
      logger.error(`[Redis] INCR error for key "${key}": ${error.message}`);
      return 0;
    }
  }

  public static async del(key: string): Promise<void> {
    try {
      await RedisClient.getInstance().del(key);
    } catch (error: any) {
      logger.error(`[Redis] DEL error for key "${key}": ${error.message}`);
    }
  }
}
