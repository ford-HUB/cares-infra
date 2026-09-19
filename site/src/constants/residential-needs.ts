import type { NeedCategory, NeedPriority, NeedsFeatureKey } from '../types/residential-needs'

export const NEED_CATEGORY_ORDER: NeedCategory[] = [
  'food',
  'water',
  'shelter',
  'health',
  'education',
  'livelihood',
]

export const NEED_CATEGORY_LABELS: Record<NeedCategory, string> = {
  food: 'Food security',
  water: 'Clean water',
  shelter: 'Shelter',
  health: 'Health access',
  education: 'Education',
  livelihood: 'Livelihood',
}

/** Highest score a single need category can take on the survey. */
export const NEED_SCORE_MAX = 5

export const NEED_PRIORITY_ORDER: NeedPriority[] = ['critical', 'high', 'moderate', 'low']

export const NEED_PRIORITY_LABELS: Record<NeedPriority, string> = {
  critical: 'Critical',
  high: 'High',
  moderate: 'Moderate',
  low: 'Low',
}

/**
 * Total need score (sum of the six categories, 0–30) at or above which a household
 * falls into each band. Checked top-down, so `low` is whatever is left.
 */
export const NEED_PRIORITY_THRESHOLDS: Record<NeedPriority, number> = {
  critical: 20,
  high: 14,
  moderate: 8,
  low: 0,
}

/** Colour spent on priority only — one record per visual channel so they cannot drift. */
export const NEED_PRIORITY_BADGE_STYLES: Record<NeedPriority, string> = {
  critical: 'bg-red-50 text-red-700',
  high: 'bg-amber-50 text-amber-700',
  moderate: 'bg-emerald-50 text-emerald-700',
  low: 'bg-gray-100 text-gray-600',
}

export const NEED_PRIORITY_BAR_STYLES: Record<NeedPriority, string> = {
  critical: 'bg-red-500',
  high: 'bg-amber-500',
  moderate: 'bg-emerald-500',
  low: 'bg-gray-300',
}

export const NEED_PRIORITY_DOT_STYLES: Record<NeedPriority, string> = {
  critical: 'bg-red-500',
  high: 'bg-amber-500',
  moderate: 'bg-emerald-500',
  low: 'bg-gray-300',
}

/** Where the rows come from — named on screen so nobody mistakes the mock for live data. */
export const NEEDS_SURVEY_SOURCE_LABEL = 'Beneficiary Needs Assessment survey'

/** The "every barangay" / "every priority" choice in the household table filters. */
export const NEEDS_FILTER_ALL = 'all'

/**
 * Cluster identity colours — categorical, so no hue outranks another; a cluster's
 * index picks its swatch everywhere (scatter dot, card chip, table pill).
 */
export const CLUSTER_COLORS = [
  '#2a78d6',
  '#1baf7a',
  '#e0812c',
  '#8e5bd6',
  '#d6456f',
  '#0f9fb5',
] as const

export const CLUSTER_SWATCH_STYLES = [
  'bg-[#2a78d6]',
  'bg-[#1baf7a]',
  'bg-[#e0812c]',
  'bg-[#8e5bd6]',
  'bg-[#d6456f]',
  'bg-[#0f9fb5]',
] as const

export const CLUSTER_K_MIN = 2
export const CLUSTER_K_MAX = 6
export const CLUSTER_K_DEFAULT = 3
/** Lloyd iterations before the run is cut off unconverged. */
export const CLUSTER_MAX_ITERATIONS = 50
export const CLUSTER_DEFAULT_SEED = 7

export const NEEDS_FEATURE_ORDER: NeedsFeatureKey[] = ['members', ...NEED_CATEGORY_ORDER]

export const NEEDS_FEATURE_LABELS: Record<NeedsFeatureKey, string> = {
  members: 'Household size',
  ...NEED_CATEGORY_LABELS,
}

/** The two need scores the cluster scatter defaults to — what a director reads first. */
export const CLUSTER_SCATTER_X: NeedCategory = 'food'
export const CLUSTER_SCATTER_Y: NeedCategory = 'health'

export const NEEDS_CHART_HEIGHT = 'h-64'
export const NEEDS_SMALL_CHART_HEIGHT = 'h-52'
export const NEEDS_GRID_STROKE = '#f3f4f6'
export const NEEDS_SERIES_COLOR = '#2d6a4f'
