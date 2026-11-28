export type SessionSource = 'portal' | 'mobile'

/** Wider than `PortalRole`: mobile volunteers hold sessions too. */
export type SessionRole =
  | 'admin'
  | 'director'
  | 'coordinator'
  | 'volunteer'
  | 'donor'
  | 'beneficiary'

export interface ActiveSession {
  id: string
  userId: string
  email: string
  /** Null when the account was removed while the session was live. */
  firstName?: string
  lastName?: string
  avatar?: string
  department?: string
  role: SessionRole
  /** Can't sign in again, but the open session stays live. */
  isRestricted: boolean
  ipAddress: string
  userAgent?: string
  source: SessionSource
  signedInAt: string
  lastSeenAt: string
  expiresAt: string
  /** This browser; revoking it signs the admin out. */
  isCurrent: boolean
}

export interface ActiveSessionsFilters {
  search?: string
  source?: SessionSource | 'all'
  role?: SessionRole | 'all'
}

export interface ActiveSessionsQuery extends ActiveSessionsFilters {
  cursor?: string
  limit?: number
}

export interface ActiveSessionsPage {
  success: boolean
  message?: string
  list: ActiveSession[]
  total: number
  /** Absent once exhausted. */
  nextCursor?: string
}

export interface RevokeSessionsResult {
  success: boolean
  message?: string
  revoked: number
}
