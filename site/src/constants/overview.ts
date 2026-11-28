import type { CommunitySegment, EventState } from '../types/overview'

/** The attendance and report breakdowns reuse the `department-statistics.ts` maps. */

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

export const EVENT_STATE_COLOR: Record<EventState, string> = {
  upcoming: '#2a78d6',
  ongoing: '#059669',
  completed: '#64748b',
  cancelled: '#e11d48',
}

export const OVERVIEW_GAUGE_COLOR = {
  verification: '#2a78d6',
  completion: '#059669',
  growth: '#7c5cbf',
  approval: '#059669',
} as const

export const OVERVIEW_EMPTY_FILL = '#e5e7eb'

export const OVERVIEW_DONUT_HEIGHT = 'h-52'
export const OVERVIEW_GAUGE_HEIGHT = 'h-40'
export const OVERVIEW_BAR_HEIGHT = 'h-56'
export const OVERVIEW_SEGMENT_HEIGHT = 'h-16'
