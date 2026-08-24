/** Why the attempt ended the way it did — anything but `success` is a refusal. */
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

/** Which client the attempt came from. */
export type LoginSource = 'portal' | 'mobile'

export type LoginActivityRange = '24h' | '7d' | '30d' | 'all'

export interface LoginActivityEntry {
  id: string
  /** Undefined when the submitted email matched no account. */
  userId?: string
  /** The email exactly as submitted, kept even when no account matched. */
  email: string
  firstName?: string
  lastName?: string
  /** Lowercased RoleType — `admin`, `director`, `volunteer`, … */
  role?: string
  ipAddress: string
  userAgent?: string
  source: LoginSource
  outcome: LoginOutcome
  /** The message the client was shown; undefined on a successful sign-in. */
  failureReason?: string
  createdAt: string
}

/** The filters alone — what a scroll page has to repeat to stay on the same result set. */
export interface LoginActivityFilters {
  search?: string
  outcome?: LoginOutcome | 'all'
  source?: LoginSource | 'all'
  range?: LoginActivityRange
}

export interface LoginActivityQuery extends LoginActivityFilters {
  /** Id of the last entry already shown; the next page starts after it. */
  cursor?: string
  limit?: number
}

export interface LoginActivityPage {
  success: boolean
  message?: string
  list: LoginActivityEntry[]
  /** Total matching attempts on the server, across every page. */
  total: number
  /** Absent once the trail is exhausted — that is how the scroll knows to stop. */
  nextCursor?: string
}
