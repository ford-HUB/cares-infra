import type { ApiResponse } from '../types/portal-roles'
import type {
  ClusterBarangay,
  Household,
  NeedBarrier,
  NeedCategory,
  NeedPriority,
  NeedsClusteringResult,
  NeedsFeatureKey,
} from '../types/residential-needs'
import { apiClient, parseApiError } from './api-client'

/**
 * Residential Needs — the K-Means grouping behind the Clusters screen. The rows
 * travel in the request because the survey is not in the database yet: the portal
 * sends what it is showing (today the mock households) and the server hands them to
 * decision-service, which runs scikit-learn KMeans and describes each group.
 */

interface HouseholdApiPayload {
  id: string
  family_name: string
  barangay: string
  members: number
  survey: {
    needs: NeedCategory[]
    other_need?: string
    seriousness: number
    barriers: NeedBarrier[]
    other_barrier?: string
    community_problem: string
    other_community_problem?: string
    concern?: string
  }
  surveyed_at: string
}

interface NeedsClusterApiResponse {
  index: number
  household_ids: string[]
  centroid: Record<NeedsFeatureKey, number>
  dominant_need: Exclude<NeedCategory, 'other'>
  top_barrier: NeedBarrier
  priority: NeedPriority
  barangay: ClusterBarangay
  need_level: number
}

interface ClusterNeedsApiResponse {
  k: number
  clusters: NeedsClusterApiResponse[]
  assignments: Record<string, number>
  inertia: number
  iterations: number
  converged: boolean
  seed: number
  algorithm: string
  features: string[]
  generated_at: string
}

function toApiHousehold(household: Household): HouseholdApiPayload {
  const { survey } = household
  return {
    id: household.id,
    family_name: household.familyName,
    barangay: household.barangay,
    members: household.members,
    survey: {
      needs: survey.needs,
      ...(survey.otherNeed ? { other_need: survey.otherNeed } : {}),
      seriousness: survey.seriousness,
      barriers: survey.barriers,
      ...(survey.otherBarrier ? { other_barrier: survey.otherBarrier } : {}),
      community_problem: survey.communityProblem,
      ...(survey.otherCommunityProblem
        ? { other_community_problem: survey.otherCommunityProblem }
        : {}),
      ...(survey.concern ? { concern: survey.concern } : {}),
    },
    surveyed_at: household.surveyedAt,
  }
}

function mapClusteringResult(body: ClusterNeedsApiResponse): NeedsClusteringResult {
  return {
    k: body.k,
    clusters: body.clusters.map((cluster) => ({
      index: cluster.index,
      householdIds: cluster.household_ids,
      centroid: cluster.centroid,
      dominantNeed: cluster.dominant_need,
      topBarrier: cluster.top_barrier,
      priority: cluster.priority,
      barangay: cluster.barangay,
      needLevel: cluster.need_level,
    })),
    assignments: body.assignments,
    inertia: body.inertia,
    iterations: body.iterations,
    converged: body.converged,
    seed: body.seed,
    algorithm: body.algorithm,
    generatedAt: body.generated_at,
  }
}

export async function clusterHouseholds(
  households: Household[],
  k: number,
  seed: number,
): Promise<ApiResponse<NeedsClusteringResult>> {
  try {
    const { data: body } = await apiClient.post<{
      ok: true
      data: ClusterNeedsApiResponse
    }>('/api/v1/residential-needs/clusters', {
      households: households.map(toApiHousehold),
      k,
      seed,
    })
    return { success: true, data: mapClusteringResult(body.data) }
  } catch (error) {
    return { success: false, message: parseApiError(error), data: null }
  }
}
