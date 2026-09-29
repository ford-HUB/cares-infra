import { create } from 'zustand'
import { listCalendarEvents } from '../services/calendar-service'
import type { CalendarEvent } from '../types/calendar'

interface CalendarState {
  events: CalendarEvent[]
  loading: boolean
  /** False until the first fetch settles, so the grid doesn't flash as empty. */
  initialized: boolean
  error: string | null
  fetchEvents: () => Promise<void>
}

export const useCalendarStore = create<CalendarState>((set) => ({
  events: [],
  loading: false,
  initialized: false,
  error: null,

  fetchEvents: async () => {
    set({ loading: true, error: null })
    const res = await listCalendarEvents()

    if (res.success && res.data) {
      set({ events: res.data, loading: false, initialized: true })
    } else {
      set({
        loading: false,
        initialized: true,
        error: res.message ?? 'Calendar events could not be loaded',
      })
    }
  },
}))
