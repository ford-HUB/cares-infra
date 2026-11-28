import { formatNumber } from './formatting'
import type {
  DepartmentRankingBasis,
  DonorKindFilter,
  RankingBoard,
  RankingPeriod,
  RankingSettings,
  RankingTier,
  RankingView,
  SpecialParticipationRole,
} from '../types/ranking'

/** Boards never merge: volunteers earn per attendance minus escalating skip penalties; donors per peso. */
export const VOLUNTEER_POINTS_PER_ATTENDANCE = 10
export const VOLUNTEER_ABSENCE_PENALTY_STEP = 2
export const VOLUNTEER_ABSENCE_RESET_DAYS = 7
export const DONOR_PESOS_PER_POINT = 100

/** Mirrors server `SPECIAL_PARTICIPATION_ROLES`. */
export const PARTICIPATION_ROLE_OPTIONS: {
  id: SpecialParticipationRole
  label: string
  description: string
}[] = [
  {
    id: 'ORGANIZER',
    label: 'Organizer',
    description: 'Assists the Director or Coordinator in running the event.',
  },
  {
    id: 'FACILITATOR',
    label: 'Facilitator',
    description: 'Facilitates activities or guides participants.',
  },
  {
    id: 'SPEAKER',
    label: 'Speaker',
    description: 'Speaks as an invited or assigned speaker.',
  },
]

/** Mirrors server `DEFAULT_PARTICIPATION_ROLE_POINTS`. */
export const PARTICIPATION_ROLE_POINTS: Record<SpecialParticipationRole, number> = {
  ORGANIZER: 5,
  FACILITATOR: 5,
  SPEAKER: 10,
}

/** Pesos per unit, keyed by `GOODS_TYPE_OPTIONS` id; mirrors server `DEFAULT_GOODS_TYPE_VALUES`. */
export const DONOR_GOODS_TYPE_VALUES: Record<string, number> = {
  food: 150,
  clothing: 100,
  medicine: 300,
  books: 120,
  hygiene: 100,
  supplies: 100,
  other: 50,
}
export const GOODS_TYPE_VALUE_MIN = 0
export const GOODS_TYPE_VALUE_MAX = 1000000

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
  { value: 'department', label: 'Departments' },
]

export function boardCriteria(board: RankingBoard, settings: RankingSettings): string {
  if (board === 'department') {
    return "Colleges ranked on their volunteers' service hours and the confirmed donations to their events"
  }
  return board === 'volunteer'
    ? `+${settings.pointsPerAttendance} per event attended${roleBonusCriteria(settings)} · a missed registration costs −${settings.absencePenaltyStep}, then −${settings.absencePenaltyStep * 2}, −${settings.absencePenaltyStep * 3}… for straight misses within ${settings.absenceResetDays} days`
    : `1 point per ₱${settings.donorPesosPerPoint} of confirmed donations · goods count at their set value per unit`
}

/** ` (+5 Organizer, +10 Speaker)` */
function roleBonusCriteria(settings: RankingSettings): string {
  const bonuses = PARTICIPATION_ROLE_OPTIONS.filter(
    (role) => (settings.participationRolePoints[role.id] ?? 0) > 0,
  ).map((role) => `+${settings.participationRolePoints[role.id]} ${role.label}`)
  return bonuses.length > 0 ? ` (${bonuses.join(', ')} when the role is approved)` : ''
}

export const RANKING_PERIODS: { value: RankingPeriod; label: string }[] = [
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
]

export const RANKING_ROW_COUNT = 10

export const RANKING_CELL_BASE = 'h-12 px-3 text-[13px] align-middle'
export const RANKING_CELL_BORDER = 'border-b border-gray-100'

/** Silver, gold, bronze so first place sits centre. */
export const RANKING_PODIUM_ORDER = [2, 1, 3] as const

export const RANKING_PODIUM_HEIGHTS: Record<number, string> = {
  1: 'h-28',
  2: 'h-20',
  3: 'h-16',
}

export const RANKING_MEDAL_STYLES: Record<number, string> = {
  1: 'bg-amber-100 text-amber-800 ring-amber-300',
  2: 'bg-blue-100 text-blue-800 ring-blue-300',
  3: 'bg-orange-100 text-orange-800 ring-orange-300',
}

