import { MOCK_API_DELAY_MS, delay } from '../constants/durations'
import type {
  Announcement,
  AnnouncementAudience,
  AnnouncementChannel,
  AnnouncementState,
  AnnouncementTone,
  MaintenanceMode,
  MaintenanceSurface,
  MaintenanceWindow,
} from '../types/maintenance'
import { apiClient, parseApiError } from './api-client'
import { buildMockMaintenanceMode, buildMockMaintenanceWindows } from './mock-data'

/**
 * Announcements are served by `/api/v1/announcements`. The maintenance switch and the
 * window calendar have no endpoints yet, so those two still come from fixtures and keep
 * every change in memory — swap each for an `apiClient` call when its endpoint lands.
 */
let mode: MaintenanceMode = buildMockMaintenanceMode()
let windows: MaintenanceWindow[] = buildMockMaintenanceWindows()

type ApiEnvelope<T> = { ok: true; message?: string; data: T }

const ANNOUNCEMENTS_PATH = '/api/v1/announcements'

/** Server enums are SCREAMING_SNAKE; the portal's own vocabulary is lowercase. */
type ApiAnnouncementTone = 'INFO' | 'WARNING' | 'CRITICAL'
type ApiAnnouncementAudience = 'VOLUNTEERS' | 'BENEFICIARIES' | 'DONORS' | 'STAFF'
type ApiAnnouncementChannel = 'PORTAL' | 'MOBILE' | 'EMAIL'
type ApiAnnouncementState = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'EXPIRED'

interface AnnouncementApiResponse {
  announcement_id: string
  title: string
  body: string
  tone: ApiAnnouncementTone
  audiences: ApiAnnouncementAudience[]
  channels: ApiAnnouncementChannel[]
  state: ApiAnnouncementState
  publish_at: string
  expires_at: string | null
  pinned: boolean
  window_id: string | null
  author_id: string | null
  author_name: string
  reach: number
  created_at: string
  updated_at: string
}

interface AnnouncementListApiResponse {
  items: AnnouncementApiResponse[]
  total: number
}

const toApiCase = <T extends string>(value: string) => value.toUpperCase() as T
const fromApiCase = <T extends string>(value: string) => value.toLowerCase() as T

function mapApiAnnouncement(data: AnnouncementApiResponse): Announcement {
  return {
    id: data.announcement_id,
    title: data.title,
    body: data.body,
    tone: fromApiCase<AnnouncementTone>(data.tone),
    audiences: data.audiences.map((one) => fromApiCase<AnnouncementAudience>(one)),
    channels: data.channels.map((one) => fromApiCase<AnnouncementChannel>(one)),
    state: fromApiCase<AnnouncementState>(data.state),
    publishAt: data.publish_at,
    expiresAt: data.expires_at,
    pinned: data.pinned,
    windowId: data.window_id,
    author: data.author_name,
    reach: data.reach,
  }
}

export interface MaintenanceSnapshot {
  mode: MaintenanceMode
  windows: MaintenanceWindow[]
  announcements: Announcement[]
}

/** Everything the page draws, read in one shot — the three parts are one state. */
export async function fetchMaintenance(): Promise<MaintenanceSnapshot> {
  const announcements = await fetchAnnouncements()
  return { ...structuredClone({ mode, windows }), announcements }
}

/**
 * The whole board, newest first. The server sweeps scheduled and expired notices
 * forward on every read, which is what the page's silent poll relies on.
 */
export async function fetchAnnouncements(): Promise<Announcement[]> {
  try {
    const { data: body } = await apiClient.get<ApiEnvelope<AnnouncementListApiResponse>>(
      ANNOUNCEMENTS_PATH,
    )
    return body.data.items.map(mapApiAnnouncement)
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error })
  }
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

/** The editor only saves a draft or a schedule; publishing goes through `setAnnouncementState`. */
function toApiDraft(draft: AnnouncementDraft) {
  return {
    title: draft.title,
    body: draft.body,
    tone: toApiCase<ApiAnnouncementTone>(draft.tone),
    audiences: draft.audiences.map((one) => toApiCase<ApiAnnouncementAudience>(one)),
    channels: draft.channels.map((one) => toApiCase<ApiAnnouncementChannel>(one)),
    state: toApiCase<ApiAnnouncementState>(draft.state),
    publish_at: draft.publishAt,
    expires_at: draft.expiresAt,
    pinned: draft.pinned,
    window_id: draft.windowId,
  }
}

export async function saveAnnouncement(
  id: string | null,
  draft: AnnouncementDraft,
): Promise<Announcement> {
  try {
    const { data: body } = id
      ? await apiClient.patch<ApiEnvelope<AnnouncementApiResponse>>(
          `${ANNOUNCEMENTS_PATH}/${id}`,
          toApiDraft(draft),
        )
      : await apiClient.post<ApiEnvelope<AnnouncementApiResponse>>(
          ANNOUNCEMENTS_PATH,
          toApiDraft(draft),
        )
    return mapApiAnnouncement(body.data)
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error })
  }
}

/** Publish now, or pull a published notice back down. The server stamps the time and reach. */
export async function setAnnouncementState(
  id: string,
  state: Extract<AnnouncementState, 'published' | 'expired'>,
): Promise<Announcement> {
  try {
    const { data: body } = await apiClient.patch<ApiEnvelope<AnnouncementApiResponse>>(
      `${ANNOUNCEMENTS_PATH}/${id}/state`,
      { state: toApiCase<ApiAnnouncementState>(state) },
    )
    return mapApiAnnouncement(body.data)
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error })
  }
}

export async function setAnnouncementPinned(
  id: string,
  pinned: boolean,
): Promise<Announcement> {
  try {
    const { data: body } = await apiClient.patch<ApiEnvelope<AnnouncementApiResponse>>(
      `${ANNOUNCEMENTS_PATH}/${id}/pinned`,
      { pinned },
    )
    return mapApiAnnouncement(body.data)
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error })
  }
}
