import type { ApiResponse } from '../types/portal-roles'
import type {
  ClusterBarangay,
  CommunityProblem,
  Household,
  NeedBarrier,
  NeedCategory,
  NeedPriority,
  NeedSeriousness,
  NeedsClusteringResult,
  NeedsFeatureKey,
} from '../types/residential-needs'
import { apiClient, parseApiError } from './api-client'

/** Server reads the surveys and hands them to decision-service (KMeans) for grouping. */

interface HouseholdApiRow {
  id: string
  family_name: string
  barangay: string
  members: number
  survey: {
    needs: NeedCategory[]
    other_need: string | null
    seriousness: number
    barriers: NeedBarrier[]
    other_barrier: string | null
    community_problem: CommunityProblem
    other_community_problem: string | null
    concern: string | null
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

function mapHousehold(row: HouseholdApiRow): Household {
  const { survey } = row
  return {
    id: row.id,
    familyName: row.family_name,
    barangay: row.barangay,
    members: row.members,
    survey: {
      needs: survey.needs,
      otherNeed: survey.other_need ?? undefined,
      seriousness: survey.seriousness as NeedSeriousness,
      barriers: survey.barriers,
      otherBarrier: survey.other_barrier ?? undefined,
      communityProblem: survey.community_problem,
      otherCommunityProblem: survey.other_community_problem ?? undefined,
      concern: survey.concern ?? undefined,
    },
    surveyedAt: row.surveyed_at,
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

export async function fetchHouseholds(): Promise<ApiResponse<Household[]>> {
  try {
    const { data: body } = await apiClient.get<{
      ok: true
      data: { items: HouseholdApiRow[] }
    }>('/api/v1/residential-needs/households')
    return { success: true, data: body.data.items.map(mapHousehold) }
  } catch (error) {
    return { success: false, message: parseApiError(error), data: null }
  }
}

export async function clusterHouseholds(
  k: number,
  seed: number,
): Promise<ApiResponse<NeedsClusteringResult>> {
  try {
    const { data: body } = await apiClient.post<{
      ok: true
      data: ClusterNeedsApiResponse
    }>('/api/v1/residential-needs/clusters', { k, seed })
    return { success: true, data: mapClusteringResult(body.data) }
  } catch (error) {
    return { success: false, message: parseApiError(error), data: null }
  }
}
