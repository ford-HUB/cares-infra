import { create } from 'zustand'
import { listEventAttendees, markAttendeesPresent } from '../services/attendee-service'
import type { ApiResponse } from '../types/portal-roles'
import type { EventAttendee, ManualAttendanceResult } from '../types/attendee'

interface AttendeeState {
  attendees: EventAttendee[]
  loading: boolean
  /** False until the first fetch settles, so the summary doesn't flash zeroes. */
  initialized: boolean
  error: string | null
  fetchAttendees: () => Promise<void>
  /** Marks rows present by hand and swaps the server's updated rows into the roster. */
  markPresent: (
    eventAttendanceIds: string[],
    reason?: string,
  ) => Promise<ApiResponse<ManualAttendanceResult>>
}

export const useAttendeeStore = create<AttendeeState>((set, get) => ({
  attendees: [],
  loading: false,
  initialized: false,
  error: null,

  fetchAttendees: async () => {
    set({ loading: true, error: null })
    const res = await listEventAttendees()

    if (res.success && res.data) {
      set({ attendees: res.data, loading: false, initialized: true })
    } else {
      set({
        loading: false,
        initialized: true,
        error: res.message ?? 'Attendees could not be loaded',
      })
    }
  },

  markPresent: async (eventAttendanceIds, reason) => {
    const res = await markAttendeesPresent(eventAttendanceIds, reason)
    if (res.success && res.data) {
      const updated = new Map(res.data.marked.map((row) => [row.id, row]))
      set({
        attendees: get().attendees.map((row) => updated.get(row.id) ?? row),
      })
    }
    return res
  },
}))
