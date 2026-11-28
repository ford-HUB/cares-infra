/** `pending` until the AI service rules after the event (including while offline devices haven't synced). */
export type AttendanceStatus = 'pending' | 'completed' | 'absent'

/** Offline devices push buffered readings as CSV later, so rows can sit on `awaiting_sync`. */
export type GeoValidationMethod = 'geofence' | 'offline_sync' | 'awaiting_sync' | 'manual'

export interface EventAttendee {
  id: string
  eventId: number
  eventTitle: string
  eventDate: string
  /** Manual attendance opens after this. */
  eventEndDate: string
  /** Undefined for non-School events. */
  eventDepartment?: string
  firstName: string
  lastName: string
  email: string
  contactNumber?: string
  department?: string
  yearLevel?: string
  status: AttendanceStatus
  registeredAt: string
  checkedInAt?: string | null
  /** Breaks they returned from are ignored; stays null mid-event until gone an hour. */
  checkedOutAt?: string | null
  lastPingAt?: string | null
  validationMethod?: GeoValidationMethod | null
  /** Only meaningful once completed. */
  hoursRendered?: number
  remarks?: string
}

export interface AttendeeEventOption {
  eventId: number
  title: string
  eventDate: string
}

export interface ManualAttendanceResult {
  marked: EventAttendee[]
  /** Selected rows the server left untouched as already completed. */
  alreadyCompleted: number
}
