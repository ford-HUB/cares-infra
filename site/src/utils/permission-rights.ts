import type {
  AccessUserDetail,
  PermissionKey,
  PermissionSource,
} from '../types/access-control'

/**
 * The rights the user holds on paper: role baseline ± per-user overrides, **before**
 * suspensions are applied.
 *
 * This is deliberately not `effectivePermissions`. A suspension is a temporary layer
 * over the grant, so the panel's toggles must show the underlying grant — if they
 * showed the effective set, saving the form would turn every active suspension into a
 * permanent revoke and lifting it later would restore nothing.
 */
export function grantedPermissions(detail: AccessUserDetail): Set<PermissionKey> {
  const granted = new Set(detail.rolePermissions)

  for (const override of detail.overrides) {
    if (override.effect === 'GRANT') {
      granted.add(override.permission)
    } else {
      granted.delete(override.permission)
    }
  }

  return granted
}

/** Permissions with a suspension currently in force. */
export function suspendedPermissions(
  detail: AccessUserDetail,
): Set<PermissionKey> {
  return new Set(
    detail.suspensions
      .filter((suspension) => suspension.active)
      .map((suspension) => suspension.permission),
  )
}

/** Why a permission reads the way it does, for the panel's per-row badge. */
export function permissionSource(
  permission: PermissionKey,
  detail: AccessUserDetail,
  granted: Set<PermissionKey>,
  suspended: Set<PermissionKey>,
): PermissionSource {
  if (suspended.has(permission)) return 'suspended'

  const override = detail.overrides.find(
    (entry) => entry.permission === permission,
  )
  if (override) return override.effect === 'GRANT' ? 'granted' : 'revoked'

  return granted.has(permission) ? 'inherited' : 'unset'
}

/** True when the selection differs from what is stored, gating the Save button. */
export function hasPendingChanges(
  selected: Set<PermissionKey>,
  granted: Set<PermissionKey>,
): boolean {
  if (selected.size !== granted.size) return true
  for (const permission of selected) {
    if (!granted.has(permission)) return true
  }
  return false
}
