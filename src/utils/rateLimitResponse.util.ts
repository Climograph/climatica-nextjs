import type { TRateLimitResult } from "@/libs/redis/rateLimit.type";
import { NextResponse } from "next/server";

export function rateLimitResponse(result: TRateLimitResult): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please slow down." },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.resetInSeconds),
        "Retry-After": String(result.resetInSeconds),
      },
    },
  );
}
