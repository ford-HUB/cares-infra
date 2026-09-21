/**
 * The two boards are scored on separate criteria and never compared against each
 * other. Both boards and the scoring settings come from the server —
 * `/api/v1/rankings/*` — where a coordinator's volunteer call is cut to their own
 * college's events; the donor board is scored from confirmed donations.
 */
import { RANKING_DEFAULT_BOARD } from '../../constants/ranking'
import type { ApiResponse } from '../../types/portal-roles'
import type {
  DonorRankingEntry,
  RankFrameDesignId,
  RankingPeriod,
  RankingSettings,
  RankingTier,
  RankingTrend,
  VolunteerRankingEntry,
} from '../../types/ranking'
import { apiClient, parseApiError } from '../api-client'

/** Backend wraps successful responses in an { ok, data } envelope. */
type ApiEnvelope<T> = { ok: true; message?: string; data: T }

interface RankingTierResponse {
  id: string
  label: string
  /** Null marks the catch-all last tier. */
  max_rank: number | null
  frame: RankFrameDesignId
  color_from: string
  color_to: string
}

interface RankingSettingsResponse {
  points_per_attendance: number
  absence_penalty_step: number
  absence_reset_days: number
  donor_pesos_per_point: number
  goods_type_values: Record<string, number>
  default_period: RankingPeriod
  tiers: RankingTierResponse[]
  updated_at: string
}

interface VolunteerRankingEntryResponse {
  user_id: string
  firstname: string
  lastname: string
  email: string
  department: string | null
  rank: number
  previous_rank: number | null
  points: number
  points_earned: number
  points_deducted: number
  events_attended: number
  events_missed: number
  hours: number
  current_streak: number
  last_active_at: string | null
}

interface VolunteerRankingsResponse {
  period: RankingPeriod
  department: string | null
  entries: VolunteerRankingEntryResponse[]
}

interface DonorRankingEntryResponse {
  user_id: string
  name: string
  email: string
  rank: number
  previous_rank: number | null
  points: number
  amount: number
  money_amount: number
  goods_amount: number
  donations: number
  last_donated_at: string | null
}

interface DonorRankingsResponse {
  period: RankingPeriod
  donor_pesos_per_point: number
  entries: DonorRankingEntryResponse[]
}

interface RankingTrendResponse {
  labels: string[]
  series: { user_id: string; name: string; rank: number; values: number[] }[]
}

const UNKNOWN_DEPARTMENT = '—'

function toTier(tier: RankingTierResponse): RankingTier {
  return {
    id: tier.id,
    label: tier.label,
    maxRank: tier.max_rank ?? Number.POSITIVE_INFINITY,
    frame: tier.frame,
    colorFrom: tier.color_from,
    colorTo: tier.color_to,
  }
}

function fromTier(tier: RankingTier, isLast: boolean): RankingTierResponse {
  return {
    id: tier.id,
    label: tier.label,
    max_rank: isLast || !Number.isFinite(tier.maxRank) ? null : tier.maxRank,
    frame: tier.frame,
    color_from: tier.colorFrom,
    color_to: tier.colorTo,
  }
}

/** The default board is a portal-only preference, so it rides along in memory. */
let localSettings = {
  defaultBoard: RANKING_DEFAULT_BOARD,
}

function toSettings(row: RankingSettingsResponse): RankingSettings {
  return {
    pointsPerAttendance: row.points_per_attendance,
    absencePenaltyStep: row.absence_penalty_step,
    absenceResetDays: row.absence_reset_days,
    donorPesosPerPoint: row.donor_pesos_per_point,
    goodsTypeValues: row.goods_type_values,
    defaultBoard: localSettings.defaultBoard,
    defaultPeriod: row.default_period,
    tiers: row.tiers.map(toTier),
  }
}

function toDonorEntry(row: DonorRankingEntryResponse): DonorRankingEntry {
  return {
    id: row.user_id,
    rank: row.rank,
    previousRank: row.previous_rank ?? undefined,
    points: row.points,
    name: row.name,
    email: row.email,
    donorType: 'individual',
    amount: row.amount,
    moneyAmount: row.money_amount,
    goodsAmount: row.goods_amount,
    donations: row.donations,
    lastDonatedAt: row.last_donated_at,
  }
}

