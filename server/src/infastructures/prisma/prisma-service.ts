import { Injectable } from '@nestjs/common';
import { PrismaClient } from './common/client';
import { PrismaPg } from '@prisma/adapter-pg';

/** `pg` defaults to 10 sockets; the portal's list screens open several at once. */
const DEFAULT_POOL_MAX = 20;

/** Prisma's 2s default is too short for a cold pooled connection. */
const DEFAULT_TRANSACTION_MAX_WAIT_MS = 15_000;
const DEFAULT_TRANSACTION_TIMEOUT_MS = 20_000;

function numberFromEnv(key: string, fallback: number): number {
  const parsed = Number(process.env[key]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
      max: numberFromEnv('DATABASE_POOL_MAX', DEFAULT_POOL_MAX),
      connectionTimeoutMillis: numberFromEnv(
        'DATABASE_CONNECTION_TIMEOUT_MS',
        10_000,
      ),
    });

    super({
      adapter,
      transactionOptions: {
        maxWait: numberFromEnv(
          'DATABASE_TRANSACTION_MAX_WAIT_MS',
          DEFAULT_TRANSACTION_MAX_WAIT_MS,
        ),
        timeout: numberFromEnv(
          'DATABASE_TRANSACTION_TIMEOUT_MS',
          DEFAULT_TRANSACTION_TIMEOUT_MS,
        ),
      },
    });
  }
}
