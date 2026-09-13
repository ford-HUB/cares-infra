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

/**
 * A blank notice, so the dialog has the same shape for a new one as for an existing
 * one. Both Maintenance and System Notices compose from here, so the starting point of
 * a notice cannot drift between the two screens. `author` is a placeholder: the server
 * stamps the real name of whoever is signed in.
 */
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

/** How often the page re-reads state while it is open — a window can start on its own. */
export const MAINTENANCE_POLL_INTERVAL_MS = 20_000

export const SURFACE_STATE_FILTER_ALL = 'all'

export type SurfaceStateFilter = SurfaceState | typeof SURFACE_STATE_FILTER_ALL

/** Draw order, best news first — also the segment order in the availability bar. */
export const SURFACE_STATE_ORDER: SurfaceState[] = ['live', 'booked', 'down']

export const SURFACE_STATE_LABELS: Record<SurfaceState, string> = {
  live: 'Live',
  booked: 'Window booked',
  down: 'In maintenance',
}

/** What each state means for the reader — the segment tooltips. */
export const SURFACE_STATE_HINTS: Record<SurfaceState, string> = {
  live: 'Open and serving users right now.',
  booked: 'Still open, but a window is booked that will close it.',
  down: 'Closed — users see the maintenance notice instead.',
}

/** Light-only palette, in step with the rest of the portal's badges. */
export const SURFACE_STATE_STYLES: Record<SurfaceState, string> = {
  live: 'bg-emerald-50 text-emerald-700',
  booked: 'bg-amber-50 text-amber-700',
  down: 'bg-red-50 text-red-700',
}

/** Dot inside the badge; only a surface that is down animates. */
export const SURFACE_STATE_DOT_STYLES: Record<SurfaceState, string> = {
  live: 'bg-emerald-500',
  booked: 'bg-amber-500',
  down: 'bg-red-500',
}

/** Segment fill in the availability bar. */
export const SURFACE_STATE_BAR_STYLES: Record<SurfaceState, string> = {
  live: 'bg-emerald-500',
  booked: 'bg-amber-400',
  down: 'bg-red-500',
}

/** The full roster — the denominator every count on this page is read against. */
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

/** Who is locked out when the surface closes — the line under each toggle. */
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

/** Tone is the only colour an announcement carries; it maps to severity, not taste. */
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

/** Left rail on the announcement row, so tone reads before the title does. */
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

/** Heads-up options before a window opens; 0 is "no notice". */
export const NOTICE_LEAD_PRESETS = [0, 15, 30, 60, 180, 1440] as const

export function formatNoticeLead(minutes: number): string {
  if (minutes === 0) return 'No heads-up'
  if (minutes >= 1440) return `${minutes / 1440} day before`
  if (minutes >= 60) return `${minutes / 60} hours before`
  return `${minutes} minutes before`
}

/** `Mar 4, 1:00 AM – 3:30 AM` — collapses the date when a window stays inside one day. */
export function formatWindowRange(startAt: string, endAt: string): string {
  const start = dayjs(startAt)
  const end = dayjs(endAt)
  const tail = start.isSame(end, 'day')
    ? end.format('h:mm A')
    : end.format('MMM D, h:mm A')
  return `${start.format('MMM D, h:mm A')} – ${tail}`
}

/** How long a window holds the system, in the unit staff booked it in. */
export function formatWindowLength(startAt: string, endAt: string): string {
  const minutes = Math.max(0, dayjs(endAt).diff(dayjs(startAt), 'minute'))
  if (minutes < 60) return `${minutes} min`
  const hours = minutes / 60
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`
}

/** `2h 14m` from now to `at` — the countdown the banner and the rows share. */
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

/** `Portal, app` — a surface list short enough to sit on a row. */
export function describeSurfaces(surfaces: MaintenanceSurface[]): string {
  if (surfaces.length === 0) return 'No surface'
  if (surfaces.length === MAINTENANCE_SURFACES.length) return 'Whole system'
  return surfaces.map((one) => SURFACE_LABELS[one]).join(', ')
}

/**
 * Where each surface stands, read from the switch first and the calendar second: a
 * surface the switch holds down is down whatever the calendar says, and a surface
 * named by a booked window is live but spoken for.
 */
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

/**
 * Directory sizes per audience, standing in for the counts the recipient service will
 * report. They exist so a reach figure is never shown without its denominator.
 */
export const AUDIENCE_SIZES: Record<AnnouncementAudience, number> = {
  volunteers: 1180,
  beneficiaries: 640,
  donors: 210,
  coordinators: 46,
}

/** How many accounts a notice addressed to these audiences could reach. */
export function audienceReachTotal(audiences: AnnouncementAudience[]): number {
  return audiences.reduce((total, one) => total + AUDIENCE_SIZES[one], 0)
}

/** Segment fill in the notice-board availability bar — the fourth visual channel. */
export const ANNOUNCEMENT_STATE_BAR_STYLES: Record<AnnouncementState, string> = {
  draft: 'bg-gray-300',
  scheduled: 'bg-amber-400',
  published: 'bg-emerald-500',
  expired: 'bg-gray-200',
}

/** What each state means for the reader — the legend tooltips on the notice board. */
export const ANNOUNCEMENT_STATE_HINTS: Record<AnnouncementState, string> = {
  draft: 'Written but never sent. Nobody has read it.',
  scheduled: 'Queued to go out on its own at the time it names.',
  published: 'Out now — this is what users are reading.',
  expired: 'Ran its course or was taken down. Kept as record.',
}

/**
 * The day heading a notice sits under in the feed. Named days carry the reader for the
 * span they actually think in; anything older or further out is dated outright.
 */
export function formatNoticeDay(timestamp: string): string {
  const day = dayjs(timestamp).startOf('day')
  const today = dayjs().startOf('day')
  const offset = day.diff(today, 'day')

  if (offset === 0) return 'Today'
  if (offset === -1) return 'Yesterday'
  if (offset === 1) return 'Tomorrow'
  return day.format(day.isSame(today, 'year') ? 'dddd, MMM D' : 'MMM D, YYYY')
}
