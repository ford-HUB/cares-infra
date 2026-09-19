import type {
  LiveAttendanceSnapshot,
  LiveAttendanceState,
  LiveAttendee,
} from '../types/attendance'
import type { AttendanceStatus, GeoValidationMethod } from '../types/attendee'
import type { ApiResponse } from '../types/portal-roles'
import { apiClient, parseApiError } from './api-client'

/** Backend wraps successful responses in an { ok, data } envelope. */
type ApiEnvelope<T> = { ok: true; message?: string; data: T }

/** Server snapshot shape — snake_case, with the Prisma enums upper-cased. */
interface LiveAttendanceSnapshotResponse {
  session: {
    event_id: number
    title: string
    location: string
    started_at: string
    ended_at: string
    radius_meters: number | null
    coordinator: string
  } | null
  attendees: {
    event_attendance_id: string
    user_id: string
    firstname: string
    lastname: string
    email: string
    phone_number: string | null
    department: string | null
    year_level: string | null
    state: LiveAttendanceState
    status: 'PENDING' | 'COMPLETED' | 'ABSENT'
    validation_method: 'GEOFENCE' | 'OFFLINE_SYNC' | 'AWAITING_SYNC' | 'MANUAL' | null
    first_ping_at: string | null
    last_ping_at: string | null
    distance_meters: number | null
    inside_ratio: number | null
    remarks: string | null
  }[]
  captured_at: string
}

const STATUS_MAP: Record<
  LiveAttendanceSnapshotResponse['attendees'][number]['status'],
  AttendanceStatus
> = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  ABSENT: 'absent',
}

const METHOD_MAP: Record<
  NonNullable<LiveAttendanceSnapshotResponse['attendees'][number]['validation_method']>,
  GeoValidationMethod
> = {
  GEOFENCE: 'geofence',
  OFFLINE_SYNC: 'offline_sync',
  AWAITING_SYNC: 'awaiting_sync',
  MANUAL: 'manual',
}

function toLiveAttendee(
  row: LiveAttendanceSnapshotResponse['attendees'][number],
): LiveAttendee {
  return {
    id: row.event_attendance_id,
    firstName: row.firstname,
    lastName: row.lastname,
    email: row.email,
    contactNumber: row.phone_number ?? undefined,
    department: row.department ?? undefined,
    yearLevel: row.year_level ?? undefined,
    state: row.state,
    status: STATUS_MAP[row.status],
    validationMethod: row.validation_method ? METHOD_MAP[row.validation_method] : null,
    firstPingAt: row.first_ping_at,
    lastPingAt: row.last_ping_at,
    distanceMeters: row.distance_meters,
    insideRatio: row.inside_ratio ?? undefined,
    remarks: row.remarks ?? undefined,
  }
}

function toSnapshot(body: LiveAttendanceSnapshotResponse): LiveAttendanceSnapshot {
  return {
    session: body.session
      ? {
          eventId: body.session.event_id,
          title: body.session.title,
          location: body.session.location,
          startsAt: body.session.started_at,
          endsAt: body.session.ended_at,
          radiusMeters: body.session.radius_meters ?? 0,
          coordinator: body.session.coordinator,
        }
      : null,
    attendees: body.attendees.map(toLiveAttendee),
    capturedAt: body.captured_at,
  }
}

/**
 * One poll of today's running event and its roster. The server decides which event is
 * "active" — the portal never picks it, so a director watching the page can't drift
 * onto a stale event.
 */
export async function getLiveAttendance(): Promise<ApiResponse<LiveAttendanceSnapshot>> {
  try {
    const { data: body } = await apiClient.get<ApiEnvelope<LiveAttendanceSnapshotResponse>>(
      '/api/v1/event-attendees/live',
    )
    return { success: true, data: toSnapshot(body.data) }
  } catch (error) {
    return { success: false, message: parseApiError(error), data: null }
  }
}
