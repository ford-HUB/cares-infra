import { create } from 'zustand'
import { getLiveAttendance } from '../services/attendance-log-service'
import type { ActiveEventSession, LiveAttendee } from '../types/attendance'

interface AttendanceState {
  session: ActiveEventSession | null
  attendees: LiveAttendee[]
  /** When the snapshot on screen was captured, shown next to the LIVE indicator. */
  capturedAt: string | null
  /** First load only — drives the skeleton. */
  loading: boolean
  /** A poll or a manual refresh over data already on screen — never blanks the table. */
  refreshing: boolean
  /** False until the first fetch settles, so the tiles don't flash zeroes. */
  initialized: boolean
  error: string | null
  fetchLiveAttendance: (options?: { silent?: boolean }) => Promise<void>
}

export const useAttendanceStore = create<AttendanceState>((set) => ({
  session: null,
  attendees: [],
  capturedAt: null,
  loading: false,
  refreshing: false,
  initialized: false,
  error: null,

  fetchLiveAttendance: async ({ silent = false } = {}) => {
    set(silent ? { refreshing: true } : { loading: true, error: null })
    const res = await getLiveAttendance()

    if (res.success && res.data) {
      set({
        session: res.data.session,
        attendees: res.data.attendees,
        capturedAt: res.data.capturedAt,
        loading: false,
        refreshing: false,
        initialized: true,
        error: null,
      })
    } else {
      set({
        loading: false,
        refreshing: false,
        initialized: true,
        error: res.message ?? 'Live attendance could not be loaded',
      })
    }
  },
}))
