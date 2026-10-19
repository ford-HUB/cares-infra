import type {
  AttendanceStatus,
  EventAttendee,
  GeoValidationMethod,
  ManualAttendanceResult,
} from '../types/attendee'
import type { ApiResponse } from '../types/portal-roles'
import { apiClient, parseApiError } from './api-client'

/** Backend wraps successful responses in an { ok, data } envelope. */
type ApiEnvelope<T> = { ok: true; message?: string; data: T }

/** Server row shape — snake_case, with the Prisma enums upper-cased. */
interface EventAttendeeResponse {
  event_attendance_id: string
  event_id: number
  event_title: string
  event_started: string
  event_ended: string
  event_department: string | null
  user_id: string
  firstname: string
  lastname: string
  email: string
  phone_number: string | null
  department: string | null
  year_level: string | null
  status: 'PENDING' | 'COMPLETED' | 'ABSENT'
  validation_method: 'GEOFENCE' | 'OFFLINE_SYNC' | 'AWAITING_SYNC' | 'MANUAL' | null
  first_ping_at: string | null
  last_ping_at: string | null
  hours_rendered: number | null
  remarks: string | null
  registered_at: string
}

const STATUS_MAP: Record<EventAttendeeResponse['status'], AttendanceStatus> = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  ABSENT: 'absent',
}

const METHOD_MAP: Record<
  NonNullable<EventAttendeeResponse['validation_method']>,
  GeoValidationMethod
> = {
  GEOFENCE: 'geofence',
  OFFLINE_SYNC: 'offline_sync',
  AWAITING_SYNC: 'awaiting_sync',
  MANUAL: 'manual',
}

function toEventAttendee(row: EventAttendeeResponse): EventAttendee {
  return {
    id: row.event_attendance_id,
    eventId: row.event_id,
    eventTitle: row.event_title,
    eventDate: row.event_started,
    eventEndDate: row.event_ended,
    eventDepartment: row.event_department ?? undefined,
    firstName: row.firstname,
    lastName: row.lastname,
    email: row.email,
    contactNumber: row.phone_number ?? undefined,
    department: row.department ?? undefined,
    yearLevel: row.year_level ?? undefined,
    status: STATUS_MAP[row.status],
    registeredAt: row.registered_at,
    checkedInAt: row.first_ping_at,
    checkedOutAt: row.last_ping_at,
    validationMethod: row.validation_method
      ? METHOD_MAP[row.validation_method]
      : null,
    hoursRendered: row.hours_rendered ?? undefined,
    remarks: row.remarks ?? undefined,
  }
}

/** The whole roster across events; the page groups and filters it client-side. */
export async function listEventAttendees(): Promise<ApiResponse<EventAttendee[]>> {
  try {
    const { data: body } = await apiClient.get<ApiEnvelope<EventAttendeeResponse[]>>(
      '/api/v1/event-attendees',
    )
    return { success: true, data: body.data.map(toEventAttendee) }
  } catch (error) {
    return { success: false, message: parseApiError(error), data: null }
  }
}

interface ManualAttendanceResponse {
  marked: EventAttendeeResponse[]
  already_completed: number
}

/**
 * The backup for a failed geofence: marks these attendance rows present. The server
 * credits each the event's full start-to-end window as service hours.
 */
export async function markAttendeesPresent(
  eventAttendanceIds: string[],
  reason?: string,
): Promise<ApiResponse<ManualAttendanceResult>> {
  try {
    const { data: body } = await apiClient.post<ApiEnvelope<ManualAttendanceResponse>>(
      '/api/v1/event-attendees/manual-attendance',
      { event_attendance_ids: eventAttendanceIds, reason: reason || undefined },
    )
    return {
      success: true,
      message: body.message,
      data: {
        marked: body.data.marked.map(toEventAttendee),
        alreadyCompleted: body.data.already_completed,
      },
    }
  } catch (error) {
    return { success: false, message: parseApiError(error), data: null }
  }
}
