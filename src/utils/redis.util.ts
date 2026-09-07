import { RECOVERABLE_REDIS_ERRORS } from "@/constants";

export function isRecoverableRedisError(message: string): boolean {
  for (const code of RECOVERABLE_REDIS_ERRORS) {
    if (message.includes(code)) return true;
  }
  return false;
}
