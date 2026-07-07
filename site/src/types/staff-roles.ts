export type StaffRole =
  | 'director'
  | 'staff'
  | 'coordinator'
  | 'assistant_coordinator'

export type PortalKind = 'director' | 'staff'

export interface AuthUser {
  id: string
  email: string
  role: StaffRole
  firstName: string
  lastName: string
  profileImage?: string
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T | null
}
