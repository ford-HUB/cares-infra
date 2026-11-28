import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../infastructures/redis/redis-service';
import { DurationUtils } from '../../../shared/utils/duration-utils';
import type { RequestContextDto } from '../../../shared/decorators/request-context-decorator';
import type { JwtPayload } from '../../../shared/types/jwt-payload';
import type { AuditLogChangeDto } from '../../audit-logs/dto/audit-logs-site-dto';
import { AuditLogRecorder } from '../../audit-logs/services/audit-log-recorder';
import type {
  SecurityPolicyDto,
  SecurityPolicyValuesDto,
  UpdateSecurityPolicyDto,
} from '../dto/security-policy-site-dto';
import type { PasswordRulesDto } from '../dto/security-policy-public-dto';
import { SecurityPolicyRepository } from '../repositories/security-policy-repository';

const POLICY_CACHE_KEY = 'security-policy';

/** Saves invalidate immediately; the TTL only bounds other instances' staleness. */
const POLICY_CACHE_TTL = DurationUtils.FIVE_MINUTES;

/** Must match the column defaults in `schema.prisma`. */
export const DEFAULT_SECURITY_POLICY: SecurityPolicyValuesDto = {
  password_min_length: 8,
  password_require_uppercase: true,
  password_require_lowercase: true,
  password_require_number: true,
  password_require_symbol: false,

  lockout_enabled: true,
  lockout_max_attempts: 5,
  lockout_window_minutes: 15,
  lockout_duration_minutes: 30,

  session_idle_timeout_minutes: 0,
  session_max_duration_hours: 0,
  max_concurrent_sessions: 0,

  login_hours_enabled: false,
  login_hours_start_minute: 0,
  login_hours_end_minute: 1440,

  ip_allowlist: [],
};

@Injectable()
export class SecurityPolicyService {
  private readonly logger = new Logger(SecurityPolicyService.name);

  constructor(
    private readonly securityPolicyRepository: SecurityPolicyRepository,
    private readonly redisService: RedisService,
    private readonly auditLogRecorder: AuditLogRecorder,
  ) {}

  /** Never throws: falls back to defaults. */
  async getPolicy(): Promise<SecurityPolicyValuesDto> {
    try {
      const cached =
        await this.redisService.get<SecurityPolicyValuesDto>(POLICY_CACHE_KEY);
      if (cached) {
        return cached;
      }

      const row = await this.securityPolicyRepository.findPolicy();
      const policy = row ? toValues(row) : DEFAULT_SECURITY_POLICY;

      await this.redisService.set(POLICY_CACHE_KEY, policy, POLICY_CACHE_TTL);
      return policy;
    } catch (error) {
      this.logger.error(
        'Falling back to the default security policy',
        error instanceof Error ? error.stack : undefined,
      );
      return DEFAULT_SECURITY_POLICY;
    }
  }

  /** Same cache as enforcement, so forms match the server. */
  async getPasswordRules(): Promise<PasswordRulesDto> {
    const policy = await this.getPolicy();

    return {
      password_min_length: policy.password_min_length,
      password_require_uppercase: policy.password_require_uppercase,
      password_require_lowercase: policy.password_require_lowercase,
      password_require_number: policy.password_require_number,
      password_require_symbol: policy.password_require_symbol,
    };
  }

  async getPolicyDetail(): Promise<SecurityPolicyDto> {
    const row = await this.securityPolicyRepository.findPolicy();

    return {
      ...(row ? toValues(row) : DEFAULT_SECURITY_POLICY),
      updated_by_user_id: row?.updated_by_user_id ?? null,
      updated_at: row?.updatedAt.toISOString() ?? null,
    };
  }

  async updatePolicy(
    data: UpdateSecurityPolicyDto,
    actor: JwtPayload,
    context: RequestContextDto = {},
  ): Promise<SecurityPolicyDto> {
    // Diff against what was stored.
    const previous = await this.getPolicyDetail();

    const row = await this.securityPolicyRepository.savePolicy(data, actor.sub);

    // Drop rather than overwrite, so a failed write can't leave a phantom policy cached.
    await this.redisService.delete(POLICY_CACHE_KEY);

    const changes = diffPolicies(previous, data);
    await this.auditLogRecorder.record({
      action: 'security-policy.updated',
      description: changes.length
        ? `Updated the security policy (${changes.length} setting${changes.length === 1 ? '' : 's'})`
        : 'Saved the security policy with no changes',
      category: 'SYSTEM',
      // Governs sign-in, so NOTICE.
      severity: 'NOTICE',
      actor,
      targetType: 'system',
      targetLabel: 'Security policy',
      targetId: row.security_policy_id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      changes,
    });

    return {
      ...toValues(row),
      updated_by_user_id: row.updated_by_user_id,
      updated_at: row.updatedAt.toISOString(),
    };
  }
}

/** Stringified: the trail stores text. */
function diffPolicies(
  previous: SecurityPolicyValuesDto,
  next: SecurityPolicyValuesDto,
): AuditLogChangeDto[] {
  return (Object.keys(next) as (keyof SecurityPolicyValuesDto)[]).flatMap(
    (field) => {
      const before = format(previous[field]);
      const after = format(next[field]);

      return before === after ? [] : [{ field, before, after }];
    },
  );
}

function format(
  value: SecurityPolicyValuesDto[keyof SecurityPolicyValuesDto],
): string {
  // Otherwise "" is indistinguishable from unset.
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'none';
  return String(value);
}

type SecurityPolicyRow = SecurityPolicyValuesDto & Record<string, unknown>;

function toValues(row: SecurityPolicyRow): SecurityPolicyValuesDto {
  return {
    password_min_length: row.password_min_length,
    password_require_uppercase: row.password_require_uppercase,
    password_require_lowercase: row.password_require_lowercase,
    password_require_number: row.password_require_number,
    password_require_symbol: row.password_require_symbol,

    lockout_enabled: row.lockout_enabled,
    lockout_max_attempts: row.lockout_max_attempts,
    lockout_window_minutes: row.lockout_window_minutes,
    lockout_duration_minutes: row.lockout_duration_minutes,

    session_idle_timeout_minutes: row.session_idle_timeout_minutes,
    session_max_duration_hours: row.session_max_duration_hours,
    max_concurrent_sessions: row.max_concurrent_sessions,

    login_hours_enabled: row.login_hours_enabled,
    login_hours_start_minute: row.login_hours_start_minute,
    login_hours_end_minute: row.login_hours_end_minute,

    ip_allowlist: row.ip_allowlist,
  };
}
