import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly redis: Redis;

    constructor() {
        this.redis = new Redis({
            host: process.env.REDIS_HOST as string,
            port: Number(process.env.REDIS_PORT),
        });
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

    async delete(key: string): Promise<void> {
        await this.redis.del(key);
    }

    async onModuleDestroy(): Promise<void> {
        await this.redis.quit();
    }
}