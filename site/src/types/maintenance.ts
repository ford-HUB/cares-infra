export type MaintenanceSurface =
  | 'portal'
  | 'mobile'
  | 'public'
  | 'api'

export type SurfaceState =
  | 'live'
  | 'down'
  | 'booked'

export interface MaintenanceMode {
  enabled: boolean
  surfaces: MaintenanceSurface[]
  /** Null while fully live. */
  since: string | null
  estimatedEndAt: string | null
  message: string
  allowAdmins: boolean
  changedBy: string | null
}

export type WindowState =
  | 'scheduled'
  | 'active'
  | 'completed'
  | 'cancelled'

export interface MaintenanceWindow {
  id: string
  title: string
  reason: string
  surfaces: MaintenanceSurface[]
  startAt: string
  endAt: string
  state: WindowState
  /** Minutes before `startAt`; 0 means none. */
  noticeLeadMinutes: number
  allowAdmins: boolean
  createdBy: string
}

export type AnnouncementTone = 'info' | 'warning' | 'critical'

export type AnnouncementAudience = 'volunteers' | 'beneficiaries' | 'donors' | 'coordinators'

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
  publishAt: string
  /** Null means it stays until taken down. */
  expiresAt: string | null
  pinned: boolean
  windowId: string | null
  author: string
  /** 0 until it publishes. */
  reach: number
}

export interface MaintenanceCounts {
  total: number
  live: number
  down: number
  booked: number
}
