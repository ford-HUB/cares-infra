import dayjs from 'dayjs'
import type {
  ServiceHealth,
  SystemEventSeverity,
  SystemUsageRangeDays,
} from '../types/system-usage'
import { DIAGNOSTICS_POLL_INTERVAL_MS } from './system-diagnostics'
import { PERFORMANCE_TICK_MS } from './system-performance'

export const SYSTEM_USAGE_RANGES: { days: SystemUsageRangeDays; label: string }[] = [
  { days: 7, label: '7 days' },
  { days: 14, label: '14 days' },
  { days: 30, label: '30 days' },
]

export const DEFAULT_SYSTEM_USAGE_RANGE: SystemUsageRangeDays = 14

/** The live CPU/memory reading — the same 3 s tick the System Performance page uses. */
export const LIVE_TICK_MS = PERFORMANCE_TICK_MS

/** The 24 h snapshot, the service roster and the diagnostics sweep are re-read this often. */
export const LIVE_REFRESH_MS = DIAGNOSTICS_POLL_INTERVAL_MS

/**
 * Chart series, stepped per theme. Green beside orange is the classic red-green
 * colour-blind trap, so the green was picked by the palette validator, not by eye:
 * these steps clear every check against the peak orange on the white and charcoal
 * cards (worst CVD ΔE 9.9 light / 8.8 dark, target ≥ 8). Re-run it before changing.
 */
export const USAGE_SERIES_THEME = {
  average: { light: '#1ea672', dark: '#24a874' },
  peak: { light: '#eb6834', dark: '#d95926' },
} as const

/** Earlier days are placeholder data; they are drawn at this opacity so they read as such. */
export const SAMPLE_DAY_OPACITY = 0.35

export const SERVICE_HEALTH_ORDER: ServiceHealth[] = ['operational', 'degraded', 'down', 'paused']

export const SERVICE_HEALTH_LABELS: Record<ServiceHealth, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  down: 'Down',
  paused: 'Paused',
}

/** One record per visual channel, so the badge, dot and bar for a state can't drift. */
export const SERVICE_HEALTH_BADGE_STYLES: Record<ServiceHealth, string> = {
  operational: 'bg-emerald-50 text-emerald-700',
  degraded: 'bg-amber-50 text-amber-700',
  down: 'bg-red-50 text-red-700',
  paused: 'bg-gray-100 text-gray-600',
}

export const SERVICE_HEALTH_DOT_STYLES: Record<ServiceHealth, string> = {
  operational: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  down: 'bg-red-500',
  paused: 'bg-gray-400',
}

export const SERVICE_HEALTH_BAR_STYLES: Record<ServiceHealth, string> = {
  operational: 'bg-emerald-500',
  degraded: 'bg-amber-400',
  down: 'bg-red-500',
  paused: 'bg-gray-300',
}

export const EVENT_SEVERITY_LABELS: Record<SystemEventSeverity, string> = {
  info: 'Info',
  warning: 'Warning',
  critical: 'Critical',
}

export const EVENT_SEVERITY_STYLES: Record<SystemEventSeverity, string> = {
  info: 'bg-sky-50 text-sky-700',
  warning: 'bg-amber-50 text-amber-700',
  critical: 'bg-red-50 text-red-700',
}

/** Rows in the recent-events list before "show all". */
export const SYSTEM_EVENTS_PREVIEW = 6

/** Most events derived for the list — the newest win. */
export const SYSTEM_EVENTS_MAX = 30

/** A scheduler succeeding on fewer of its recent runs than this is flagged. */
export const SUCCESS_WARN_PERCENT = 90

/** Service rows the skeleton draws before the first roster arrives. */
export const SYSTEM_USAGE_SKELETON_ROWS = 6

export const formatUsageDay = (date: string) => dayjs(date).format('MMM D')
export const formatUsageDayLong = (date: string) => dayjs(date).format('ddd, MMM D')
export const formatEventTime = (at: string) => dayjs(at).format('MMM D · h:mm A')
export const formatSampleClock = (at: string) => dayjs(at).format('h:mm A')

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
export const formatCompact = (value: number) => compact.format(value)

export const formatPercent = (value: number, digits = 0) => `${value.toFixed(digits)}%`

export const formatMs = (ms: number) =>
  ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`
