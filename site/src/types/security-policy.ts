/** One object because the server stores a single row; the service maps snake_case. */
export interface SecurityPolicy {
  passwordMinLength: number
  passwordRequireUppercase: boolean
  passwordRequireLowercase: boolean
  passwordRequireNumber: boolean
  passwordRequireSymbol: boolean

  lockoutEnabled: boolean
  lockoutMaxAttempts: number
  lockoutWindowMinutes: number
  /** 0 keeps the lock until an admin lifts it. */
  lockoutDurationMinutes: number

  /** 0 disables the idle check. */
  sessionIdleTimeoutMinutes: number
  /** 0 defers to the token's own expiry. */
  sessionMaxDurationHours: number
  /** 0 means unlimited. */
  maxConcurrentSessions: number

  loginHoursEnabled: boolean
  /** Minutes since midnight. */
  loginHoursStartMinute: number
  loginHoursEndMinute: number

  ipAllowlist: string[]
}

export interface SecurityPolicyDetail extends SecurityPolicy {
  updatedByUserId?: string
  updatedAt?: string
}

export interface SecurityPolicyResult {
  success: boolean
  message?: string
  policy?: SecurityPolicyDetail
}
