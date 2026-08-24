import type { AttendanceStatus, GeoValidationMethod } from './attendee'

/**
 * What the geofence is seeing for one volunteer **right now**, while today's event is
 * still running. This is deliberately not `AttendanceStatus`: that one is the ruling
 * the AI validation service makes *after* the event, and it stays `pending` for every
 * volunteer for as long as the event runs. The director still needs to know, live,
 * who is actually on site — that is what this state answers.
 *
 * - `in_area`      readings are arriving and the latest one is inside the geofence
 * - `outside_area` readings are arriving but the latest one is outside it
 * - `awaiting_sync` no coordinates pushed yet — device offline, or app never opened
 */
export type LiveAttendanceState = 'in_area' | 'outside_area' | 'awaiting_sync'

/** The event whose roster the monitor is showing — today's, already started. */
export interface ActiveEventSession {
  eventId: number
  title: string
  location: string
  /** ISO timestamps; the header derives elapsed/remaining from these. */
  startsAt: string
  endsAt: string
  /** Radius of the event geofence, in metres. */
  radiusMeters: number
  coordinator: string
}

/** One roster row of the live monitor. */
export interface LiveAttendee {
  id: string
  firstName: string
  lastName: string
  email: string
  contactNumber?: string
  department?: string
  yearLevel?: string
  /** Live geofence reading — the column the director watches. */
  state: LiveAttendanceState
  /** Post-event ruling; `pending` for everyone until validation runs. */
  status: AttendanceStatus
  validationMethod?: GeoValidationMethod | null
  /** First reading recorded inside the geofence. */
  firstPingAt?: string | null
  /** Most recent reading of any kind, inside or outside. */
  lastPingAt?: string | null
  /** Distance from the geofence centre at the last reading, in metres. */
  distanceMeters?: number | null
  /** Share (0–1) of elapsed event time the readings place inside the area. */
  insideRatio?: number
  remarks?: string
}

/** One poll of the monitor: the running event plus its roster at `capturedAt`. */
export interface LiveAttendanceSnapshot {
  /** Null when no event of today's has started yet. */
  session: ActiveEventSession | null
  attendees: LiveAttendee[]
  capturedAt: string
}

/** Roster tallies the header tiles read; derived from the snapshot, never stored. */
export interface LiveAttendanceCounts {
  roster: number
  inArea: number
  outsideArea: number
  awaitingSync: number
}
