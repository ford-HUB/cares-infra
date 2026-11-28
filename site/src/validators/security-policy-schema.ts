import { z } from 'zod'
import {
  IP_ALLOWLIST_MAX,
  LOCKOUT_ATTEMPTS_MAX,
  LOCKOUT_ATTEMPTS_MIN,
  MAX_CONCURRENT_SESSIONS_CEILING,
  MINUTES_IN_DAY,
  PASSWORD_MIN_LENGTH_CEILING,
  PASSWORD_MIN_LENGTH_FLOOR,
  SESSION_MAX_DURATION_HOURS_CEILING,
} from '../constants/security-policy'

/** Mirrors server `security-policy-site-validator.ts`; keep bounds in sync or saves 400. */
const wholeNumber = (min: number, max: number, label: string) =>
  z
    .number({ message: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .min(min, `${label} must be at least ${min}`)
    .max(max, `${label} must not exceed ${max}`)

export const securityPolicySchema = z
  .object({
    passwordMinLength: wholeNumber(
      PASSWORD_MIN_LENGTH_FLOOR,
      PASSWORD_MIN_LENGTH_CEILING,
      'Minimum password length',
    ),
    passwordRequireUppercase: z.boolean(),
    passwordRequireLowercase: z.boolean(),
    passwordRequireNumber: z.boolean(),
    passwordRequireSymbol: z.boolean(),

    lockoutEnabled: z.boolean(),
    lockoutMaxAttempts: wholeNumber(
      LOCKOUT_ATTEMPTS_MIN,
      LOCKOUT_ATTEMPTS_MAX,
      'Failed attempts before lockout',
    ),
    lockoutWindowMinutes: wholeNumber(1, MINUTES_IN_DAY, 'Attempt window'),
    lockoutDurationMinutes: wholeNumber(0, MINUTES_IN_DAY, 'Lockout duration'),

    sessionIdleTimeoutMinutes: wholeNumber(0, MINUTES_IN_DAY, 'Idle timeout'),
    sessionMaxDurationHours: wholeNumber(
      0,
      SESSION_MAX_DURATION_HOURS_CEILING,
      'Maximum session length',
    ),
    maxConcurrentSessions: wholeNumber(
      0,
      MAX_CONCURRENT_SESSIONS_CEILING,
      'Devices per account',
    ),

    loginHoursEnabled: z.boolean(),
    loginHoursStartMinute: wholeNumber(0, MINUTES_IN_DAY, 'Start of allowed hours'),
    loginHoursEndMinute: wholeNumber(0, MINUTES_IN_DAY, 'End of allowed hours'),

    ipAllowlist: z
      .array(z.string())
      .max(IP_ALLOWLIST_MAX, `Add at most ${IP_ALLOWLIST_MAX} addresses`),
  })
  .refine(
    (policy) =>
      !policy.loginHoursEnabled ||
      policy.loginHoursStartMinute !== policy.loginHoursEndMinute,
    {
      message: 'Allowed hours must span a range, not a single instant',
      path: ['loginHoursEndMinute'],
    },
  )

export type SecurityPolicyFormValues = z.infer<typeof securityPolicySchema>

/** Keep in sync with server `DEFAULT_SECURITY_POLICY`. */
export const securityPolicyDefaultValues: SecurityPolicyFormValues = {
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumber: true,
  passwordRequireSymbol: false,

  lockoutEnabled: true,
  lockoutMaxAttempts: 5,
  lockoutWindowMinutes: 15,
  lockoutDurationMinutes: 30,

  sessionIdleTimeoutMinutes: 0,
  sessionMaxDurationHours: 0,
  maxConcurrentSessions: 0,

  loginHoursEnabled: false,
  loginHoursStartMinute: 0,
  loginHoursEndMinute: MINUTES_IN_DAY,

  ipAllowlist: [],
}
