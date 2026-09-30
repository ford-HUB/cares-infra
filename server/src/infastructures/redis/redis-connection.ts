import type { RedisOptions } from 'ioredis';

/**
 * Connection options shared by RedisService and BullMQ. REDIS_URL (what Railway's
 * Redis provides, password included) wins; otherwise REDIS_HOST / REDIS_PORT /
 * REDIS_USERNAME / REDIS_PASSWORD are used, which is how docker-compose wires it.
 */
export function redisConnectionOptions(): RedisOptions {
  // 0 lets DNS pick IPv4 or IPv6 — Railway's private network may be IPv6-only.
  const family = 0;
  const url = process.env.REDIS_URL?.trim();

  if (url) {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 6379),
      username: decodeURIComponent(parsed.username) || undefined,
      password: decodeURIComponent(parsed.password) || undefined,
      tls: parsed.protocol === 'rediss:' ? {} : undefined,
      family,
    };
  }

  return {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT ?? 6379),
    username: process.env.REDIS_USERNAME || undefined,
    password: process.env.REDIS_PASSWORD || undefined,
    family,
  };
}
