import { Injectable, Logger } from '@nestjs/common';
import type {
  LoginOutcome,
  LoginSource,
} from '../../../infastructures/prisma/common/client';
import { LoginActivityRepository } from '../repositories/login-activity-repository';

/** Keeps the column non-null when Express can't resolve the IP. */
const UNKNOWN_IP = 'unknown';

export interface LoginAttempt {
  /** Omitted when the email matched no account. */
  userId?: string | null;
  email: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  source: LoginSource;
  outcome: LoginOutcome;
  failureReason?: string | null;
}

/** Best-effort: failures are logged and swallowed, never a 500. */
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
