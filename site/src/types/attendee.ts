/**
 * Where a volunteer stands for one event. Attendance is geofence-based: the app
 * records coordinates while the event runs and the AI service decides, afterwards,
 * whether the volunteer was inside the event area for its duration.
 *
 * `pending` until validation has ruled — before the event, while it runs, and after
 * it for as long as an offline device has still not pushed its coordinates; then
 * `completed` or `absent`.
 */
export type AttendanceStatus = 'pending' | 'completed' | 'absent'

/**
 * Where the coordinates the AI service judged came from. Offline devices buffer their
 * readings and push them as a CSV once back online, so a row can sit on
 * `awaiting_sync` with nothing to validate yet.
 */
export type GeoValidationMethod = 'geofence' | 'offline_sync' | 'awaiting_sync' | 'manual'

export interface EventAttendee {
  id: string
  eventId: number
  eventTitle: string
  eventDate: string
  firstName: string
  lastName: string
  email: string
  contactNumber?: string
  department?: string
  yearLevel?: string
  status: AttendanceStatus
  registeredAt: string
  /** First reading inside the event geofence. */
  checkedInAt?: string | null
  /** Last reading inside the event geofence. */
  checkedOutAt?: string | null
  validationMethod?: GeoValidationMethod | null
  /** Credited service hours; only meaningful once the attendee is completed. */
  hoursRendered?: number
  remarks?: string
}

/** One entry of the event picker, derived from the loaded roster. */
export interface AttendeeEventOption {
  eventId: number
  title: string
  eventDate: string
}
