import { TIME } from "@/constants";
import { env } from "@/libs/Env";
import { checkRateLimit } from "@/libs/redis";
import { getClientIp, rateLimitResponse } from "@/utils";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ queryId: string }> },
) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit(ip, "worldclim", 1000, TIME.IN_SECONDS.MINUTE);
  if (!rl.allowed) return rateLimitResponse(rl);
  const { queryId } = await params;
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `https://scrapi.gsic.uva.es/apis/worldclim/query?id=${queryId}&${searchParams}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.WORLDCLIM_API_KEY}`,
      Accept: "application/json",
    },
  });

  const data: unknown = await response.json();
  return NextResponse.json(data);
}
