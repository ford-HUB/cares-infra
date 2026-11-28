import type { DeploymentStatus } from '../types/deployed-certificate'

export const DEPLOYMENT_STATUS_FILTER_ALL = 'all' as const
export type DeploymentStatusFilter =
  | typeof DEPLOYMENT_STATUS_FILTER_ALL
  | DeploymentStatus

export type DeploymentViewMode = 'grid' | 'table'

export const DEPLOYMENT_STATUS_ORDER: DeploymentStatus[] = [
  'distributing',
  'scheduled',
  'paused',
  'completed',
]

export const DEPLOYMENT_STATUS_LABELS: Record<DeploymentStatus, string> = {
  distributing: 'Distributing',
  scheduled: 'Scheduled',
  paused: 'Paused',
  completed: 'Completed',
}

export const DEPLOYMENT_STATUS_BADGE_STYLES: Record<DeploymentStatus, string> = {
  distributing: 'bg-emerald-50 text-emerald-700',
  scheduled: 'bg-sky-50 text-sky-700',
  paused: 'bg-amber-50 text-amber-700',
  completed: 'bg-gray-100 text-gray-600',
}

export const DEPLOYMENT_STATUS_DOT_STYLES: Record<DeploymentStatus, string> = {
  distributing: 'bg-emerald-500',
  scheduled: 'bg-sky-500',
  paused: 'bg-amber-500',
  completed: 'bg-gray-400',
}

export const DEPLOYMENT_STATUS_BAR_STYLES: Record<DeploymentStatus, string> = {
  distributing: 'bg-emerald-500',
  scheduled: 'bg-sky-400',
  paused: 'bg-amber-400',
  completed: 'bg-gray-300',
}

export const DEPLOYMENT_STATUS_HINTS: Record<DeploymentStatus, string> = {
  distributing: 'Sheets are being released to participants right now.',
  scheduled: 'Queued — release starts once the event is closed out.',
  paused: 'Held by a director; nothing is being released.',
  completed: 'Every covered participant has their certificate.',
}

export const DEPLOYMENT_STATUS_FILTERS: {
  value: DeploymentStatusFilter
  label: string
}[] = [
  { value: DEPLOYMENT_STATUS_FILTER_ALL, label: 'All statuses' },
  ...DEPLOYMENT_STATUS_ORDER.map((status) => ({
    value: status as DeploymentStatusFilter,
    label: DEPLOYMENT_STATUS_LABELS[status],
  })),
]

export const DEPLOYMENT_SORT_OPTIONS = [
  { value: 'recent', label: 'Most recent' },
  { value: 'distribution', label: 'Least distributed' },
  { value: 'participants', label: 'Largest event' },
] as const

export type DeploymentSort = (typeof DEPLOYMENT_SORT_OPTIONS)[number]['value']

export const DISTRIBUTION_BEHIND_THRESHOLD = 0.6

export const DEPLOYMENT_SKELETON_CARDS = 6
export const DEPLOYMENT_SKELETON_ROWS = 8
