import type { LucideIcon } from 'lucide-react'
import type { StaffRole } from './staff-roles'

export interface NavLinkItem {
  type: 'link'
  label: string
  to: string
  icon: LucideIcon
  roles?: StaffRole[]
}

export interface NavGroupItem {
  type: 'group'
  label: string
  icon: LucideIcon
  roles?: StaffRole[]
  children: { label: string; to: string; roles?: StaffRole[] }[]
}

export type NavItem = NavLinkItem | NavGroupItem

export interface PortalNavConfig {
  portalTitle: string
  basePath: string
  items: NavItem[]
}
