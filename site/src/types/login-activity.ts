/** Anything but `success` is a refusal. */
export type LoginOutcome =
  | 'success'
  | 'invalid-credentials'
  | 'blocked-ip'
  | 'restricted-account'
  | 'role-not-allowed'
  | 'locked-out'
  | 'outside-login-hours'
  | 'ip-not-allowed'
  | 'credential-expired'
  | 'email-not-verified'

export type LoginSource = 'portal' | 'mobile'

export type LoginActivityRange = '24h' | '7d' | '30d' | 'all'

export interface LoginActivityEntry {
  id: string
  /** Undefined when no account matched. */
  userId?: string
  /** As submitted, even when no account matched. */
  email: string
  firstName?: string
  lastName?: string
  /** Lowercased RoleType. */
  role?: string
  ipAddress: string
  userAgent?: string
  source: LoginSource
  outcome: LoginOutcome
  /** Undefined on success. */
  failureReason?: string
  createdAt: string
}

export interface LoginActivityFilters {
  search?: string
  outcome?: LoginOutcome | 'all'
  source?: LoginSource | 'all'
  range?: LoginActivityRange
}

export interface LoginActivityQuery extends LoginActivityFilters {
  cursor?: string
  limit?: number
}

export interface LoginActivityPage {
  success: boolean
  message?: string
  list: LoginActivityEntry[]
  total: number
  /** Absent once exhausted. */
  nextCursor?: string
}
