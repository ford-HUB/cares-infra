import type { LucideIcon } from 'lucide-react'
import type { NavGate } from './nav'

export type PortalSearchKind = 'record' | 'page' | 'setting' | 'action'

export type PortalSearchActionId = 'toggle-theme' | 'sign-out'

export interface PortalSearchEntry {
  id: string
  kind: PortalSearchKind
  label: string
  /** e.g. "Manage Event". */
  trail?: string
  description?: string
  keywords: string[]
  icon: LucideIcon
  to?: string
  action?: PortalSearchActionId
  /** Carries the typed text so the module pre-fills its search and highlights it. */
  find?: boolean
}

export interface PortalFindState {
  term: string
  /** Lets a repeated search for the same text re-apply. */
  nonce: number
  /** The module's filter is left as is. */
  dismissed?: boolean
}

export interface PortalSearchRouteMeta {
  description: string
  keywords: string[]
}

export interface PortalSearchExtraEntry extends NavGate {
  kind: 'page' | 'setting'
  label: string
  trail?: string
  to: string
  icon: LucideIcon
  description: string
  keywords: string[]
}
