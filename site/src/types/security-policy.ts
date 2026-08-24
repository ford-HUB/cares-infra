/**
 * The sign-in rules the portal edits, one object because the server stores and returns
 * them as a single row. Field names are the portal's camelCase; `security-policy-service`
 * maps them to and from the API's snake_case.
 */
export interface SecurityPolicy {
  passwordMinLength: number
  passwordRequireUppercase: boolean
  passwordRequireLowercase: boolean
  passwordRequireNumber: boolean
  passwordRequireSymbol: boolean

  lockoutEnabled: boolean
  lockoutMaxAttempts: number
  lockoutWindowMinutes: number
  /** 0 keeps the lock until an administrator lifts it. */
  lockoutDurationMinutes: number

  /** 0 disables the idle check. */
  sessionIdleTimeoutMinutes: number
  /** 0 leaves session length to the token's own expiry. */
  sessionMaxDurationHours: number
  /** 0 means unlimited devices per account. */
  maxConcurrentSessions: number

  loginHoursEnabled: boolean
  /** Minutes since midnight — the form renders them as a time of day. */
  loginHoursStartMinute: number
  loginHoursEndMinute: number

  ipAllowlist: string[]
}

/** The policy plus who last saved it, which only the settings screen shows. */
export interface SecurityPolicyDetail extends SecurityPolicy {
  updatedByUserId?: string
  updatedAt?: string
}

export interface SecurityPolicyResult {
  success: boolean
  message?: string
  policy?: SecurityPolicyDetail
}
