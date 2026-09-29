import type { LucideIcon } from 'lucide-react'
import type { PermissionKey } from './access-control'
import type { PortalRole } from './portal-roles'

/**
 * Two gates, both of which must pass. `roles` is the coarse split the portal was
 * built on; `permission` is the right an admin can grant or revoke per account in
 * Access Control. An item with neither is open to every signed-in portal user.
 */
export interface NavGate {
  roles?: PortalRole[]
  permission?: PermissionKey
}

export interface NavChildItem extends NavGate {
  label: string
  to: string
}

export interface NavLinkItem extends NavGate {
  type: 'link'
  label: string
  to: string
  icon: LucideIcon
}

export interface NavGroupItem extends NavGate {
  type: 'group'
  label: string
  icon: LucideIcon
  children: NavChildItem[]
}

/**
 * Heading that labels the items following it, up to the next section. Purely
 * presentational — it renders no link and is dropped when every item it heads is
 * hidden from the current role.
 */
export interface NavSectionItem extends NavGate {
  type: 'section'
  label: string
}

/** The one check every nav layer shares — the route guard applies the same two tests. */
export function navGateAllows(
  gate: NavGate,
  userRole: PortalRole | undefined,
  permissions: ReadonlySet<PermissionKey>,
): boolean {
  if (gate.roles && (!userRole || !gate.roles.includes(userRole))) return false
  if (gate.permission && !permissions.has(gate.permission)) return false
  return true
}

export type NavItem = NavLinkItem | NavGroupItem | NavSectionItem

export interface PortalNavConfig {
  portalTitle: string
  basePath: string
  items: NavItem[]
}
