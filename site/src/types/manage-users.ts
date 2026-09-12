export type ManagedUserStatus = 'active' | 'restricted' | 'pending' | 'expired'

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
  /** Set while an administrator-issued credential is outstanding on the account. */
  credentialExpiresAt?: string
}

/** How the sign-in name is decided when an administrator provisions an account. */
export type ProvisionMode = 'manual' | 'generate'

export interface ProvisionUserPayload {
  mode: ProvisionMode
  firstName: string
  lastName: string
  /** Required in `manual` mode; the server mints one in `generate` mode. */
  email?: string
  role: string
  department?: string
  phoneNumber?: string
  /** The complete set of actions the account should hold; omit to keep the role baseline. */
  permissions?: string[]
  expiresInHours: number
}

/**
 * The plaintext credential, handed back once at issue time. Nothing can look it up
 * afterwards, so the dialog showing it is the only chance to copy it.
 */
export interface IssuedCredentials {
  email: string
  password: string
  expiresAt: string
}

export interface ProvisionUserResult {
  success: boolean
  message?: string
  user?: ManagedUser
  credentials?: IssuedCredentials
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

/** Server status codes: N = pending, F = failed, V = verified. */
export type ManagedUserVerificationStatus = 'N' | 'F' | 'V'

export interface ManagedUserVerification {
  status: ManagedUserVerificationStatus
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
