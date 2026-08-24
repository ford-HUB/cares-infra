/** Which client the device signed in from. */
export type SessionSource = 'portal' | 'mobile'

/**
 * Every account role a session can belong to — wider than `PortalRole`, because the
 * Flutter app's volunteers hold sessions too.
 */
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
  /** Null when the account was removed while its session was still live. */
  firstName?: string
  lastName?: string
  avatar?: string
  department?: string
  role: SessionRole
  /** A restricted account cannot sign in again, but its open session stays live. */
  isRestricted: boolean
  ipAddress: string
  userAgent?: string
  source: SessionSource
  signedInAt: string
  lastSeenAt: string
  expiresAt: string
  /** The browser viewing this page — revoking it signs the admin out. */
  isCurrent: boolean
}

/** Server-side filters — every one of them narrows on the server, search included. */
export interface ActiveSessionsFilters {
  search?: string
  source?: SessionSource | 'all'
  role?: SessionRole | 'all'
}

export interface ActiveSessionsQuery extends ActiveSessionsFilters {
  /** Cursor of the last session already shown; the next page starts after it. */
  cursor?: string
  limit?: number
}

export interface ActiveSessionsPage {
  success: boolean
  message?: string
  list: ActiveSession[]
  /** Total matching sessions on the server, across every page. */
  total: number
  /** Absent once the list is exhausted — that is how the scroll knows to stop. */
  nextCursor?: string
}

export interface RevokeSessionsResult {
  success: boolean
  message?: string
  revoked: number
}
