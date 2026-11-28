import { z } from 'zod';

export const MINUTES_IN_DAY = 1440;

/** Stops a typo from locking everyone out. */
export const PASSWORD_MIN_LENGTH_FLOOR = 8;
export const PASSWORD_MIN_LENGTH_CEILING = 64;

const ipAddress = z.union([z.ipv4(), z.ipv6()], {
  error: 'Enter a valid IPv4 or IPv6 address',
});

export const SecurityPolicySchema = z.object({
  password_min_length: z
    .number()
    .int()
    .min(PASSWORD_MIN_LENGTH_FLOOR)
    .max(PASSWORD_MIN_LENGTH_CEILING),
  password_require_uppercase: z.boolean(),
  password_require_lowercase: z.boolean(),
  password_require_number: z.boolean(),
  password_require_symbol: z.boolean(),

  lockout_enabled: z.boolean(),
  lockout_max_attempts: z.number().int().min(3).max(20),
  lockout_window_minutes: z.number().int().min(1).max(MINUTES_IN_DAY),
  /** 0 = until an admin lifts it. */
  lockout_duration_minutes: z.number().int().min(0).max(MINUTES_IN_DAY),

  /** 0 disables. */
  session_idle_timeout_minutes: z.number().int().min(0).max(MINUTES_IN_DAY),
  /** 0 defers to token expiry. */
  session_max_duration_hours: z.number().int().min(0).max(720),
  /** 0 = unlimited. */
  max_concurrent_sessions: z.number().int().min(0).max(20),

  login_hours_enabled: z.boolean(),
  login_hours_start_minute: z.number().int().min(0).max(MINUTES_IN_DAY),
  login_hours_end_minute: z.number().int().min(0).max(MINUTES_IN_DAY),

  ip_allowlist: z.array(ipAddress).max(100),
});

/** Whole policy at once so "unchecked" ≠ "not sent". */
export const UpdateSecurityPolicySchema = SecurityPolicySchema.strict().refine(
  (policy) =>
    !policy.login_hours_enabled ||
    policy.login_hours_start_minute !== policy.login_hours_end_minute,
  {
    error: 'Allowed login hours must span a range, not a single instant',
    path: ['login_hours_end_minute'],
  },
);

export const SecurityPolicyResponseSchema = SecurityPolicySchema.extend({
  updated_by_user_id: z.string().nullable(),
  updated_at: z.iso.datetime().nullable(),
});
