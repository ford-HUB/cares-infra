import type { CommunitySegment, EventState } from '../types/overview'

/**
 * Overview charts. Each visual channel gets its own record — label, colour, order —
 * so a segment's bar fill and its legend swatch cannot drift apart. The attendance and
 * report breakdowns reuse the statistics maps (`department-statistics.ts`) rather than
 * inventing a second green for "completed".
 */

export const COMMUNITY_SEGMENT_ORDER: CommunitySegment[] = [
  'volunteers',
  'beneficiaries',
  'donors',
  'staff',
]

export const COMMUNITY_SEGMENT_LABELS: Record<CommunitySegment, string> = {
  volunteers: 'Volunteers',
  beneficiaries: 'Beneficiaries',
  donors: 'Donors',
  staff: 'Staff',
}

/** Identity, not status — four hues that stay apart without claiming good or bad. */
export const COMMUNITY_SEGMENT_COLOR: Record<CommunitySegment, string> = {
  volunteers: '#2a78d6',
  beneficiaries: '#7c5cbf',
  donors: '#1baf7a',
  staff: '#94a3b8',
}

export const EVENT_STATE_ORDER: EventState[] = [
  'upcoming',
  'ongoing',
  'completed',
  'cancelled',
]

export const EVENT_STATE_LABELS: Record<EventState, string> = {
  upcoming: 'Upcoming',
  ongoing: 'Ongoing',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

/** Ongoing is the live emerald; completed is inert; cancelled is the only red. */
export const EVENT_STATE_COLOR: Record<EventState, string> = {
  upcoming: '#2a78d6',
  ongoing: '#059669',
  completed: '#64748b',
  cancelled: '#e11d48',
}

/** Ring colour for the rate gauges, by what the rate is about. */
export const OVERVIEW_GAUGE_COLOR = {
  verification: '#2a78d6',
  completion: '#059669',
  growth: '#7c5cbf',
  approval: '#059669',
} as const

/** The track a gauge's arc runs on, and the ring a zero-total donut falls back to. */
export const OVERVIEW_EMPTY_FILL = '#e5e7eb'

export const OVERVIEW_DONUT_HEIGHT = 'h-52'
export const OVERVIEW_GAUGE_HEIGHT = 'h-40'
export const OVERVIEW_BAR_HEIGHT = 'h-56'
/** One flat stacked row — tall enough to read, short enough to leave the legend room. */
export const OVERVIEW_SEGMENT_HEIGHT = 'h-16'
