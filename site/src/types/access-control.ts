/** Plain string so new server `PermissionKey`s flow through the catalog without an edit here. */
export type PermissionKey = string

export type PermissionOverrideEffect = 'GRANT' | 'REVOKE'

export interface PermissionDescriptor {
  key: PermissionKey
  module: string
  label: string
  description: string
  /** Server-flagged as needing confirmation. */
  sensitive: boolean
}

export interface RoleBaseline {
  role: string
  permissions: PermissionKey[]
}

export interface AccessCatalog {
  permissions: PermissionDescriptor[]
  modules: string[]
  roles: RoleBaseline[]
}

export interface AccessUser {
  id: string
  email: string
  firstName: string
  lastName: string
  /** Lowercased RoleType. */
  role: string
  department?: string
  isRestricted: boolean
  /** Root operator; its actions can't be suspended. */
  isProtected: boolean
  /** Baseline + grants − revokes − active suspensions. */
  effectivePermissions: PermissionKey[]
  grantedCount: number
  revokedCount: number
  suspendedCount: number
  latestSuspensionReason?: string
}

export interface AccessPermissionOverride {
  permission: PermissionKey
  effect: PermissionOverrideEffect
  reason?: string
  grantedByUserId: string
  updatedAt: string
}

export interface ActionSuspension {
  id: string
  permission: PermissionKey
  reason: string
  issuedByUserId: string
  issuedAt: string
  expiresAt?: string
  liftedAt?: string
  /** False once lifted or expired. */
  active: boolean
}

export interface SessionSuspension {
  permission: PermissionKey
  reason: string
  issuedAt: string
  expiresAt?: string
}

export interface AccessUserDetail extends AccessUser {
  rolePermissions: PermissionKey[]
  overrides: AccessPermissionOverride[]
  suspensions: ActionSuspension[]
}

export type AccessRightsFilter = 'all' | 'customised' | 'suspended'

export interface AccessUsersQuery {
  search?: string
  role?: string
  rights?: AccessRightsFilter
}

export interface AccessUsersResult {
  success: boolean
  message?: string
  list: AccessUser[]
  total: number
  truncated: boolean
}

export type PermissionSource = 'inherited' | 'granted' | 'revoked' | 'suspended' | 'unset'
