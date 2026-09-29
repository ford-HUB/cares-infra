/**
 * Taking CARES down on purpose. Two jobs live on this screen and they are the same
 * job seen twice: the switch that closes a surface to its users, and the notice that
 * tells those users it is closing. A window announced late is a support ticket, so
 * the schedule and the announcement board sit on one page.
 */

/** A part of CARES that can be closed on its own. */
export type MaintenanceSurface =
  /** The staff portal — this app. */
  | 'portal'
  /** The volunteer mobile app. */
  | 'mobile'
  /** The public site: landing pages, event browsing, donation intake. */
  | 'public'
  /** The API the mobile app and the ML services talk to. */
  | 'api'

/** Where a surface sits right now. */
export type SurfaceState =
  /** Open and serving users. */
  | 'live'
  /** Closed — users see the maintenance notice. */
  | 'down'
  /** Open, but a window is booked that will close it. */
  | 'booked'

/** The system-wide switch, as it stands at this moment. */
export interface MaintenanceMode {
  /** True while at least one surface is closed by staff. */
  enabled: boolean
  /** Which surfaces the switch currently holds down. */
  surfaces: MaintenanceSurface[]
  /** When staff flipped it; null while the system is fully live. */
  since: string | null
  /** What users are told to expect — shown on the notice screen. */
  estimatedEndAt: string | null
  /** The notice body users read while a surface is closed. */
  message: string
  /** Admins keep portal access while everyone else is locked out. */
  allowAdmins: boolean
  /** Who last flipped the switch — the name on the audit line. */
  changedBy: string | null
}

/** Where a booked window sits in its life. */
export type WindowState =
  /** Booked, not started. */
  | 'scheduled'
  /** Running now — the surfaces it names are closed. */
  | 'active'
  /** Ran and ended. */
  | 'completed'
  /** Called off before it started. */
  | 'cancelled'

export interface MaintenanceWindow {
  id: string
  title: string
  /** One line on why the system is going down, in staff language. */
  reason: string
  surfaces: MaintenanceSurface[]
  startAt: string
  endAt: string
  state: WindowState
  /** Minutes before `startAt` that the heads-up notice goes out; 0 means none. */
  noticeLeadMinutes: number
  /** Admins keep portal access for the length of the window. */
  allowAdmins: boolean
  createdBy: string
}

/** How loudly an announcement reads. */
export type AnnouncementTone = 'info' | 'warning' | 'critical'

/** Who an announcement is addressed to. */
export type AnnouncementAudience = 'volunteers' | 'beneficiaries' | 'donors' | 'coordinators'

/** Where it is delivered. */
export type AnnouncementChannel = 'portal' | 'mobile' | 'email'

export type AnnouncementState = 'draft' | 'scheduled' | 'published' | 'expired'

export interface Announcement {
  id: string
  title: string
  body: string
  tone: AnnouncementTone
  audiences: AnnouncementAudience[]
  channels: AnnouncementChannel[]
  state: AnnouncementState
  /** When it goes out; already past for anything published. */
  publishAt: string
  /** When it stops showing; null means it stays until taken down. */
  expiresAt: string | null
  /** Held at the top of every feed it reaches. */
  pinned: boolean
  /** The window this announcement was written for, if any. */
  windowId: string | null
  author: string
  /** Accounts it reached — 0 until it publishes. */
  reach: number
}

/** The surface roster, counted for the banner. */
export interface MaintenanceCounts {
  total: number
  live: number
  down: number
  booked: number
}
