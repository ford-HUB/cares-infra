/**
 * Permission keys are the server's `PermissionKey` enum values, kept as a plain string
 * so a new key added on the server flows through the catalog endpoint without a
 * matching edit here. The catalog is the source of truth for what exists.
 */
export type PermissionKey = string

export type PermissionOverrideEffect = 'GRANT' | 'REVOKE'

export interface PermissionDescriptor {
  key: PermissionKey
  module: string
  label: string
  description: string
  /** Server-flagged as worth a confirmation before it is handed out. */
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
  /** Lowercased RoleType — `admin`, `director`, `coordinator`. */
  role: string
  department?: string
  isRestricted: boolean
  /** The root operator account — its actions cannot be suspended. */
  isProtected: boolean
  /** In force right now: baseline + grants − revokes − active suspensions. */
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
  /** False once lifted or expired — the panel lists history as well as what's live. */
  active: boolean
}

/** Everything the rights panel shows — one request, fetched when the panel opens. */
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

/** How a single permission ended up on or off, for the panel's per-row badge. */
export type PermissionSource =
  | 'inherited'
  | 'granted'
  | 'revoked'
  | 'suspended'
  | 'unset'
