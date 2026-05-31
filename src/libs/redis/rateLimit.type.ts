export type TRateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
};
