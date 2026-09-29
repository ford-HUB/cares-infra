import { create } from 'zustand'
import toast from 'react-hot-toast'
import {
  cancelMaintenanceWindow,
  fetchMaintenance,
  saveAnnouncement,
  saveMaintenanceWindow,
  setAnnouncementPinned,
  setAnnouncementState,
  setMaintenanceMode,
  setWindowRunning,
  type AnnouncementDraft,
  type MaintenanceWindowDraft,
} from '../services/maintenance-service'
import type {
  Announcement,
  AnnouncementState,
  MaintenanceMode,
  MaintenanceSurface,
  MaintenanceWindow,
} from '../types/maintenance'

interface MaintenanceStoreState {
  mode: MaintenanceMode | null
  windows: MaintenanceWindow[]
  announcements: Announcement[]
  /** False until the first read settles, so the banner doesn't flash "live" wrongly. */
  initialized: boolean
  error: string | null
  /** Which row or control is in flight — only that one locks. */
  busyId: string | null
  fetchAll: (options?: { silent?: boolean }) => Promise<void>
  applyMode: (
    surfaces: MaintenanceSurface[],
    patch?: Partial<Pick<MaintenanceMode, 'message' | 'allowAdmins' | 'estimatedEndAt'>>,
  ) => Promise<void>
  saveWindow: (id: string | null, draft: MaintenanceWindowDraft) => Promise<void>
  cancelWindow: (window: MaintenanceWindow) => Promise<void>
  toggleWindowRunning: (window: MaintenanceWindow, running: boolean) => Promise<void>
  saveNotice: (id: string | null, draft: AnnouncementDraft) => Promise<void>
  setNoticeState: (
    notice: Announcement,
    state: Extract<AnnouncementState, 'published' | 'expired'>,
  ) => Promise<void>
  togglePinned: (notice: Announcement) => Promise<void>
}

/** The server answers a mutation with the one row it touched; slot it into the board. */
function upsertAnnouncement(list: Announcement[], one: Announcement): Announcement[] {
  return list.some((existing) => existing.id === one.id)
    ? list.map((existing) => (existing.id === one.id ? one : existing))
    : [one, ...list]
}

/** Shared shape of every control: lock the row, apply, report, unlock. */
async function control(
  set: (partial: Partial<MaintenanceStoreState>) => void,
  id: string,
  action: () => Promise<Partial<MaintenanceStoreState>>,
  done: string,
) {
  set({ busyId: id })
  try {
    set(await action())
    toast.success(done)
  } catch (error) {
    toast.error(
      error instanceof Error && error.message
        ? error.message
        : 'The control plane did not accept that change.',
    )
  } finally {
    set({ busyId: null })
  }
}

export const useMaintenanceStore = create<MaintenanceStoreState>((set, get) => ({
  mode: null,
  windows: [],
  announcements: [],
  initialized: false,
  error: null,
  busyId: null,

  fetchAll: async (options) => {
    if (!options?.silent) set({ error: null })
    try {
      const snapshot = await fetchMaintenance()
      set({ ...snapshot, error: null, initialized: true })
    } catch {
      set({
        initialized: true,
        error: 'Could not read maintenance state. The control plane may be down.',
      })
    }
  },

  applyMode: async (surfaces, patch) => {
    await control(
      set,
      'mode',
      async () => ({ mode: await setMaintenanceMode(surfaces, patch) }),
      surfaces.length > 0
        ? 'Maintenance mode is on. Users now see the notice.'
        : 'CARES is live again.',
    )
  },

  saveWindow: async (id, draft) => {
    await control(
      set,
      id ?? 'new-window',
      async () => ({ windows: await saveMaintenanceWindow(id, draft) }),
      id ? 'Window updated.' : 'Window scheduled.',
    )
  },

  cancelWindow: async (window) => {
    await control(
      set,
      window.id,
      async () => ({ windows: await cancelMaintenanceWindow(window.id) }),
      `${window.title} cancelled.`,
    )
  },

  toggleWindowRunning: async (window, running) => {
    await control(
      set,
      window.id,
      () => setWindowRunning(window.id, running),
      running
        ? `${window.title} started — the surfaces it names are closed.`
        : `${window.title} ended. Those surfaces are live again.`,
    )
  },

  saveNotice: async (id, draft) => {
    await control(
      set,
      id ?? 'new-announcement',
      async () => ({
        announcements: upsertAnnouncement(
          get().announcements,
          await saveAnnouncement(id, draft),
        ),
      }),
      id ? 'Announcement saved.' : 'Announcement created.',
    )
  },

  setNoticeState: async (notice, state) => {
    await control(
      set,
      notice.id,
      async () => ({
        announcements: upsertAnnouncement(
          get().announcements,
          await setAnnouncementState(notice.id, state),
        ),
      }),
      state === 'published' ? 'Announcement published.' : 'Announcement taken down.',
    )
  },

  togglePinned: async (notice) => {
    await control(
      set,
      notice.id,
      async () => ({
        announcements: upsertAnnouncement(
          get().announcements,
          await setAnnouncementPinned(notice.id, !notice.pinned),
        ),
      }),
      notice.pinned ? 'Unpinned.' : 'Pinned to the top of every feed it reaches.',
    )
  },
}))
