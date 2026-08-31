import { redisConnection } from "../config/redis";

/**
 * Returns the current UTC hour window key, e.g. "2026-08-30T16".
 * All counters are bucketed by this key so limits reset every hour
 * without needing any scheduled cleanup job.
 */
export function currentHourKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 13); // "YYYY-MM-DDTHH"
}

export function nextHourBoundary(date: Date = new Date()): Date {
  const next = new Date(date);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(next.getUTCHours() + 1);
  return next;
}

interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  hourKey: string;
}

/**
 * Atomically increments a per-sender, per-hour counter in Redis and
 * checks it against the limit. Using INCR + EXPIRE (via a single Lua
 * script) makes this safe across multiple worker processes/instances —
 * no in-memory counters, no race conditions.
 */
const INCR_AND_CHECK_LUA = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

local current = redis.call("INCR", key)
if current == 1 then
  redis.call("EXPIRE", key, ttl)
end

if current > limit then
  -- roll back our own increment's effect on "allowed" decision,
  -- but keep the counter accurate for observability
  return {0, current}
end

return {1, current}
`;

export async function checkAndIncrementRateLimit(
  senderId: string,
  maxPerHour: number
): Promise<RateLimitResult> {
  const hourKey = currentHourKey();
  const redisKey = `ratelimit:${senderId}:${hourKey}`;

  const result = (await redisConnection.eval(
    INCR_AND_CHECK_LUA,
    1,
    redisKey,
    maxPerHour.toString(),
    "3700" // TTL slightly over an hour so the key self-expires
  )) as [number, number];

  const [allowedFlag, currentCount] = result;

  return {
    allowed: allowedFlag === 1,
    currentCount,
    limit: maxPerHour,
    hourKey,
  };
}

/** Read-only peek, used by the dashboard to show current usage. */
export async function getCurrentUsage(senderId: string): Promise<number> {
  const redisKey = `ratelimit:${senderId}:${currentHourKey()}`;
  const val = await redisConnection.get(redisKey);
  return val ? parseInt(val, 10) : 0;
}
