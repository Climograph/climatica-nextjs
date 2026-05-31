import { CACHE_TTL, TIME } from "@/constants";
import { getClientIp, rateLimitResponse } from "@/utils";
import { logger } from "@/libs/Logger";
import { checkRateLimit, REDIS_STRATEGIES } from "@/libs/redis";
import { RedisClient } from "@/libs/redis/client";
import { SolrService, WikidataService } from "@/libs/services";
import { type NextRequest, NextResponse } from "next/server";
import { parseCoordinates } from "../@utils";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit(ip, "cities", 60, TIME.IN_SECONDS.MINUTE);
  if (!rl.allowed) return rateLimitResponse(rl);
  const q = request.nextUrl.searchParams.get("q")?.trim();
  const lang = request.nextUrl.searchParams.get("lang") ?? "en";

  logger.info(`[Cities] GET called: q="${q}", lang="${lang}"`);

  if (!q || q.length < 2) return NextResponse.json([]);

  const coords = parseCoordinates(q);
  if (coords) {
    const cacheKey = REDIS_STRATEGIES.nearestCity.buildKey(coords);
    const cached = await RedisClient.get(cacheKey);
    if (cached) {
      logger.info(`[Cities] Cache HIT for key: ${cacheKey}`);
      return NextResponse.json(cached);
    }
    logger.info(`[Cities] Cache MISS for key: ${cacheKey}`);

    const city = await WikidataService.findNearestCityByCoordinates(coords.lat, coords.lng);

    const result = city ? [city] : [];
    if (result.length > 0) {
      await RedisClient.set(cacheKey, result, REDIS_STRATEGIES.nearestCity.ttl);
    }
    return NextResponse.json(result);
  }

  const strategy = REDIS_STRATEGIES.citySearch;
  const cacheKey = strategy.buildKey({ query: q, lang });

  const cached = await RedisClient.get(cacheKey);
  if (cached) {
    logger.info(`[Cities] Cache HIT for key: ${cacheKey}`);
    return NextResponse.json(cached);
  }
  logger.info(`[Cities] Cache MISS for key: ${cacheKey}`);

  const results = await SolrService.searchCities(q, lang);
  logger.info(`[Cities] Solr returned ${results.length} results`);

  if (results.length > 0) {
    const isShortQuery = q.length < 4;

    if (isShortQuery) {
      await RedisClient.set(cacheKey, results, strategy.shortTtl);
      logger.info(
        `[Cities] Cached ${results.length} results with short TTL ${CACHE_TTL.CITY_SEARCH_SHORT}s`,
      );
    } else {
      const counterKey = strategy.buildCounterKey({ query: q, lang });
      const count = await RedisClient.incrementCounter(counterKey, strategy.ttl);
      const ttl = count >= strategy.popularThreshold ? strategy.popularTtl : strategy.ttl;
      await RedisClient.set(cacheKey, results, ttl);
      logger.info(`[Cities] Cached ${results.length} results with TTL ${ttl}s`);
    }
  }

  return NextResponse.json(results);
}
