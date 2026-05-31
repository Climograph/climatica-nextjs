import { CACHE_KEYS, TIME } from "@/constants";
import { getClientIp, rateLimitResponse } from "@/utils";
import { env } from "@/libs/Env";
import { checkRateLimit, REDIS_STRATEGIES } from "@/libs/redis";
import { RedisClient } from "@/libs/redis/client";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit(ip, "worldclim-resource", 30, TIME.IN_SECONDS.MINUTE);
  if (!rl.allowed) return rateLimitResponse(rl);
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `https://scrapi.gsic.uva.es/apis/worldclim/resource?${searchParams}`;

  const strategy = REDIS_STRATEGIES.climateData;
  const cacheKey = CACHE_KEYS.WORLDCLIM_RESOURCE(searchParams);

  const cached = await RedisClient.get<unknown>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.WORLDCLIM_API_KEY}`,
      Accept: "application/json",
    },
  });

  const data: unknown = await response.json();

  const counterKey = CACHE_KEYS.WORLDCLIM_RESOURCE_COUNTER(searchParams);
  const count = await RedisClient.incrementCounter(counterKey, strategy.ttl);
  const ttl = count >= strategy.popularThreshold ? strategy.popularTtl : strategy.ttl;
  await RedisClient.set(cacheKey, data, ttl);

  return NextResponse.json(data);
}
