import type { LucideIcon } from 'lucide-react'
import type { NavGate } from './nav'

/** `record` is a row of data (a person, an event, a ticket) inside a module. */
export type PortalSearchKind = 'record' | 'page' | 'setting' | 'action'

export type PortalSearchActionId = 'toggle-theme' | 'sign-out'

/** One thing the header search can find: a screen to open or an action to run. */
export interface PortalSearchEntry {
  id: string
  kind: PortalSearchKind
  label: string
  /** Where it lives in the portal — the sidebar group or module, e.g. "Manage Event". */
  trail?: string
  description?: string
  /** Other words people use for it ("donor" → Donation, "logs" → Audit Logs). */
  keywords: string[]
  icon: LucideIcon
  to?: string
  action?: PortalSearchActionId
  /**
   * Opening it carries the typed text to the destination, which pre-fills the
   * module's own search box and highlights that text on screen.
   */
  find?: boolean
}

/** Rides in router location state from the header search to the module it opens. */
export interface PortalFindState {
  term: string
  /** Distinguishes two searches for the same text, so the second one re-applies. */
  nonce: number
  /** The viewer closed the highlight; the module's filter is left as it is. */
  dismissed?: boolean
}

/** What a route adds to search beyond its sidebar label. */
export interface PortalSearchRouteMeta {
  description: string
  keywords: string[]
}

/** A screen reachable in the portal but not listed in the sidebar. */
export interface PortalSearchExtraEntry extends NavGate {
  kind: 'page' | 'setting'
  label: string
  trail?: string
  to: string
  icon: LucideIcon
  description: string
  keywords: string[]
}
