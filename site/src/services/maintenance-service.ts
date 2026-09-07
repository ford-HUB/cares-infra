import { MOCK_API_DELAY_MS, delay } from '../constants/durations'
import type {
  Announcement,
  AnnouncementState,
  MaintenanceMode,
  MaintenanceSurface,
  MaintenanceWindow,
} from '../types/maintenance'
import {
  buildMockAnnouncements,
  buildMockMaintenanceMode,
  buildMockMaintenanceWindows,
} from './mock-data'

/**
 * The maintenance control plane is not built yet, so this module serves fixtures and
 * keeps every change in memory. Swap each function for an `apiClient` call — the
 * signatures already match what the endpoints will return.
 */
let mode: MaintenanceMode = buildMockMaintenanceMode()
let windows: MaintenanceWindow[] = buildMockMaintenanceWindows()
let announcements: Announcement[] = buildMockAnnouncements()

export interface MaintenanceSnapshot {
  mode: MaintenanceMode
  windows: MaintenanceWindow[]
  announcements: Announcement[]
}

/** Everything the page draws, read in one shot — the three parts are one state. */
export async function fetchMaintenance(): Promise<MaintenanceSnapshot> {
  await delay(MOCK_API_DELAY_MS.default)
  return structuredClone({ mode, windows, announcements })
}

/** The switch itself. Closing nothing is the same as being live, so it clears the flag. */
export async function setMaintenanceMode(
  surfaces: MaintenanceSurface[],
  patch: Partial<Pick<MaintenanceMode, 'message' | 'allowAdmins' | 'estimatedEndAt'>> = {},
): Promise<MaintenanceMode> {
  await delay(MOCK_API_DELAY_MS.default)

  const enabled = surfaces.length > 0
  mode = {
    ...mode,
    ...patch,
    surfaces,
    enabled,
    // Staying down keeps the original timestamp — the notice says how long it has been.
    since: enabled ? (mode.since ?? new Date().toISOString()) : null,
    estimatedEndAt: enabled ? (patch.estimatedEndAt ?? mode.estimatedEndAt) : null,
    changedBy: enabled ? 'You' : null,
  }
  return structuredClone(mode)
}

export type MaintenanceWindowDraft = Omit<MaintenanceWindow, 'id' | 'state' | 'createdBy'>

export async function saveMaintenanceWindow(
  id: string | null,
  draft: MaintenanceWindowDraft,
): Promise<MaintenanceWindow[]> {
  await delay(MOCK_API_DELAY_MS.default)

  windows = id
    ? windows.map((one) => (one.id === id ? { ...one, ...draft } : one))
    : [
        {
          ...draft,
          id: `win-${Date.now()}`,
          state: 'scheduled',
          createdBy: 'You',
        },
        ...windows,
      ]

  return structuredClone(windows)
}

/** Called off, not deleted — a cancelled window is part of the record staff answer for. */
export async function cancelMaintenanceWindow(id: string): Promise<MaintenanceWindow[]> {
  await delay(MOCK_API_DELAY_MS.default)

  windows = windows.map((one) =>
    one.id === id ? { ...one, state: 'cancelled' as const } : one,
  )
  return structuredClone(windows)
}

/** Start a booked window early, or end a running one — the two ends of the same control. */
export async function setWindowRunning(
  id: string,
  running: boolean,
): Promise<{ windows: MaintenanceWindow[]; mode: MaintenanceMode }> {
  await delay(MOCK_API_DELAY_MS.default)

  const target = windows.find((one) => one.id === id)
  windows = windows.map((one) =>
    one.id === id ? { ...one, state: running ? 'active' : 'completed' } : one,
  )

  if (target) {
    const surfaces = running ? target.surfaces : []
    mode = {
      ...mode,
      surfaces,
      enabled: running,
      since: running ? new Date().toISOString() : null,
      estimatedEndAt: running ? target.endAt : null,
      allowAdmins: running ? target.allowAdmins : mode.allowAdmins,
      changedBy: running ? 'You' : null,
    }
  }

  return structuredClone({ windows, mode })
}

export type AnnouncementDraft = Omit<Announcement, 'id' | 'author' | 'reach'>

export async function saveAnnouncement(
  id: string | null,
  draft: AnnouncementDraft,
): Promise<Announcement[]> {
  await delay(MOCK_API_DELAY_MS.default)

  announcements = id
    ? announcements.map((one) => (one.id === id ? { ...one, ...draft } : one))
    : [{ ...draft, id: `ann-${Date.now()}`, author: 'You', reach: 0 }, ...announcements]

  return structuredClone(announcements)
}

/** Publish now, or pull a published notice back down. */
export async function setAnnouncementState(
  id: string,
  state: AnnouncementState,
): Promise<Announcement[]> {
  await delay(MOCK_API_DELAY_MS.default)

  announcements = announcements.map((one) =>
    one.id === id
      ? {
          ...one,
          state,
          publishAt: state === 'published' ? new Date().toISOString() : one.publishAt,
          // The fixture stands in for the delivery count the sender will report.
          reach: state === 'published' && one.reach === 0 ? 1284 : one.reach,
        }
      : one,
  )
  return structuredClone(announcements)
}

export async function setAnnouncementPinned(
  id: string,
  pinned: boolean,
): Promise<Announcement[]> {
  await delay(MOCK_API_DELAY_MS.default)

  announcements = announcements.map((one) => (one.id === id ? { ...one, pinned } : one))
  return structuredClone(announcements)
}
