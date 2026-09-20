import { formatNumber } from './formatting'
import type {
  RankingBoard,
  RankingPeriod,
  RankingSettings,
  RankingTier,
  RankingView,
} from '../types/ranking'

/**
 * The two boards are scored on different criteria and are never merged: a volunteer
 * earns points for every event attended and loses an escalating penalty for every
 * registered event skipped; a donor earns points for pesos given.
 */
export const VOLUNTEER_POINTS_PER_ATTENDANCE = 10
export const VOLUNTEER_ABSENCE_PENALTY_STEP = 2
export const VOLUNTEER_ABSENCE_RESET_DAYS = 7
export const DONOR_PESOS_PER_POINT = 100

export const RANKING_DEFAULT_VIEW: RankingView = 'dashboard'

export const RANKING_VIEWS: { value: RankingView; label: string }[] = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'list', label: 'Ranking List' },
]

export const RANKING_DEFAULT_BOARD: RankingBoard = 'volunteer'
export const RANKING_DEFAULT_PERIOD: RankingPeriod = 'month'

export const RANKING_BOARDS: { value: RankingBoard; label: string }[] = [
  { value: 'volunteer', label: 'Volunteers' },
  { value: 'donor', label: 'Donors' },
]

/** The scoring rule spelled out for the header — it moves with the saved settings. */
export function boardCriteria(board: RankingBoard, settings: RankingSettings): string {
  return board === 'volunteer'
    ? `+${settings.pointsPerAttendance} per event attended · a missed registration costs −${settings.absencePenaltyStep}, then −${settings.absencePenaltyStep * 2}, −${settings.absencePenaltyStep * 3}… for straight misses within ${settings.absenceResetDays} days`
    : `1 point per ₱${settings.donorPesosPerPoint} donated`
}

export const RANKING_PERIODS: { value: RankingPeriod; label: string }[] = [
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
]

/** Rows shown per board — the standings are a fixed top list, not paginated. */
export const RANKING_ROW_COUNT = 10

export const RANKING_CELL_BASE = 'h-12 px-3 text-[13px] align-middle'
export const RANKING_CELL_BORDER = 'border-b border-gray-100'

/** Podium order left-to-right — silver, gold, bronze — so first place sits centre. */
export const RANKING_PODIUM_ORDER = [2, 1, 3] as const

export const RANKING_PODIUM_HEIGHTS: Record<number, string> = {
  1: 'h-28',
  2: 'h-20',
  3: 'h-16',
}

/** Podium tint for the first three standings; everyone else stays neutral. */
export const RANKING_MEDAL_STYLES: Record<number, string> = {
  1: 'bg-amber-100 text-amber-800 ring-amber-300',
  2: 'bg-blue-100 text-blue-800 ring-blue-300',
  3: 'bg-orange-100 text-orange-800 ring-orange-300',
}

/**
 * Line colour per podium standing, matching the bar tint under it. Validated for
 * colour-vision separation as a three-slot categorical palette — changing one of
 * these means re-running that check, not eyeballing it.
 */
export const RANKING_SERIES_COLOR: Record<number, string> = {
  1: '#b8860b',
  2: '#2563eb',
  3: '#c2410c',
}

export const RANKING_SERIES_FALLBACK = '#64748b'

/** Months of history the participation chart covers. */
export const RANKING_TREND_MONTHS = 6

export const RANKING_MEDAL_FALLBACK = 'bg-white text-gray-600 ring-gray-200'

export const VOLUNTEER_RANKING_COLUMNS = [
  { key: 'volunteer', label: 'Volunteer', width: 'w-[24rem]' },
  { key: 'department', label: 'Department', width: 'w-[12rem]' },
  { key: 'attended', label: 'Attended', width: 'w-[7rem]' },
  { key: 'missed', label: 'Missed', width: 'w-[7rem]' },
  { key: 'lastActive', label: 'Last Active', width: 'w-[10rem]' },
  { key: 'points', label: 'Points', width: 'w-[9rem]' },
] as const

