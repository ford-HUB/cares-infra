import dayjs from 'dayjs'
import type {
  Announcement,
  AnnouncementAudience,
  AnnouncementChannel,
  AnnouncementState,
  AnnouncementTone,
  MaintenanceSurface,
  SurfaceState,
  WindowState,
} from '../types/maintenance'

/** Shared by Maintenance and System Notices; the server stamps the real `author`. */
export function blankAnnouncement(): Announcement {
  return {
    id: '',
    title: '',
    body: '',
    tone: 'info',
    audiences: ['volunteers'],
    channels: ['portal'],
    state: 'draft',
    publishAt: dayjs().add(1, 'hour').toISOString(),
    expiresAt: null,
    pinned: false,
    windowId: null,
    author: 'You',
    reach: 0,
  }
}

/** Windows can start on their own, so poll while open. */
export const MAINTENANCE_POLL_INTERVAL_MS = 20_000

export const SURFACE_STATE_FILTER_ALL = 'all'

export type SurfaceStateFilter = SurfaceState | typeof SURFACE_STATE_FILTER_ALL

export const SURFACE_STATE_ORDER: SurfaceState[] = ['live', 'booked', 'down']

export const SURFACE_STATE_LABELS: Record<SurfaceState, string> = {
  live: 'Live',
  booked: 'Window booked',
  down: 'In maintenance',
}

export const SURFACE_STATE_HINTS: Record<SurfaceState, string> = {
  live: 'Open and serving users right now.',
  booked: 'Still open, but a window is booked that will close it.',
  down: 'Closed — users see the maintenance notice instead.',
}

export const SURFACE_STATE_STYLES: Record<SurfaceState, string> = {
  live: 'bg-emerald-50 text-emerald-700',
  booked: 'bg-amber-50 text-amber-700',
  down: 'bg-red-50 text-red-700',
}

export const SURFACE_STATE_DOT_STYLES: Record<SurfaceState, string> = {
  live: 'bg-emerald-500',
  booked: 'bg-amber-500',
  down: 'bg-red-500',
}

export const SURFACE_STATE_BAR_STYLES: Record<SurfaceState, string> = {
  live: 'bg-emerald-500',
  booked: 'bg-amber-400',
  down: 'bg-red-500',
}

export const MAINTENANCE_SURFACES: MaintenanceSurface[] = [
  'portal',
  'mobile',
  'public',
  'api',
]

export const SURFACE_LABELS: Record<MaintenanceSurface, string> = {
  portal: 'Staff portal',
  mobile: 'Volunteer app',
  public: 'Public site',
  api: 'CARES API',
}

export const SURFACE_HINTS: Record<MaintenanceSurface, string> = {
  portal: 'Admins, coordinators, and staff sign-ins.',
  mobile: 'Volunteer check-ins, attendance sync, and event feeds.',
  public: 'Landing pages, event browsing, and donation intake.',
  api: 'Everything the app and the ML services call. Closing this closes the app too.',
}

export const WINDOW_STATE_LABELS: Record<WindowState, string> = {
  scheduled: 'Scheduled',
  active: 'Running',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const WINDOW_STATE_STYLES: Record<WindowState, string> = {
  scheduled: 'bg-amber-50 text-amber-700',
  active: 'bg-red-50 text-red-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-gray-100 text-gray-400',
}

export const WINDOW_STATE_DOT_STYLES: Record<WindowState, string> = {
  scheduled: 'bg-amber-500',
  active: 'bg-red-500',
  completed: 'bg-gray-400',
  cancelled: 'bg-gray-300',
}

export const ANNOUNCEMENT_STATE_FILTER_ALL = 'all'

export type AnnouncementStateFilter =
  | AnnouncementState
  | typeof ANNOUNCEMENT_STATE_FILTER_ALL

export const ANNOUNCEMENT_STATE_ORDER: AnnouncementState[] = [
  'published',
  'scheduled',
  'draft',
  'expired',
]

export const ANNOUNCEMENT_STATE_LABELS: Record<AnnouncementState, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  published: 'Published',
  expired: 'Expired',
}

export const ANNOUNCEMENT_STATE_STYLES: Record<AnnouncementState, string> = {
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-amber-50 text-amber-700',
  published: 'bg-emerald-50 text-emerald-700',
  expired: 'bg-gray-100 text-gray-400',
}

export const ANNOUNCEMENT_STATE_DOT_STYLES: Record<AnnouncementState, string> = {
  draft: 'bg-gray-400',
  scheduled: 'bg-amber-500',
  published: 'bg-emerald-500',
  expired: 'bg-gray-300',
}

export const ANNOUNCEMENT_TONE_LABELS: Record<AnnouncementTone, string> = {
  info: 'Notice',
  warning: 'Advisory',
  critical: 'Urgent',
}

export const ANNOUNCEMENT_TONE_STYLES: Record<AnnouncementTone, string> = {
  info: 'bg-gray-100 text-gray-600',
  warning: 'bg-amber-50 text-amber-700',
  critical: 'bg-red-50 text-red-700',
}

