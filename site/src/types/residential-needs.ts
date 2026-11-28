/** Q1, multi-select. */
export type NeedCategory =
  | 'food'
  | 'healthcare'
  | 'education'
  | 'livelihood'
  | 'financial'
  | 'other'

/** Q2: 1 (not serious) to 5 (very serious). */
export type NeedSeriousness = 1 | 2 | 3 | 4 | 5

/** Q3, multi-select. */
export type NeedBarrier =
  | 'money'
  | 'services'
  | 'distance'
  | 'information'
  | 'documents'
  | 'opportunities'
  | 'other'
  | 'none'

/** Q4, single choice. */
export type CommunityProblem =
  | 'food'
  | 'healthcare'
  | 'education'
  | 'livelihood'
  | 'financial'
  | 'environmental'
  | 'other'

export interface HouseholdSurvey {
  needs: NeedCategory[]
  otherNeed?: string
  seriousness: NeedSeriousness
  barriers: NeedBarrier[]
  otherBarrier?: string
  communityProblem: CommunityProblem
  otherCommunityProblem?: string
  /** Q5. */
  concern?: string
}

/** Derived from Q2. */
export type NeedPriority = 'critical' | 'high' | 'moderate' | 'low'

export interface Household {
  id: string
  familyName: string
  barangay: string
  members: number
  survey: HouseholdSurvey
  surveyedAt: string
}

/** Household size, seriousness, and a 0/1 flag per named Q1 category. */
export type NeedsFeatureKey = 'members' | 'seriousness' | Exclude<NeedCategory, 'other'>

export interface NeedsCluster {
  /** 0-based, highest need first; colour and label key on it. */
  index: number
  householdIds: string[]
  /** Feature means in original units; need categories are 0–1 shares. */
  centroid: Record<NeedsFeatureKey, number>
  dominantNeed: Exclude<NeedCategory, 'other'>
  topBarrier: NeedBarrier
  priority: NeedPriority
  barangay: ClusterBarangay
  /** Seriousness plus mean named needs; `index` 0 is the deepest need. */
  needLevel: number
}

export interface ClusterBarangay {
  name: string
  count: number
  /** `count` over the cluster's size. */
  share: number
}

export interface NeedsClusteringResult {
  k: number
  clusters: NeedsCluster[]
  /** Household id to cluster index. */
  assignments: Record<string, number>
  /** In normalised feature space; lower is tighter. */
  inertia: number
  iterations: number
  converged: boolean
  seed: number
  /** e.g. `sklearn.cluster.KMeans`. */
  algorithm: string
  generatedAt: string
}
