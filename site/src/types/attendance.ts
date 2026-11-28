import type { AttendanceStatus, GeoValidationMethod } from './attendee'

/** Live geofence view, unlike `AttendanceStatus` (post-event ruling, `pending` while the event runs). `awaiting_sync`: no coordinates yet. */
export type LiveAttendanceState = 'in_area' | 'outside_area' | 'awaiting_sync'

export interface ActiveEventSession {
  eventId: number
  title: string
  location: string
  /** ISO timestamps. */
  startsAt: string
  endsAt: string
  /** Metres. */
  radiusMeters: number
  coordinator: string
}

export interface LiveAttendee {
  id: string
  firstName: string
  lastName: string
  email: string
  contactNumber?: string
  department?: string
  yearLevel?: string
  state: LiveAttendanceState
  /** `pending` for everyone until validation runs. */
  status: AttendanceStatus
  validationMethod?: GeoValidationMethod | null
  firstPingAt?: string | null
  lastPingAt?: string | null
  /** From the geofence centre at the last reading, in metres. */
  distanceMeters?: number | null
  /** Share (0–1) of elapsed event time inside the area. */
  insideRatio?: number
  remarks?: string
}

export interface LiveAttendanceSnapshot {
  /** Null when no event today has started yet. */
  session: ActiveEventSession | null
  attendees: LiveAttendee[]
  capturedAt: string
}

/** Derived from the snapshot, never stored. */
export interface LiveAttendanceCounts {
  roster: number
  inArea: number
  outsideArea: number
  awaitingSync: number
}
