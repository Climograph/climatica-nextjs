import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/libs/Logger", () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
vi.mock("@/libs/redis/client", () => ({
  RedisClient: { get: vi.fn(), set: vi.fn(), incrementCounter: vi.fn() },
}));
vi.mock("@/libs/redis", async (importOriginal) => importOriginal());
vi.mock("@/libs/services", () => ({
  SolrService: { searchCities: vi.fn() },
  WikidataService: { findNearestCityByCoordinates: vi.fn() },
}));
vi.mock("@/libs/Env", () => ({
  env: {
    WORLDCLIM_API_KEY: "test-key",
    REDIS_URL: "redis://localhost:6379",
    SOLR_URL: "http://localhost:8983",
    PORT: "3000",
    NODE_ENV: "test",
  },
}));

import { GET } from "@/app/api/cities/route";
import { REDIS_STRATEGIES } from "@/libs/redis";
import { RedisClient } from "@/libs/redis/client";
import { SolrService, WikidataService } from "@/libs/services";
import type { TWikidataCity } from "@/types";
import { NextRequest } from "next/server";

function makeRequest(q: string, lang = "en"): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/cities?q=${encodeURIComponent(q)}&lang=${lang}`,
  );
}

const mockCity: TWikidataCity = {
  id: "3169070",
  label: "Rome",
  description: "Capital city · Italy",
  lat: 41.8919,
  lng: 12.5113,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(RedisClient.incrementCounter).mockResolvedValue(1);
});

describe("GET /api/cities — empty queries", () => {
  it("returns [] for empty query without any cache or Solr calls", async () => {
    const res = await GET(makeRequest(""));
    expect(await res.json()).toEqual([]);
    expect(RedisClient.get).not.toHaveBeenCalled();
  });

  it("returns [] for single-char query", async () => {
    const res = await GET(makeRequest("a"));
    expect(await res.json()).toEqual([]);
    expect(SolrService.searchCities).not.toHaveBeenCalled();
  });
});

describe("GET /api/cities — text search cache hit", () => {
  it("returns cached results without calling Solr or writing to cache", async () => {
    vi.mocked(RedisClient.get).mockResolvedValue([mockCity]);

    const res = await GET(makeRequest("rome"));

    expect(await res.json()).toEqual([mockCity]);
    expect(SolrService.searchCities).not.toHaveBeenCalled();
    expect(RedisClient.set).not.toHaveBeenCalled();
  });
});

describe("GET /api/cities — text search cache miss", () => {
  it("calls Solr and caches the results", async () => {
    vi.mocked(RedisClient.get).mockResolvedValue(null);
    vi.mocked(SolrService.searchCities).mockResolvedValue([mockCity]);

    const res = await GET(makeRequest("rome"));

    expect(await res.json()).toEqual([mockCity]);
    expect(SolrService.searchCities).toHaveBeenCalledWith("rome", "en");
    expect(RedisClient.set).toHaveBeenCalled();
  });

  it("does not cache empty Solr results", async () => {
    vi.mocked(RedisClient.get).mockResolvedValue(null);
    vi.mocked(SolrService.searchCities).mockResolvedValue([]);

    await GET(makeRequest("xyzzy"));

    expect(RedisClient.set).not.toHaveBeenCalled();
  });
});

describe("GET /api/cities — short query TTL", () => {
  it("uses shortTtl for queries with fewer than 4 chars", async () => {
    vi.mocked(RedisClient.get).mockResolvedValue(null);
    vi.mocked(SolrService.searchCities).mockResolvedValue([mockCity]);

    await GET(makeRequest("lo"));

    expect(RedisClient.set).toHaveBeenCalledWith(
      expect.any(String),
      [mockCity],
      REDIS_STRATEGIES.citySearch.shortTtl,
    );
    expect(RedisClient.incrementCounter).not.toHaveBeenCalled();
  });
});

describe("GET /api/cities — popular query TTL", () => {
  it("uses popularTtl when counter reaches popularThreshold", async () => {
    vi.mocked(RedisClient.get).mockResolvedValue(null);
    vi.mocked(SolrService.searchCities).mockResolvedValue([mockCity]);
    vi.mocked(RedisClient.incrementCounter).mockResolvedValue(
      REDIS_STRATEGIES.citySearch.popularThreshold,
    );

    await GET(makeRequest("paris"));

    expect(RedisClient.set).toHaveBeenCalledWith(
      expect.any(String),
      [mockCity],
      REDIS_STRATEGIES.citySearch.popularTtl,
    );
  });

  it("uses regular ttl when counter is below popularThreshold", async () => {
    vi.mocked(RedisClient.get).mockResolvedValue(null);
    vi.mocked(SolrService.searchCities).mockResolvedValue([mockCity]);
    vi.mocked(RedisClient.incrementCounter).mockResolvedValue(1);

    await GET(makeRequest("paris"));

    expect(RedisClient.set).toHaveBeenCalledWith(
      expect.any(String),
      [mockCity],
      REDIS_STRATEGIES.citySearch.ttl,
    );
  });
});

describe("GET /api/cities — coordinate queries", () => {
  it("calls WikidataService and skips Solr for coordinate input", async () => {
    vi.mocked(RedisClient.get).mockResolvedValue(null);
    vi.mocked(WikidataService.findNearestCityByCoordinates).mockResolvedValue(mockCity);

    const res = await GET(makeRequest("48.8566,2.3522"));

    expect(await res.json()).toEqual([mockCity]);
    expect(WikidataService.findNearestCityByCoordinates).toHaveBeenCalledWith(48.8566, 2.3522);
    expect(SolrService.searchCities).not.toHaveBeenCalled();
  });

  it("caches coordinate result with nearestCity TTL", async () => {
    vi.mocked(RedisClient.get).mockResolvedValue(null);
    vi.mocked(WikidataService.findNearestCityByCoordinates).mockResolvedValue(mockCity);

    await GET(makeRequest("48.8566,2.3522"));

    expect(RedisClient.set).toHaveBeenCalledWith(
      expect.any(String),
      [mockCity],
      REDIS_STRATEGIES.nearestCity.ttl,
    );
  });

  it("returns cached city for coordinates without calling WikidataService", async () => {
    vi.mocked(RedisClient.get).mockResolvedValue([mockCity]);

    const res = await GET(makeRequest("48.8566,2.3522"));

    expect(await res.json()).toEqual([mockCity]);
    expect(WikidataService.findNearestCityByCoordinates).not.toHaveBeenCalled();
  });

  it("returns [] and does not cache when WikidataService finds nothing", async () => {
    vi.mocked(RedisClient.get).mockResolvedValue(null);
    vi.mocked(WikidataService.findNearestCityByCoordinates).mockResolvedValue(null);

    const res = await GET(makeRequest("0,0"));

    expect(await res.json()).toEqual([]);
    expect(RedisClient.set).not.toHaveBeenCalled();
  });
});
