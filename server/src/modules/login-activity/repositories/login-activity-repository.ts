import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type LoginOutcome,
  type LoginSource,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';

export interface RecordLoginAttemptInput {
  /** Null when the submitted email matched no account. */
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
  /** Null means "all time" — the range filter is left off entirely. */
  since: Date | null;
  /** Id of the last row already returned; the page starts after it. */
  cursor?: string;
  limit: number;
}

/**
 * Attempts that count towards a lockout: someone tried a credential and got it wrong.
 * A policy refusal (locked out, outside hours, IP not allowed) is deliberately absent
 * — counting those would let a lock renew itself forever.
 */
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

  /**
   * Appends one attempt. Sign-in must not fail because the trail could not be
   * written, so the caller treats a rejection here as non-fatal.
   */
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

  /**
   * How many times this email failed to sign in since `since`, and when it last
   * succeeded. The lockout policy is derived from the trail rather than a parallel
   * counter, so what locks an account is exactly what the portal displays.
   */
  async summarizeRecentAttempts(
    email: string,
    since: Date,
  ): Promise<{ failures: number; lastFailureAt: Date | null }> {
    const lastSuccess = await this.prisma.loginActivity.findFirst({
      where: { email, outcome: 'SUCCESS', createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    // A successful sign-in resets the streak, so only failures after it count.
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

  /**
   * Keyset paging, not offset: the cursor is the last row already shown, so an
   * attempt recorded while the operator scrolls cannot shift a row into the next page
   * and hide it. The id tiebreaker keeps rows written in the same millisecond ordered.
   */
  async listActivity(input: ListLoginActivityInput) {
    const where = buildWhere(input);

    // Two independent reads, so they run concurrently rather than holding a
    // transaction slot open — a paged read needs no atomicity.
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
