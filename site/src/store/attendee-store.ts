import { create } from 'zustand'
import { listEventAttendees } from '../services/attendee-service'
import type { EventAttendee } from '../types/attendee'

interface AttendeeState {
  attendees: EventAttendee[]
  loading: boolean
  /** False until the first fetch settles, so the summary doesn't flash zeroes. */
  initialized: boolean
  error: string | null
  fetchAttendees: () => Promise<void>
}

export const useAttendeeStore = create<AttendeeState>((set) => ({
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
}))