export const ANNOUNCEMENT_TONE_RAIL_STYLES: Record<AnnouncementTone, string> = {
  info: 'bg-gray-300',
  warning: 'bg-amber-400',
  critical: 'bg-red-500',
}

export const ANNOUNCEMENT_AUDIENCES: AnnouncementAudience[] = [
  'volunteers',
  'beneficiaries',
  'donors',
  'coordinators',
]

export const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  volunteers: 'Volunteers',
  beneficiaries: 'Beneficiaries',
  donors: 'Donors',
  coordinators: 'Coordinators',
}

export const ANNOUNCEMENT_CHANNELS: AnnouncementChannel[] = ['portal', 'mobile', 'email']

export const CHANNEL_LABELS: Record<AnnouncementChannel, string> = {
  portal: 'Portal banner',
  mobile: 'Mobile push',
  email: 'Email',
}

/** Minutes; 0 means no notice. */
export const NOTICE_LEAD_PRESETS = [0, 15, 30, 60, 180, 1440] as const

export function formatNoticeLead(minutes: number): string {
  if (minutes === 0) return 'No heads-up'
  if (minutes >= 1440) return `${minutes / 1440} day before`
  if (minutes >= 60) return `${minutes / 60} hours before`
  return `${minutes} minutes before`
}

/** `Mar 4, 1:00 AM – 3:30 AM`; collapses the date within one day. */
export function formatWindowRange(startAt: string, endAt: string): string {
  const start = dayjs(startAt)
  const end = dayjs(endAt)
  const tail = start.isSame(end, 'day')
    ? end.format('h:mm A')
    : end.format('MMM D, h:mm A')
  return `${start.format('MMM D, h:mm A')} – ${tail}`
}

export function formatWindowLength(startAt: string, endAt: string): string {
  const minutes = Math.max(0, dayjs(endAt).diff(dayjs(startAt), 'minute'))
  if (minutes < 60) return `${minutes} min`
  const hours = minutes / 60
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`
}

/** `2h 14m` from now to `at`. */
export function formatCountdown(at: string | null, now: number): string {
  if (!at) return '—'

  const seconds = Math.max(0, Math.round((new Date(at).getTime() - now) / 1000))
  if (seconds < 60) return `${seconds}s`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ${minutes % 60}m`

  return `${Math.floor(hours / 24)}d ${hours % 24}h`
}

export function describeSurfaces(surfaces: MaintenanceSurface[]): string {
  if (surfaces.length === 0) return 'No surface'
  if (surfaces.length === MAINTENANCE_SURFACES.length) return 'Whole system'
  return surfaces.map((one) => SURFACE_LABELS[one]).join(', ')
}

/** Switch wins over the calendar; a booked surface is live but spoken for. */
export function resolveSurfaceStates(
  mode: { surfaces: MaintenanceSurface[] } | null,
  windows: { surfaces: MaintenanceSurface[]; state: WindowState }[],
): Record<MaintenanceSurface, SurfaceState> {
  const down = new Set(mode?.surfaces ?? [])
  const booked = new Set(
    windows
      .filter((one) => one.state === 'scheduled' || one.state === 'active')
      .flatMap((one) => one.surfaces),
  )

  return MAINTENANCE_SURFACES.reduce(
    (states, surface) => ({
      ...states,
      [surface]: down.has(surface) ? 'down' : booked.has(surface) ? 'booked' : 'live',
    }),
    {} as Record<MaintenanceSurface, SurfaceState>,
  )
}

/** Placeholder counts until the recipient service reports real ones. */
export const AUDIENCE_SIZES: Record<AnnouncementAudience, number> = {
  volunteers: 1180,
  beneficiaries: 640,
  donors: 210,
  coordinators: 46,
}

export function audienceReachTotal(audiences: AnnouncementAudience[]): number {
  return audiences.reduce((total, one) => total + AUDIENCE_SIZES[one], 0)
}

export const ANNOUNCEMENT_STATE_BAR_STYLES: Record<AnnouncementState, string> = {
  draft: 'bg-gray-300',
  scheduled: 'bg-amber-400',
  published: 'bg-emerald-500',
  expired: 'bg-gray-200',
}

export const ANNOUNCEMENT_STATE_HINTS: Record<AnnouncementState, string> = {
  draft: 'Written but never sent. Nobody has read it.',
  scheduled: 'Queued to go out on its own at the time it names.',
  published: 'Out now — this is what users are reading.',
  expired: 'Ran its course or was taken down. Kept as record.',
}

export function formatNoticeDay(timestamp: string): string {
  const day = dayjs(timestamp).startOf('day')
  const today = dayjs().startOf('day')
  const offset = day.diff(today, 'day')

  if (offset === 0) return 'Today'
  if (offset === -1) return 'Yesterday'
  if (offset === 1) return 'Tomorrow'
  return day.format(day.isSame(today, 'year') ? 'dddd, MMM D' : 'MMM D, YYYY')
}

/** Live for an audience only if addressed to it, on the portal, and currently live. */
export function isAnnouncementLiveFor(
  announcement: Announcement,
  audience: AnnouncementAudience,
): boolean {
  return (
    announcement.state === 'published' &&
    announcement.audiences.includes(audience) &&
    announcement.channels.includes('portal')
  )
}
