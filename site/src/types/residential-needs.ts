/**
 * Residential needs — what a household in a partner barangay lacks, as answered on
 * the Beneficiary Needs Assessment survey (the five-question form a beneficiary
 * fills in on the mobile app). Every screen in the module is built on a list of
 * these rows. The module is a design pass: the rows are mock and nothing here calls
 * the server.
 */

/** Q1 — what the household currently needs help with (select all that apply). */
export type NeedCategory =
  | 'food'
  | 'healthcare'
  | 'education'
  | 'livelihood'
  | 'financial'
  | 'other'

/** Q2 — how serious the most important need is, 1 (not serious) to 5 (very serious). */
export type NeedSeriousness = 1 | 2 | 3 | 4 | 5

/** Q3 — what makes it difficult to meet the need (select all that apply). */
export type NeedBarrier =
  | 'money'
  | 'services'
  | 'distance'
  | 'information'
  | 'documents'
  | 'opportunities'
  | 'other'
  | 'none'

/** Q4 — the problem most commonly observed in the community (single choice). */
export type CommunityProblem =
  | 'food'
  | 'healthcare'
  | 'education'
  | 'livelihood'
  | 'financial'
  | 'environmental'
  | 'other'

/** One household's answers, question by question, as the mobile survey submits them. */
export interface HouseholdSurvey {
  needs: NeedCategory[]
  /** Free text behind the "Other" need, when it was selected. */
  otherNeed?: string
  seriousness: NeedSeriousness
  barriers: NeedBarrier[]
  otherBarrier?: string
  communityProblem: CommunityProblem
  otherCommunityProblem?: string
  /** Q5 — another need or concern for CARES to know about. */
  concern?: string
}

/** Priority band a household falls in, derived from how serious its need is (Q2). */
export type NeedPriority = 'critical' | 'high' | 'moderate' | 'low'

export interface Household {
  id: string
  /** Family name of the household head — the row's label everywhere. */
  familyName: string
  barangay: string
  members: number
  survey: HouseholdSurvey
  /** When the beneficiary submitted the needs assessment. */
  surveyedAt: string
}

/**
 * The feature vector k-means clusters on: household size, how serious the need is,
 * and one 0/1 flag per named need category from Q1.
 */
export type NeedsFeatureKey = 'members' | 'seriousness' | Exclude<NeedCategory, 'other'>

export interface NeedsCluster {
  /** 0-based cluster index — the colour and label are keyed on it. */
  index: number
  householdIds: string[]
  /**
   * Mean of every feature over the cluster's members, in original units — for a
   * need category that is the share of members (0–1) who selected it.
   */
  centroid: Record<NeedsFeatureKey, number>
  /** Need category selected by the largest share of members — the cluster's headline. */
  dominantNeed: Exclude<NeedCategory, 'other'>
  /** Barrier the members name most often — what a programme for this group must clear. */
  topBarrier: NeedBarrier
  /** Priority band of the centroid's seriousness. */
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
