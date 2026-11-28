import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type LoginOutcome,
  type LoginSource,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';

export interface RecordLoginAttemptInput {
  /** Null when the email matched no account. */
  userId: string | null;
  email: string;
  ipAddress: string;
  userAgent?: string | null;
  source: LoginSource;
  outcome: LoginOutcome;
  failureReason?: string | null;
}

export interface ListLoginActivityInput {
  search?: string;
  outcome: LoginOutcome | 'all';
  source: LoginSource | 'all';
  /** Null = all time. */
  since: Date | null;
  /** Last returned id; the page starts after it. */
  cursor?: string;
  limit: number;
}

/** Policy refusals excluded, or a lock would renew itself forever. */
const CREDENTIAL_FAILURE_OUTCOMES: LoginOutcome[] = ['INVALID_CREDENTIALS'];

export type LoginActivityRow = Prisma.LoginActivityGetPayload<{
  include: {
    user: {
      select: {
        firstname: true;
        lastname: true;
        role: { select: { type: true } };
      };
    };
  };
}>;

@Injectable()
export class LoginActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The caller treats failures as non-fatal. */
  async recordAttempt(data: RecordLoginAttemptInput) {
    return this.prisma.loginActivity.create({
      data: {
        user_id: data.userId,
        email: data.email,
        ip_address: data.ipAddress,
        user_agent: data.userAgent ?? null,
        source: data.source,
        outcome: data.outcome,
        failure_reason: data.failureReason ?? null,
      },
      select: { login_activity_id: true },
    });
  }

  /** Lockout derives from the trail, so it matches what the portal shows. */
  async summarizeRecentAttempts(
    email: string,
    since: Date,
  ): Promise<{ failures: number; lastFailureAt: Date | null }> {
    const lastSuccess = await this.prisma.loginActivity.findFirst({
      where: { email, outcome: 'SUCCESS', createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    // A success resets the streak.
    const where = {
      email,
      outcome: { in: CREDENTIAL_FAILURE_OUTCOMES },
      createdAt: lastSuccess ? { gt: lastSuccess.createdAt } : { gte: since },
    };

    const [failures, lastFailure] = await Promise.all([
      this.prisma.loginActivity.count({ where }),
      this.prisma.loginActivity.findFirst({
        where,
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    return { failures, lastFailureAt: lastFailure?.createdAt ?? null };
  }

  /** Keyset paging so new rows can't shift into the next page; id breaks same-ms ties. */
  async listActivity(input: ListLoginActivityInput) {
    const where = buildWhere(input);

    // Concurrent reads; a paged read needs no transaction.
    const [rows, total] = await Promise.all([
      this.prisma.loginActivity.findMany({
        where,
        include: {
          user: {
            select: {
              firstname: true,
              lastname: true,
              role: { select: { type: true } },
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { login_activity_id: 'desc' }],
        take: input.limit,
        ...(input.cursor
          ? { cursor: { login_activity_id: input.cursor }, skip: 1 }
          : {}),
      }),
      this.prisma.loginActivity.count({ where }),
    ]);

    return { rows, total };
  }
}

function buildWhere(
  input: Omit<ListLoginActivityInput, 'cursor' | 'limit'>,
): Prisma.LoginActivityWhereInput {
  const search = input.search?.trim();

  return {
    ...(input.outcome === 'all' ? {} : { outcome: input.outcome }),
    ...(input.source === 'all' ? {} : { source: input.source }),
    ...(input.since ? { createdAt: { gte: input.since } } : {}),
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { ip_address: { contains: search, mode: 'insensitive' as const } },
            {
              user: {
                firstname: { contains: search, mode: 'insensitive' as const },
              },
            },
            {
              user: {
                lastname: { contains: search, mode: 'insensitive' as const },
              },
            },
          ],
        }
      : {}),
  };
}