function toVolunteerEntry(row: VolunteerRankingEntryResponse): VolunteerRankingEntry {
  return {
    id: row.user_id,
    rank: row.rank,
    previousRank: row.previous_rank ?? undefined,
    points: row.points,
    firstName: row.firstname,
    lastName: row.lastname,
    email: row.email,
    department: row.department ?? UNKNOWN_DEPARTMENT,
    hours: row.hours,
    eventsJoined: row.events_attended,
    eventsMissed: row.events_missed,
    pointsEarned: row.points_earned,
    pointsDeducted: row.points_deducted,
    currentStreak: row.current_streak,
    lastActiveAt: row.last_active_at,
  }
}

export async function getRankingSettings(): Promise<ApiResponse<RankingSettings>> {
  try {
    const { data: body } = await apiClient.get<ApiEnvelope<RankingSettingsResponse>>(
      '/api/v1/rankings/settings',
    )
    return { success: true, data: toSettings(body.data) }
  } catch (error) {
    return { success: false, data: null, message: parseApiError(error) }
  }
}

export async function updateRankingSettings(
  settings: RankingSettings,
): Promise<ApiResponse<RankingSettings>> {
  try {
    const { data: body } = await apiClient.put<ApiEnvelope<RankingSettingsResponse>>(
      '/api/v1/rankings/settings',
      {
        points_per_attendance: settings.pointsPerAttendance,
        absence_penalty_step: settings.absencePenaltyStep,
        absence_reset_days: settings.absenceResetDays,
        donor_pesos_per_point: settings.donorPesosPerPoint,
        goods_type_values: settings.goodsTypeValues,
        default_period: settings.defaultPeriod,
        tiers: settings.tiers.map((tier, index) =>
          fromTier(tier, index === settings.tiers.length - 1),
        ),
      },
    )
    localSettings = { defaultBoard: settings.defaultBoard }
    return { success: true, data: toSettings(body.data) }
  } catch (error) {
    return { success: false, data: null, message: parseApiError(error) }
  }
}

/**
 * The volunteer standings for a period. The server scopes the board to the
 * caller: the whole school for a director or admin, one college for a coordinator.
 */
export async function listVolunteerRankings(
  period: RankingPeriod,
): Promise<ApiResponse<{ department: string | null; entries: VolunteerRankingEntry[] }>> {
  try {
    const { data: body } = await apiClient.get<ApiEnvelope<VolunteerRankingsResponse>>(
      '/api/v1/rankings/volunteers',
      { params: { period } },
    )
    return {
      success: true,
      data: {
        department: body.data.department,
        entries: body.data.entries.map(toVolunteerEntry),
      },
    }
  } catch (error) {
    return { success: false, data: null, message: parseApiError(error) }
  }
}

export async function getVolunteerRankingTrend(
  period: RankingPeriod,
): Promise<ApiResponse<RankingTrend>> {
  try {
    const { data: body } = await apiClient.get<ApiEnvelope<RankingTrendResponse>>(
      '/api/v1/rankings/volunteers/trend',
      { params: { period } },
    )
    return {
      success: true,
      data: {
        labels: body.data.labels,
        series: body.data.series.map((series) => ({
          id: series.user_id,
          name: series.name,
          rank: series.rank,
          values: series.values,
        })),
      },
    }
  } catch (error) {
    return { success: false, data: null, message: parseApiError(error) }
  }
}

/* ---------------------------------------------------------------------------
 * Donor board — confirmed donations scored on the server.
 * ------------------------------------------------------------------------- */

/** Points are always derived from the saved criteria, never stored. */
export function donorPoints(amount: number, pesosPerPoint: number): number {
  return Math.floor(amount / pesosPerPoint)
}

export async function listDonorRankings(
  period: RankingPeriod,
): Promise<ApiResponse<DonorRankingEntry[]>> {
  try {
    const { data: body } = await apiClient.get<ApiEnvelope<DonorRankingsResponse>>(
      '/api/v1/rankings/donors',
      { params: { period } },
    )
    return { success: true, data: body.data.entries.map(toDonorEntry) }
  } catch (error) {
    return { success: false, data: null, message: parseApiError(error) }
  }
}

export async function getDonorRankingTrend(
  period: RankingPeriod,
): Promise<ApiResponse<RankingTrend>> {
  try {
    const { data: body } = await apiClient.get<ApiEnvelope<RankingTrendResponse>>(
      '/api/v1/rankings/donors/trend',
      { params: { period } },
    )
    return {
      success: true,
      data: {
        labels: body.data.labels,
        series: body.data.series.map((series) => ({
          id: series.user_id,
          name: series.name,
          rank: series.rank,
          values: series.values,
        })),
      },
    }
  } catch (error) {
    return { success: false, data: null, message: parseApiError(error) }
  }
}
