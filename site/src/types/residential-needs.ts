/**
 * Residential needs — what a household in a partner barangay lacks, as answered on
 * the Beneficiary Needs Assessment survey (the form a beneficiary fills in on the
 * mobile app). Every screen in the module is built on a list of these rows. The
 * module is a design pass: the rows are mock and nothing here calls the server.
 */

/** The six need dimensions the survey scores, each 0 (met) to 5 (critical). */
export type NeedCategory =
  | 'food'
  | 'water'
  | 'shelter'
  | 'health'
  | 'education'
  | 'livelihood'

export type NeedScores = Record<NeedCategory, number>

/** Priority band a household falls in, derived from its total need score. */
export type NeedPriority = 'critical' | 'high' | 'moderate' | 'low'

export interface Household {
  id: string
  /** Family name of the household head — the row's label everywhere. */
  familyName: string
  barangay: string
  members: number
  needs: NeedScores
  /** When the beneficiary submitted the needs assessment. */
  surveyedAt: string
}

/** The feature vector k-means clusters on: household size plus the six need scores. */
export type NeedsFeatureKey = 'members' | NeedCategory

export interface NeedsCluster {
  /** 0-based cluster index — the colour and label are keyed on it. */
  index: number
  householdIds: string[]
  /** Mean of every feature over the cluster's members, in original units. */
  centroid: Record<NeedsFeatureKey, number>
  /** Need category with the highest centroid score — the cluster's headline. */
  dominantNeed: NeedCategory
  /** Priority band of the centroid's total need score. */
  priority: NeedPriority
  /** The barangay most of the members live in — where a programme for this group should concentrate. */
  barangay: ClusterBarangay
}

export interface ClusterBarangay {
  name: string
  /** Households from this barangay in the cluster. */
  count: number
  /** `count` over the cluster's size — how concentrated the group is there. */
  share: number
}

export interface NeedsClusteringResult {
  k: number
  clusters: NeedsCluster[]
  /** Which cluster each household landed in, by household id. */
  assignments: Record<string, number>
  /** Sum of squared distances to centroids in normalised feature space — lower is tighter. */
  inertia: number
  /** Lloyd iterations run before assignments stopped changing. */
  iterations: number
  converged: boolean
  seed: number
}