export const DONOR_RANKING_COLUMNS = [
  { key: 'donor', label: 'Donor', width: 'w-[24rem]' },
  { key: 'type', label: 'Type', width: 'w-[10rem]' },
  { key: 'amount', label: 'Amount Donated', width: 'w-[12rem]' },
  { key: 'donations', label: 'Donations', width: 'w-[8rem]' },
  { key: 'lastDonated', label: 'Last Donation', width: 'w-[10rem]' },
  { key: 'points', label: 'Points', width: 'w-[9rem]' },
] as const

export const DONOR_TYPE_LABELS: Record<'individual' | 'organization', string> = {
  individual: 'Individual',
  organization: 'Organization',
}

/** Shared by both boards: a points total is a points total. */
export function formatPoints(points: number): string {
  return `${formatNumber(points)} pts`
}

/** The ladder as shipped — Customization edits a copy of this. */
export const RANKING_DEFAULT_TIERS: RankingTier[] = [
  {
    id: 'mythic',
    label: 'Mythic',
    maxRank: 1,
    frame: 'aurora',
    colorFrom: '#facc15',
    colorTo: '#f97316',
  },
  {
    id: 'legend',
    label: 'Legend',
    maxRank: 3,
    frame: 'crown',
    colorFrom: '#a78bfa',
    colorTo: '#6366f1',
  },
  {
    id: 'epic',
    label: 'Epic',
    maxRank: 5,
    frame: 'orbit',
    colorFrom: '#38bdf8',
    colorTo: '#2563eb',
  },
  {
    id: 'elite',
    label: 'Elite',
    maxRank: 8,
    frame: 'shield',
    colorFrom: '#34d399',
    colorTo: '#0f766e',
  },
  {
    id: 'warrior',
    label: 'Warrior',
    maxRank: Number.POSITIVE_INFINITY,
    frame: 'ring',
    colorFrom: '#cbd5e1',
    colorTo: '#64748b',
  },
]

export const RANKING_DEFAULT_SETTINGS: RankingSettings = {
  pointsPerAttendance: VOLUNTEER_POINTS_PER_ATTENDANCE,
  absencePenaltyStep: VOLUNTEER_ABSENCE_PENALTY_STEP,
  absenceResetDays: VOLUNTEER_ABSENCE_RESET_DAYS,
  donorPesosPerPoint: DONOR_PESOS_PER_POINT,
  defaultBoard: RANKING_DEFAULT_BOARD,
  defaultPeriod: RANKING_DEFAULT_PERIOD,
  tiers: RANKING_DEFAULT_TIERS,
}

/**
 * Tiers are ordered highest-first, so the first one that fits is the best one. The
 * frame and its colours ride on the tier itself — a director's styling follows the
 * tier everywhere it is drawn.
 */
export function tierForRank(
  rank: number,
  tiers: RankingTier[] = RANKING_DEFAULT_TIERS,
): RankingTier {
  const index = Math.max(
    0,
    tiers.findIndex((tier) => rank <= tier.maxRank),
  )

  return tiers[index] ?? tiers[tiers.length - 1]
}

/** Bounds shared by the customization form, its Zod schema, and the server's. */
export const VOLUNTEER_POINTS_PER_ATTENDANCE_MIN = 1
export const VOLUNTEER_POINTS_PER_ATTENDANCE_MAX = 500
export const VOLUNTEER_ABSENCE_PENALTY_STEP_MIN = 0
export const VOLUNTEER_ABSENCE_PENALTY_STEP_MAX = 100
export const VOLUNTEER_ABSENCE_RESET_DAYS_MIN = 1
export const VOLUNTEER_ABSENCE_RESET_DAYS_MAX = 90
export const DONOR_PESOS_PER_POINT_MIN = 1
export const DONOR_PESOS_PER_POINT_MAX = 100000
export const RANKING_TIER_LABEL_MAX = 24

/**
 * A ladder needs at least a top tier and the catch-all below it; past eight rungs
 * the badges stop meaning anything distinct on a leaderboard this size.
 */
export const RANKING_TIER_MIN_COUNT = 2
export const RANKING_TIER_MAX_COUNT = 8

/** How far below the tier above a newly added tier's cut-off starts. */
export const RANKING_TIER_RANK_STEP = 2

/** What a freshly added tier is called before the director renames it. */
export const RANKING_TIER_NEW_LABEL = 'New Tier'
