/**
 * The two boards are scored on separate criteria and never compared against each
 * other. The volunteer board and the scoring settings come from the server —
 * `/api/v1/rankings/*` — where a coordinator's call is cut to their own college's
 * events. The donor board is still a fixture until donations are recorded.
 */
import dayjs from 'dayjs'
import {
  RANKING_DEFAULT_BOARD,
  RANKING_DEFAULT_SETTINGS,
  RANKING_TREND_MONTHS,
} from '../../constants/ranking'
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

/**
 * The donor rate and default board are not on the server (the donor board is
 * still a fixture), so they ride along in memory next to what the server holds.
 */
let localSettings = {
  donorPesosPerPoint: RANKING_DEFAULT_SETTINGS.donorPesosPerPoint,
  defaultBoard: RANKING_DEFAULT_BOARD,
}

function toSettings(row: RankingSettingsResponse): RankingSettings {
  return {
    pointsPerAttendance: row.points_per_attendance,
    absencePenaltyStep: row.absence_penalty_step,
    absenceResetDays: row.absence_reset_days,
    donorPesosPerPoint: localSettings.donorPesosPerPoint,
    defaultBoard: localSettings.defaultBoard,
    defaultPeriod: row.default_period,
    tiers: row.tiers.map(toTier),
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
        default_period: settings.defaultPeriod,
        tiers: settings.tiers.map((tier, index) =>
          fromTier(tier, index === settings.tiers.length - 1),
        ),
      },
    )
    localSettings = {
      donorPesosPerPoint: settings.donorPesosPerPoint,
      defaultBoard: settings.defaultBoard,
    }
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
 * Donor board — fixtures until donations are recorded.
 * ------------------------------------------------------------------------- */

/** Points are always derived from the saved criteria, never stored on the fixture. */
export function donorPoints(amount: number, pesosPerPoint: number): number {
  return Math.floor(amount / pesosPerPoint)
}

type DonorSeed = Omit<DonorRankingEntry, 'rank' | 'points'>

const DONOR_SEED: DonorSeed[] = [
  { id: 'd1', name: 'Cebu Bright Foundation', email: 'giving@cebubright.org', donorType: 'organization', amount: 250000, donations: 6, lastDonatedAt: '2026-08-17T04:00:00Z', previousRank: 1 },
  { id: 'd2', name: 'Ramon Gonzales', email: 'ramon.gonzales@gmail.com', donorType: 'individual', amount: 182500, donations: 11, lastDonatedAt: '2026-08-18T10:20:00Z', previousRank: 3 },
  { id: 'd3', name: 'Pacific Logistics Inc.', email: 'csr@pacificlogistics.ph', donorType: 'organization', amount: 150000, donations: 3, lastDonatedAt: '2026-08-13T02:15:00Z', previousRank: 2 },
  { id: 'd4', name: 'Mariel Ancheta', email: 'mariel.ancheta@outlook.com', donorType: 'individual', amount: 97800, donations: 9, lastDonatedAt: '2026-08-16T11:45:00Z', previousRank: 5 },
  { id: 'd5', name: 'UCLM Alumni Chapter', email: 'alumni@uclm.edu.ph', donorType: 'organization', amount: 84300, donations: 4, lastDonatedAt: '2026-08-10T07:30:00Z', previousRank: 4 },
  { id: 'd6', name: 'Dennis Yap', email: 'dennis.yap@gmail.com', donorType: 'individual', amount: 61200, donations: 7, lastDonatedAt: '2026-08-12T09:05:00Z' },
  { id: 'd7', name: 'Sunrise Pharmacy', email: 'admin@sunrisepharmacy.ph', donorType: 'organization', amount: 45000, donations: 2, lastDonatedAt: '2026-08-08T05:50:00Z', previousRank: 6 },
  { id: 'd8', name: 'Grace Espinosa', email: 'grace.espinosa@yahoo.com', donorType: 'individual', amount: 32450, donations: 5, lastDonatedAt: '2026-08-06T01:25:00Z', previousRank: 9 },
  { id: 'd9', name: 'Talisay Rotary Club', email: 'contact@talisayrotary.org', donorType: 'organization', amount: 28000, donations: 3, lastDonatedAt: '2026-08-03T08:10:00Z', previousRank: 7 },
  { id: 'd10', name: 'Ivan Cortez', email: 'ivan.cortez@gmail.com', donorType: 'individual', amount: 15600, donations: 4, lastDonatedAt: '2026-08-01T00:40:00Z', previousRank: 8 },
]

/** Highest points first; the position in that order is the rank. */
function rankBy<T>(seed: T[], points: (entry: T) => number) {
  return seed
    .map((entry) => ({ ...entry, points: points(entry) }))
    .sort((a, b) => b.points - a.points)
    .map((entry, index) => ({ ...entry, rank: index + 1 }))
}

export async function listDonorRankings(
  settings: RankingSettings,
): Promise<ApiResponse<DonorRankingEntry[]>> {
  return {
    success: true,
    data: rankBy(DONOR_SEED, (entry) =>
      donorPoints(entry.amount, settings.donorPesosPerPoint),
    ),
  }
}

/**
 * How each mock donor's total spreads across the months on the chart. Profiles are
 * assigned by standing so the lines rise at different rates instead of in parallel.
 */
const TREND_PROFILES = [
  [0.11, 0.14, 0.16, 0.18, 0.2, 0.21],
  [0.2, 0.19, 0.17, 0.16, 0.15, 0.13],
  [0.14, 0.17, 0.13, 0.19, 0.16, 0.21],
]

const TREND_SIZE = 3

/** Month labels ending on the current month, oldest first. */
function trendLabels(): string[] {
  return Array.from({ length: RANKING_TREND_MONTHS }, (_, index) =>
    dayjs()
      .subtract(RANKING_TREND_MONTHS - 1 - index, 'month')
      .format('MMM'),
  )
}

/** Cumulative points at each month end — the race, not the monthly deltas. */
function cumulative(total: number, profile: number[]): number[] {
  let running = 0

  return profile.slice(0, RANKING_TREND_MONTHS).map((share) => {
    running += total * share
    return Math.round(running)
  })
}

export async function getDonorRankingTrend(
  settings: RankingSettings,
): Promise<ApiResponse<RankingTrend>> {
  const donors = (await listDonorRankings(settings)).data ?? []
  return {
    success: true,
    data: {
      labels: trendLabels(),
      series: donors.slice(0, TREND_SIZE).map((entry, index) => ({
        id: entry.id,
        name: entry.name,
        rank: entry.rank,
        values: cumulative(entry.points, TREND_PROFILES[index] ?? TREND_PROFILES[0]),
      })),
    },
  }
}
