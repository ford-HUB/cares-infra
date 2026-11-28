import { SecurityPolicySchema } from './security-policy-site-validator';

/** Public subset only; lockout, session, hours and allowlist settings stay admin-only. */
export const PasswordRulesResponseSchema = SecurityPolicySchema.pick({
  password_min_length: true,
  password_require_uppercase: true,
  password_require_lowercase: true,
  password_require_number: true,
  password_require_symbol: true,
});
