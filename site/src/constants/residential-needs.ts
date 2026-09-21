import type {
  CommunityProblem,
  NeedBarrier,
  NeedCategory,
  NeedPriority,
  NeedSeriousness,
  NeedsFeatureKey,
} from '../types/residential-needs'

/** Q1 choices in survey order. */
export const NEED_CATEGORY_ORDER: NeedCategory[] = [
  'food',
  'healthcare',
  'education',
  'livelihood',
  'financial',
  'other',
]

export const NEED_CATEGORY_LABELS: Record<NeedCategory, string> = {
  food: 'Food',
  healthcare: 'Healthcare',
  education: 'Education',
  livelihood: 'Livelihood',
  financial: 'Financial Assistance',
  other: 'Other',
}

/** Q2 scale, lowest first. */
export const NEED_SERIOUSNESS_ORDER: NeedSeriousness[] = [1, 2, 3, 4, 5]

export const NEED_SERIOUSNESS_LABELS: Record<NeedSeriousness, string> = {
  1: 'Not serious',
  2: 'Slightly serious',
  3: 'Moderately serious',
  4: 'Serious',
  5: 'Very serious',
}

export const NEED_SERIOUSNESS_MAX: NeedSeriousness = 5

/** Q3 choices in survey order. */
export const NEED_BARRIER_ORDER: NeedBarrier[] = [
  'money',
  'services',
  'distance',
  'information',
  'documents',
  'opportunities',
  'other',
  'none',
]

export const NEED_BARRIER_LABELS: Record<NeedBarrier, string> = {
  money: 'Lack of money',
  services: 'Lack of available services',
  distance: 'Distance',
  information: 'Lack of information',
  documents: 'Lack of required documents',
  opportunities: 'Limited opportunities',
  other: 'Other',
  none: 'No difficulty',
}

/** Q4 choices in survey order. */
export const COMMUNITY_PROBLEM_ORDER: CommunityProblem[] = [
  'food',
  'healthcare',
  'education',
  'livelihood',
  'financial',
  'environmental',
  'other',
]

export const COMMUNITY_PROBLEM_LABELS: Record<CommunityProblem, string> = {
  food: 'Food',
  healthcare: 'Healthcare',
  education: 'Education',
  livelihood: 'Livelihood',
  financial: 'Financial Assistance',
  environmental: 'Environmental',
  other: 'Other',
}

export const NEED_PRIORITY_ORDER: NeedPriority[] = ['critical', 'high', 'moderate', 'low']

export const NEED_PRIORITY_LABELS: Record<NeedPriority, string> = {
  critical: 'Critical',
  high: 'High',
  moderate: 'Moderate',
  low: 'Low',
}

/**
 * Seriousness (Q2) at or above which a household falls into each band. Checked
 * top-down, so `low` is whatever is left — "not serious" and "slightly serious".
 */
export const NEED_PRIORITY_THRESHOLDS: Record<NeedPriority, NeedSeriousness> = {
  critical: 5,
  high: 4,
  moderate: 3,
  low: 1,
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

/** The named Q1 categories the model flags — "Other" is free text, so it is left out. */
export const CLUSTER_NEED_CATEGORIES: Exclude<NeedCategory, 'other'>[] = [
  'food',
  'healthcare',
  'education',
  'livelihood',
  'financial',
]

export const NEEDS_FEATURE_ORDER: NeedsFeatureKey[] = [
  'members',
  'seriousness',
  ...CLUSTER_NEED_CATEGORIES,
]

export const NEEDS_FEATURE_LABELS: Record<NeedsFeatureKey, string> = {
  members: 'Household size',
  seriousness: 'Seriousness',
  food: NEED_CATEGORY_LABELS.food,
  healthcare: NEED_CATEGORY_LABELS.healthcare,
  education: NEED_CATEGORY_LABELS.education,
  livelihood: NEED_CATEGORY_LABELS.livelihood,
  financial: NEED_CATEGORY_LABELS.financial,
}

/**
 * The two axes of the cluster scatter — how serious the need is against how many
 * needs the household ticked, the two things a director reads first.
 */
export const CLUSTER_SCATTER_X_LABEL = 'Seriousness'
export const CLUSTER_SCATTER_Y_LABEL = 'Needs selected'

export const NEEDS_CHART_HEIGHT = 'h-64'
export const NEEDS_SMALL_CHART_HEIGHT = 'h-52'
export const NEEDS_GRID_STROKE = '#f3f4f6'
export const NEEDS_SERIES_COLOR = '#2d6a4f'
