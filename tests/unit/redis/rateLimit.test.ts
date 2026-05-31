import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRedis = vi.hoisted(() => ({
  incr: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn(),
  on: vi.fn(),
}));

vi.mock("ioredis", () => ({
  default: vi.fn(function () {
    return mockRedis;
  }),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/libs/Env", () => ({ env: { REDIS_URL: "redis://localhost:6379" } }));
vi.mock("@/libs/Logger", () => ({ logger: { info: vi.fn(), error: vi.fn() } }));

import { RedisClient } from "@/libs/redis/client";
import { checkRateLimit } from "@/libs/redis/rateLimit";

beforeEach(() => {
  Reflect.set(RedisClient, "instance", undefined);
  vi.clearAllMocks();
});

describe("checkRateLimit", () => {
  it("first request returns allowed=true and remaining=limit-1", async () => {
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
    mockRedis.ttl.mockResolvedValue(60);

    const result = await checkRateLimit("1.2.3.4", "cities", 60, 60);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(59);
    expect(result.limit).toBe(60);
    expect(result.resetInSeconds).toBe(60);
  });

  it("request at limit returns allowed=true and remaining=0", async () => {
    mockRedis.incr.mockResolvedValue(60);
    mockRedis.ttl.mockResolvedValue(30);

    const result = await checkRateLimit("1.2.3.4", "cities", 60, 60);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("request over limit returns allowed=false and remaining=0", async () => {
    mockRedis.incr.mockResolvedValue(61);
    mockRedis.ttl.mockResolvedValue(15);

    const result = await checkRateLimit("1.2.3.4", "cities", 60, 60);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("Redis failure returns allowed=true (fail open)", async () => {
    mockRedis.incr.mockRejectedValue(new Error("connection lost"));

    const result = await checkRateLimit("1.2.3.4", "cities", 60, 60);

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(60);
    expect(result.remaining).toBe(60);
    expect(result.resetInSeconds).toBe(0);
  });

  it('uses key format "rl:{endpoint}:{ip}"', async () => {
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
    mockRedis.ttl.mockResolvedValue(60);

    await checkRateLimit("9.9.9.9", "worldclim", 30, 60);

    expect(mockRedis.incr).toHaveBeenCalledWith("rl:worldclim:9.9.9.9");
  });

  it("calls expire with windowSeconds on first request (incr returns 1)", async () => {
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
    mockRedis.ttl.mockResolvedValue(60);

    await checkRateLimit("1.2.3.4", "cities", 60, 60);

    expect(mockRedis.expire).toHaveBeenCalledWith("rl:cities:1.2.3.4", 60);
  });

  it("does NOT call expire on subsequent requests (incr returns >1)", async () => {
    mockRedis.incr.mockResolvedValue(5);
    mockRedis.ttl.mockResolvedValue(45);

    await checkRateLimit("1.2.3.4", "cities", 60, 60);

    expect(mockRedis.expire).not.toHaveBeenCalled();
  });
});
