import { SecurityPolicySchema } from './security-policy-site-validator';

/**
 * The password rules alone. Sign-up and password forms have to state the rules before
 * anyone is signed in, so this subset is public — but only this subset: the lockout,
 * session, login-hour and allowlist settings describe how the system defends itself
 * and stay behind the admin-only endpoint.
 */
export const PasswordRulesResponseSchema = SecurityPolicySchema.pick({
  password_min_length: true,
  password_require_uppercase: true,
  password_require_lowercase: true,
  password_require_number: true,
  password_require_symbol: true,
});
