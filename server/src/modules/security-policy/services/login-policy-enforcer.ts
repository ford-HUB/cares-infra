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
 * Applies the parts of the security policy that gate a sign-in: account lockout,
 * allowed hours, and the IP allowlist. Each refusal is written to the login trail
 * before it is thrown, so the portal shows *why* someone could not get in.
 *
 * The root operator (see `protected-admin`) is exempt from the hours and allowlist
 * rules — those are configuration, and a typo in either must not leave the system
 * with no reachable administrator. It stays subject to lockout, which is what stops a
 * brute-force, but its lock is always time-bounded even when the policy says
 * "until an administrator lifts it".
 *
 * Hours and the allowlist are portal-only controls: they describe an office network
 * and office hours, which say nothing about a volunteer signing in from the field on
 * mobile data. Lockout applies to every source — brute-force is brute-force wherever
 * it comes from.
 */
@Injectable()
export class LoginPolicyEnforcer {
  constructor(
    private readonly securityPolicyService: SecurityPolicyService,
    private readonly loginActivityRepository: LoginActivityRepository,
    private readonly loginActivityRecorder: LoginActivityRecorder,
    private readonly configService: ConfigService,
  ) {}

  /** Throws when the policy refuses this attempt; returns quietly when it allows it. */
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

  /**
   * Rejects a password that does not satisfy the policy. Used wherever a password is
   * set — registration and the portal's change-password form — so the rules cannot
   * hold in one place and not the other.
   */
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

    // A start after the end means the window wraps past midnight (e.g. 20:00–06:00).
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
    // An empty allowlist is "no allowlist", not "allow nobody".
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

    // The clock runs from the failure that tripped the lock, so each further attempt
    // during a lock does not push the unlock time further out.
    const unlocksAt = this.unlockTime(
      policy,
      lastFailureAt ?? new Date(),
      isRootAdmin,
    );

    // The lock has aged out — the streak is stale, so the attempt goes through and a
    // fresh failure starts counting again.
    if (unlocksAt && unlocksAt.getTime() <= Date.now()) return;

    const message = unlocksAt
      ? `Too many failed sign-in attempts. Try again after ${unlocksAt.toLocaleTimeString()}`
      : 'This account is locked after too many failed sign-in attempts. Contact an administrator';

    await this.refuse(attempt, 'LOCKED_OUT', message);
    throw new ForbiddenException(message);
  }

  /**
   * When the lock lifts by itself. Null means never — only reachable for a normal
   * account, since the root operator always gets a bounded lock.
   */
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

  /** Writes the refusal to the login trail. Best-effort, like every other write there. */
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

function listToSentence(items: string[]): string {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
