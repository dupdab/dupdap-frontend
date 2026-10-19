export interface RateLimitUsage {
  limit: number;
  used: number;
}

export const RATE_LIMIT_ALERT_THRESHOLD = 0.8;

export function rateLimitPercent({ limit, used }: RateLimitUsage): number {
  if (!(limit > 0)) return 0;
  return Math.min(100, Math.max(0, Math.round((used / limit) * 100)));
}

export function isNearRateLimit(usage: RateLimitUsage): boolean {
  return rateLimitPercent(usage) >= RATE_LIMIT_ALERT_THRESHOLD * 100;
}

/** Tolerates a few response shapes: { limit, used } or { limit, remaining } or { requestsPerMinute, currentUsage }. */
export function parseRateLimit(data: any): RateLimitUsage | null {
  const limit = Number(data?.limit ?? data?.requestsPerMinute);
  if (!Number.isFinite(limit) || limit <= 0) return null;
  let used = Number(data?.used ?? data?.currentUsage ?? data?.usage);
  if (!Number.isFinite(used) && data?.remaining != null) used = limit - Number(data.remaining);
  if (!Number.isFinite(used)) used = 0;
  return { limit, used: Math.max(0, used) };
}
