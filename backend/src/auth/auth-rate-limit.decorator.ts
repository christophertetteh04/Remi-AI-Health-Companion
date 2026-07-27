import { Throttle } from "@nestjs/throttler";

export const AUTH_ADJACENT_THROTTLE = { default: { limit: 5, ttl: 60000 } } as const;

export function AuthAdjacentThrottle() {
  return Throttle(AUTH_ADJACENT_THROTTLE);
}
