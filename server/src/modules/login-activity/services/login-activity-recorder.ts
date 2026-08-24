import { Injectable, Logger } from '@nestjs/common';
import type {
  LoginOutcome,
  LoginSource,
} from '../../../infastructures/prisma/common/client';
import { LoginActivityRepository } from '../repositories/login-activity-repository';

/** Stored when Express could not resolve a client address, so the column stays non-null. */
const UNKNOWN_IP = 'unknown';

export interface LoginAttempt {
  /** Omitted when the submitted email matched no account. */
  userId?: string | null;
  email: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  source: LoginSource;
  outcome: LoginOutcome;
  failureReason?: string | null;
}

/**
 * Writes the sign-in trail on behalf of the auth services. Recording is deliberately
 * best-effort: a failed insert is logged and swallowed, because losing an audit row
 * must never turn a valid sign-in — or a already-failing one — into a 500.
 */
@Injectable()
export class LoginActivityRecorder {
  private readonly logger = new Logger(LoginActivityRecorder.name);

  constructor(
    private readonly loginActivityRepository: LoginActivityRepository,
  ) {}

  async record(attempt: LoginAttempt): Promise<void> {
    try {
      await this.loginActivityRepository.recordAttempt({
        userId: attempt.userId ?? null,
        email: attempt.email,
        ipAddress: attempt.ipAddress?.trim() || UNKNOWN_IP,
        userAgent: attempt.userAgent?.slice(0, 500) ?? null,
        source: attempt.source,
        outcome: attempt.outcome,
        failureReason: attempt.failureReason ?? null,
      });
    } catch (error) {
      this.logger.error(
        `Failed to record ${attempt.source} login attempt for ${attempt.email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
