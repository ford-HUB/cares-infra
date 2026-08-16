export type PortalRole = 'admin' | 'director' | 'coordinator'

export interface AuthUser {
  id: string
  email: string
  role: PortalRole
  firstName: string
  lastName: string
  profileImage?: string
  /** The root operator account — its sign-in email cannot be changed. */
  isProtected?: boolean
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T | null
}
