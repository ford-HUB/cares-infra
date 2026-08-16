import type { LucideIcon } from 'lucide-react'
import type { PortalRole } from './portal-roles'

export interface NavLinkItem {
  type: 'link'
  label: string
  to: string
  icon: LucideIcon
  roles?: PortalRole[]
}

export interface NavGroupItem {
  type: 'group'
  label: string
  icon: LucideIcon
  roles?: PortalRole[]
  children: { label: string; to: string; roles?: PortalRole[] }[]
}

/**
 * Heading that labels the items following it, up to the next section. Purely
 * presentational — it renders no link and is dropped when every item it heads is
 * hidden from the current role.
 */
export interface NavSectionItem {
  type: 'section'
  label: string
  roles?: PortalRole[]
}

export type NavItem = NavLinkItem | NavGroupItem | NavSectionItem

export interface PortalNavConfig {
  portalTitle: string
  basePath: string
  items: NavItem[]
}
