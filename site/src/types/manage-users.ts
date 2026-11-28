export type ManagedUserStatus = 'active' | 'restricted' | 'pending' | 'expired'

export interface ManagedUser {
  id: string
  email: string
  firstName: string
  lastName: string
  /** Lowercased RoleType. */
  role: string
  status: ManagedUserStatus
  department?: string
  restrictionReason?: string
  lastLoginIp?: string
  blockedIps: string[]
  /** Set while an admin-issued credential is outstanding. */
  credentialExpiresAt?: string
}

export type ProvisionMode = 'manual' | 'generate'

export interface ProvisionUserPayload {
  mode: ProvisionMode
  /** Required in `manual` mode; the server mints one in `generate` mode. */
  email?: string
  recipientEmail: string
  role: string
  /** `STUDENT`, `STAFF`, `ALUMNI` or `PARTNER_BARANGAY`; `VOLUNTEER` role only. */
  volunteerType?: string
  department?: string
  /** `PARTNER_BARANGAY` type only, in place of a department. */
  partnerBarangay?: string
  /** Full target set; omit to keep the role baseline. */
  permissions?: string[]
  expiresInHours: number
}

export interface ProvisionEmailCheck {
  email: string
  valid: boolean
  /** Null when it passed. */
  reason: string | null
}

/** Null when nothing was mailed (a re-issue). */
export interface CredentialDelivery {
  recipient: string
  sent: boolean
}

/** Plaintext, returned once at issue; nothing can look it up later. */
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
  delivery?: CredentialDelivery | null
}

export interface ProvisionEmailCheckResult {
  success: boolean
  message?: string
  check?: ProvisionEmailCheck
}

export interface ManageUsersResult {
  success: boolean
  message?: string
  list: ManagedUser[]
  /** May exceed what was loaded. */
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
  graduationYear: string
}

/** N = pending, F = failed, V = verified. */
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
