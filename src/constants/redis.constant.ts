import { TCitySearchParams, TClimateSearch, TCoordinates } from "@/types";
import { TIME } from "./time.constant";

export const THRESHOLDS = {
  POPULAR_CITY: 10,
  POPULAR_CLIMATE: 5,
};

export const CACHE_TTL = {
  CITY_SEARCH_SHORT: TIME.IN_SECONDS.DAY,
  CITY_SEARCH: TIME.IN_SECONDS.SEVEN_DAYS,
  POPULAR_CITY: TIME.IN_SECONDS.THIRTY_DAYS,
  NEAREST_CITY: TIME.IN_SECONDS.SEVEN_DAYS,

  CLIMATE_DATA: TIME.IN_SECONDS.SEVEN_DAYS,
  POPULAR_CLIMATE: TIME.IN_SECONDS.THIRTY_DAYS,

  WORLDCLIM_RESOURCE: TIME.IN_SECONDS.THIRTY_DAYS,
} as const;

export const CACHE_KEYS = {
  CITY_SEARCH: (dto: TCitySearchParams) =>
    `city-search:${dto.lang}:${dto.query.toLowerCase().trim()}`,
  CITY_SEARCH_COUNTER: (dto: TCitySearchParams) =>
    `city-search-counter:${dto.lang}:${dto.query.toLowerCase().trim()}`,

  CLIMATE: (dto: TClimateSearch) =>
    `climate:${dto.dataset}:${dto.resolution}:${dto.lat.toFixed(4)}:${dto.lng.toFixed(4)}`,
  CLIMATE_COUNTER: (dto: TCoordinates) =>
    `climate-counter:${dto.lat.toFixed(4)}:${dto.lng.toFixed(4)}`,

  NEAREST_CITY_SEARCH: (dto: TCoordinates) =>
    `nearest-city:${dto.lat.toFixed(4)}:${dto.lng.toFixed(4)}`,

  WORLDCLIM_RESOURCE: (searchParams: string) => `worldclim-resource:${searchParams}`,
  WORLDCLIM_RESOURCE_COUNTER: (searchParams: string) =>
    `worldclim-resource-counter:${searchParams}`,
} as const;

/**
 * Errors that indicate a transient/recoverable server-side state — worth
 * forcing an immediate reconnect for. Deliberately does NOT include
 * connection-level errors like ECONNREFUSED/ETIMEDOUT — those mean Redis
 * is unreachable, and should be left to retryStrategy's bounded backoff
 * instead of triggering forced reconnects that reset its attempt counter.
 */
export const RECOVERABLE_REDIS_ERRORS = new Set([
  "READONLY", // * connected to a read-only replica (e.g. mid-failover)
  "LOADING", // * Redis is still loading the dataset into memory on startup
  "MASTERDOWN", // * Sentinel setup: master is currently down
  "CLUSTERDOWN", // * Redis Cluster is in a down/unhealthy state
]);
