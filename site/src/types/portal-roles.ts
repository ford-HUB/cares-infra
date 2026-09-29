export type PortalRole = 'admin' | 'director' | 'coordinator'

import type { PermissionKey, SessionSuspension } from './access-control'

export interface AuthUser {
  id: string
  email: string
  role: PortalRole
  firstName: string
  lastName: string
  profileImage?: string
  /** The root operator account — its sign-in email cannot be changed. */
  isProtected?: boolean
  /**
   * The rights in force for this session, as the server last reported them. The
   * sidebar and the route guards read this — an admin's change in Access Control
   * lands here on the next sync, and the portal redraws to match.
   */
  permissions: PermissionKey[]
  /**
   * Suspensions in force on this account. A suspended right is already missing from
   * `permissions`; this is what lets the portal keep the module or button on screen,
   * locked and red, and say why on hover instead of making it vanish.
   */
  suspensions: SessionSuspension[]
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T | null
}
