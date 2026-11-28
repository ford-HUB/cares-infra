export type PortalRole = 'admin' | 'director' | 'coordinator'

import type { PermissionKey, SessionSuspension } from './access-control'

export interface AuthUser {
  id: string
  email: string
  role: PortalRole
  firstName: string
  lastName: string
  profileImage?: string
  /** Root operator; its sign-in email can't be changed. */
  isProtected?: boolean
  /** As last reported by the server; refreshed on sync. */
  permissions: PermissionKey[]
  /** Suspended rights are already missing from `permissions`; this lets the UI show them locked. */
  suspensions: SessionSuspension[]
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T | null
}
