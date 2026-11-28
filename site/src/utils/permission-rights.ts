import dayjs from 'dayjs'
import type {
  ActionSuspension,
  AccessUserDetail,
  PermissionKey,
  PermissionSource,
  SessionSuspension,
} from '../types/access-control'

/** Grant before suspensions, not `effectivePermissions`: saving the effective set would make suspensions permanent revokes. */
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

export function suspendedPermissions(detail: AccessUserDetail): Set<PermissionKey> {
  return new Set(
    detail.suspensions
      .filter((suspension) => suspension.active)
      .map((suspension) => suspension.permission),
  )
}

export function permissionSource(
  permission: PermissionKey,
  detail: AccessUserDetail,
  granted: Set<PermissionKey>,
  suspended: Set<PermissionKey>,
): PermissionSource {
  if (suspended.has(permission)) return 'suspended'

  const override = detail.overrides.find((entry) => entry.permission === permission)
  if (override) return override.effect === 'GRANT' ? 'granted' : 'revoked'

  return granted.has(permission) ? 'inherited' : 'unset'
}

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

export function activeSuspensionOf(
  permission: PermissionKey,
  detail: AccessUserDetail,
): ActionSuspension | undefined {
  return detail.suspensions.find(
    (entry) => entry.active && entry.permission === permission,
  )
}

/** e.g. "Issued 12 Sep 2026 · until 19 Sep 2026 (3 days left)" or "· until lifted". */
export function formatSuspensionWindow(suspension: SessionSuspension): {
  issued: string
  until: string
} {
  const issuedAt = dayjs(suspension.issuedAt)
  const issued = issuedAt.format('D MMM YYYY, h:mm A')

  if (!suspension.expiresAt) {
    return { issued, until: 'Until lifted by an admin' }
  }

  const expiresAt = dayjs(suspension.expiresAt)
  const daysLeft = expiresAt.diff(dayjs(), 'day')
  const remaining =
    daysLeft > 1 ? `${daysLeft} days left` : daysLeft === 1 ? '1 day left' : 'ends today'

  return {
    issued,
    until: `${expiresAt.format('D MMM YYYY, h:mm A')} (${remaining})`,
  }
}
