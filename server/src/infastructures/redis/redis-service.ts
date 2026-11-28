import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { redisConnectionOptions } from './redis-connection';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis(redisConnectionOptions());
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const data = JSON.stringify(value);
    if (ttl) {
      await this.redis.set(key, data, 'EX', ttl);
      return;
    }

    this.redis.set(key, data);
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    if (!data) {
      return null;
    }
    return JSON.parse(data) as T;
  }

  async expire(key: string, ttl: number): Promise<void> {
    await this.redis.expire(key, ttl);
  }

  async ttl(key: string): Promise<number> {
    return this.redis.ttl(key);
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async deleteMany(keys: string[]): Promise<number> {
    if (keys.length === 0) {
      return 0;
    }
    return this.redis.del(...keys);
  }

  /** SCAN, not KEYS, to avoid blocking Redis. */
  async scanKeys(pattern: string, batch = 200): Promise<string[]> {
    const found = new Set<string>();
    let cursor = '0';

    do {
      const [next, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        batch,
      );
      keys.forEach((key) => found.add(key));
      cursor = next;
    } while (cursor !== '0');

    return [...found];
  }

  /** One round-trip; missing or unparsable entries are dropped. */
  async getMany<T>(keys: string[]): Promise<T[]> {
    if (keys.length === 0) {
      return [];
    }

    const values = await this.redis.mget(...keys);
    return values.reduce<T[]>((parsed, value) => {
      if (!value) {
        return parsed;
      }
      try {
        parsed.push(JSON.parse(value) as T);
      } catch {
      }
      return parsed;
    }, []);
  }

  /** Newest first, trimmed to `max`. */
  async pushCapped(key: string, value: unknown, max: number): Promise<void> {
    await this.redis
      .multi()
      .lpush(key, JSON.stringify(value))
      .ltrim(key, 0, max - 1)
      .exec();
  }

  /** Newest first; unparsable entries are dropped. */
  async listAll<T>(key: string): Promise<T[]> {
    const values = await this.redis.lrange(key, 0, -1);
    return values.reduce<T[]>((parsed, value) => {
      try {
        parsed.push(JSON.parse(value) as T);
      } catch {
      }
      return parsed;
    }, []);
  }

  async ping(): Promise<void> {
    await this.redis.ping();
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