/** CVD-validated three-slot palette; re-run the check before changing. */
export const RANKING_SERIES_COLOR: Record<number, string> = {
  1: '#b8860b',
  2: '#2563eb',
  3: '#c2410c',
}

export const RANKING_SERIES_FALLBACK = '#64748b'

export const RANKING_TREND_MONTHS = 6

export const RANKING_MEDAL_FALLBACK = 'bg-white text-gray-600 ring-gray-200'

export const VOLUNTEER_RANKING_COLUMNS = [
  { key: 'volunteer', label: 'Volunteer', width: 'w-[24rem]' },
  { key: 'department', label: 'Department', width: 'w-[12rem]' },
  { key: 'attended', label: 'Attended', width: 'w-[7rem]' },
  { key: 'missed', label: 'Missed', width: 'w-[7rem]' },
  { key: 'roles', label: 'Roles Served', width: 'w-[13rem]' },
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

export const DEPARTMENT_RANKING_COLUMNS = [
  { key: 'department', label: 'Department', width: 'w-[22rem]' },
  { key: 'volunteers', label: 'Volunteers', width: 'w-[8rem]' },
  { key: 'hours', label: 'Service Hours', width: 'w-[10rem]' },
  { key: 'donated', label: 'Donations', width: 'w-[12rem]' },
  { key: 'score', label: 'Score', width: 'w-[12rem]' },
] as const

export const DEPARTMENT_RANKING_BASES: { value: DepartmentRankingBasis; label: string }[] = [
  { value: 'overall', label: 'Overall (hours + donations)' },
  { value: 'hours', label: 'Service hours' },
  { value: 'donations', label: 'Donation amount' },
]

export const DEPARTMENT_RANKING_DEFAULT_BASIS: DepartmentRankingBasis = 'overall'

export const DONOR_KIND_FILTERS: { value: DonorKindFilter; label: string }[] = [
  { value: 'all', label: 'All donations' },
  { value: 'money', label: 'Gave money' },
  { value: 'goods', label: 'Gave goods' },
]

export const ALL_DEPARTMENTS = 'all'

export const RANKING_SEARCH_PLACEHOLDERS: Record<RankingBoard, string> = {
  volunteer: 'Search name, email, or department',
  donor: 'Search name or email',
  department: 'Search department',
}

export const DONOR_TYPE_LABELS: Record<'individual' | 'organization', string> = {
  individual: 'Individual',
  organization: 'Organization',
}

export function formatPoints(points: number): string {
  return `${formatNumber(points)} pts`
}

export function formatHours(hours: number): string {
  return `${formatNumber(hours)} hrs`
}

/** One decimal, as the server rounds. */
export function formatScore(score: number): string {
  return `${score.toFixed(1)} score`
}

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
  participationRolePoints: PARTICIPATION_ROLE_POINTS,
  donorPesosPerPoint: DONOR_PESOS_PER_POINT,
  goodsTypeValues: DONOR_GOODS_TYPE_VALUES,
  defaultBoard: RANKING_DEFAULT_BOARD,
  defaultPeriod: RANKING_DEFAULT_PERIOD,
  tiers: RANKING_DEFAULT_TIERS,
}

/** Tiers are ordered highest-first. */
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

/** Shared by the form, its Zod schema, and the server. */
export const VOLUNTEER_POINTS_PER_ATTENDANCE_MIN = 1
export const VOLUNTEER_POINTS_PER_ATTENDANCE_MAX = 500
export const VOLUNTEER_ABSENCE_PENALTY_STEP_MIN = 0
export const VOLUNTEER_ABSENCE_PENALTY_STEP_MAX = 100
export const VOLUNTEER_ABSENCE_RESET_DAYS_MIN = 1
export const VOLUNTEER_ABSENCE_RESET_DAYS_MAX = 90
export const PARTICIPATION_ROLE_POINTS_MIN = 0
export const PARTICIPATION_ROLE_POINTS_MAX = 500
export const DONOR_PESOS_PER_POINT_MIN = 1
export const DONOR_PESOS_PER_POINT_MAX = 100000
export const RANKING_TIER_LABEL_MAX = 24

export const RANKING_TIER_MIN_COUNT = 2
export const RANKING_TIER_MAX_COUNT = 8

export const RANKING_TIER_RANK_STEP = 2

export const RANKING_TIER_NEW_LABEL = 'New Tier'
