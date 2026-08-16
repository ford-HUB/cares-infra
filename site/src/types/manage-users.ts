export type ManagedUserStatus = 'active' | 'restricted' | 'pending'

export interface ManagedUser {
  id: string
  email: string
  firstName: string
  lastName: string
  /** Lowercased RoleType — `admin`, `director`, `coordinator`, `volunteer`, … */
  role: string
  status: ManagedUserStatus
  department?: string
  restrictionReason?: string
  lastLoginIp?: string
  blockedIps: string[]
}

export interface ManageUsersResult {
  success: boolean
  message?: string
  list: ManagedUser[]
  /** Total matching rows on the server, which may exceed what was loaded. */
  total: number
  truncated: boolean
}

export interface ManageUsersQuery {
  search?: string
  role?: string
  status?: ManagedUserStatus | 'all'
}

export interface ManagedUserSchoolInfo {
  idNumber: string
  department: string
  major: string
  yearLevel: string
  graduationDate: string
}

export interface ManagedUserVerification {
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  submittedAt: string
}

export interface ManagedUserBlockedIp {
  ipAddress: string
  reason?: string
  blockedAt: string
}

/** Everything the side panel shows — one request, fetched when the panel opens. */
export interface ManagedUserDetail extends ManagedUser {
  middleName?: string
  gender: string
  age: number
  phoneNumber: string
  currentAddress: string
  address: {
    street?: string
    barangay?: string
    city?: string
    province?: string
  }
  hasAvatar: boolean
  hasSignature: boolean
  restrictedAt?: string
  updatedAt: string
  createdAt: string
  schoolInfo?: ManagedUserSchoolInfo
  verifications: ManagedUserVerification[]
  interests: string[]
  blockedIpDetails: ManagedUserBlockedIp[]
}
