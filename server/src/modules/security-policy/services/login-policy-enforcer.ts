import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  LoginOutcome,
  LoginSource,
} from '../../../infastructures/prisma/common/client';
import { isProtectedAdminEmail } from '../../../shared/constants/protected-admin';
import { LoginActivityRepository } from '../../login-activity/repositories/login-activity-repository';
import { LoginActivityRecorder } from '../../login-activity/services/login-activity-recorder';
import type { SecurityPolicyValuesDto } from '../dto/security-policy-site-dto';
import { SecurityPolicyService } from './security-policy-service';

export interface LoginAttemptContext {
  email: string;
  ipAddress?: string;
  userAgent?: string;
  source: LoginSource;
}

const MINUTES_IN_DAY = 1440;

/**
 * Lockout, allowed hours and IP allowlist; refusals are logged first.
 * The root operator skips hours/allowlist (a typo mustn't lock out every admin) and its lockout is always time-bounded.
 * Hours and allowlist are portal-only; lockout applies everywhere.
 */
@Injectable()
export class LoginPolicyEnforcer {
  constructor(
    private readonly securityPolicyService: SecurityPolicyService,
    private readonly loginActivityRepository: LoginActivityRepository,
    private readonly loginActivityRecorder: LoginActivityRecorder,
    private readonly configService: ConfigService,
  ) {}

  async assertLoginAllowed(attempt: LoginAttemptContext): Promise<void> {
    const policy = await this.securityPolicyService.getPolicy();
    const isRootAdmin = isProtectedAdminEmail(
      attempt.email,
      this.configService,
    );

    if (!isRootAdmin && attempt.source === 'PORTAL') {
      await this.assertWithinLoginHours(policy, attempt);
      await this.assertIpAllowed(policy, attempt);
    }

    await this.assertNotLockedOut(policy, attempt, isRootAdmin);
  }

  /** Used wherever a password is set, so rules stay consistent. */
  async assertPasswordMeetsPolicy(password: string): Promise<void> {
    const policy = await this.securityPolicyService.getPolicy();
    const unmet: string[] = [];

    if (password.length < policy.password_min_length) {
      unmet.push(`at least ${policy.password_min_length} characters`);
    }
    if (policy.password_require_uppercase && !/[A-Z]/.test(password)) {
      unmet.push('an uppercase letter');
    }
    if (policy.password_require_lowercase && !/[a-z]/.test(password)) {
      unmet.push('a lowercase letter');
    }
    if (policy.password_require_number && !/\d/.test(password)) {
      unmet.push('a number');
    }
    if (policy.password_require_symbol && !/[^A-Za-z0-9]/.test(password)) {
      unmet.push('a symbol');
    }

    if (unmet.length > 0) {
      throw new BadRequestException(
        `Password must contain ${listToSentence(unmet)}`,
      );
    }
  }

  private async assertWithinLoginHours(
    policy: SecurityPolicyValuesDto,
    attempt: LoginAttemptContext,
  ): Promise<void> {
    if (!policy.login_hours_enabled) return;

    const now = new Date();
    const minuteOfDay = now.getHours() * 60 + now.getMinutes();
    const { login_hours_start_minute: start, login_hours_end_minute: end } =
      policy;

    // Start after end wraps past midnight (e.g. 20:00–06:00).
    const withinWindow =
      start <= end
        ? minuteOfDay >= start && minuteOfDay < end
        : minuteOfDay >= start || minuteOfDay < end;

    if (!withinWindow) {
      const message = `Sign-in is only allowed between ${formatMinute(start)} and ${formatMinute(end)}`;
      await this.refuse(attempt, 'OUTSIDE_LOGIN_HOURS', message);
      throw new ForbiddenException(message);
    }
  }

  private async assertIpAllowed(
    policy: SecurityPolicyValuesDto,
    attempt: LoginAttemptContext,
  ): Promise<void> {
    // Empty means no allowlist.
    if (policy.ip_allowlist.length === 0) return;

    const ip = attempt.ipAddress?.trim();
    if (ip && policy.ip_allowlist.includes(ip)) return;

    const message = 'Sign-in is not allowed from this network';
    await this.refuse(attempt, 'IP_NOT_ALLOWED', message);
    throw new ForbiddenException(message);
  }

  private async assertNotLockedOut(
    policy: SecurityPolicyValuesDto,
    attempt: LoginAttemptContext,
    isRootAdmin: boolean,
  ): Promise<void> {
    if (!policy.lockout_enabled) return;

    const windowStart = new Date(
      Date.now() - policy.lockout_window_minutes * 60 * 1000,
    );
    const { failures, lastFailureAt } =
      await this.loginActivityRepository.summarizeRecentAttempts(
        attempt.email,
        windowStart,
      );

    if (failures < policy.lockout_max_attempts) return;

    // Measured from the tripping failure so attempts during a lock don't extend it.
    const unlocksAt = this.unlockTime(
      policy,
      lastFailureAt ?? new Date(),
      isRootAdmin,
    );

    // Lock expired; a new failure starts a fresh count.
    if (unlocksAt && unlocksAt.getTime() <= Date.now()) return;

    // Remaining time, not a clock time (server is UTC).
    const message = unlocksAt
      ? `Too many failed sign-in attempts. Try again in ${formatRemaining(unlocksAt.getTime() - Date.now())}`
      : 'This account is locked after too many failed sign-in attempts. Contact an administrator';

    await this.refuse(attempt, 'LOCKED_OUT', message);
    throw new ForbiddenException(message);
  }

  /** Null = never; only for normal accounts. */
  private unlockTime(
    policy: SecurityPolicyValuesDto,
    lastFailureAt: Date,
    isRootAdmin: boolean,
  ): Date | null {
    const minutes =
      policy.lockout_duration_minutes > 0
        ? policy.lockout_duration_minutes
        : isRootAdmin
          ? policy.lockout_window_minutes
          : 0;

    if (minutes === 0) return null;
    return new Date(lastFailureAt.getTime() + minutes * 60 * 1000);
  }

  /** Best-effort. */
  private async refuse(
    attempt: LoginAttemptContext,
    outcome: LoginOutcome,
    reason: string,
  ): Promise<void> {
    await this.loginActivityRecorder.record({
      email: attempt.email,
      ipAddress: attempt.ipAddress,
      userAgent: attempt.userAgent,
      source: attempt.source,
      outcome,
      failureReason: reason,
    });
  }
}

function formatMinute(minuteOfDay: number): string {
  const normalized = minuteOfDay % MINUTES_IN_DAY;
  const hours = String(Math.floor(normalized / 60)).padStart(2, '0');
  const minutes = String(normalized % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** Rounded up. */
function formatRemaining(ms: number): string {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  }
  return parts.join(' ');
}

function listToSentence(items: string[]): string {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
