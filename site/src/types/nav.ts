import type { LucideIcon } from 'lucide-react'
import type { PermissionKey } from './access-control'
import type { PortalRole } from './portal-roles'

/** Both gates must pass; an item with neither is open to every portal user. */
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

/** Presentational; dropped when every item it heads is hidden. */
export interface NavSectionItem extends NavGate {
  type: 'section'
  label: string
}

/** Shared with the route guard. */
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
