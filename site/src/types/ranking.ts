export type RankingBoard = 'volunteer' | 'donor' | 'department'

/** Needs approval; earns a bonus per attended event. */
export type SpecialParticipationRole = 'ORGANIZER' | 'FACILITATOR' | 'SPEAKER'

export type RankingView = 'dashboard' | 'list'

export type RankingPeriod = 'month' | 'quarter' | 'year' | 'all'

interface RankedEntry {
  id: string
  /** 1-based, after sorting by points. */
  rank: number
  /** Undefined for a first-time entrant. */
  previousRank?: number
  /** The only sort key. */
  points: number
}

export interface VolunteerRankingEntry extends RankedEntry {
  firstName: string
  lastName: string
  email: string
  department: string
  /** Context only; points never come from hours. */
  hours: number
  eventsJoined: number
  /** Each cost an escalating penalty. */
  eventsMissed: number
  pointsEarned: number
  rolePoints: number
  roleCounts: Record<SpecialParticipationRole, number>
  pointsDeducted: number
  /** Straight misses still counting; 0 once the window passed. */
  currentStreak: number
  /** Null when nothing attended in the period. */
  lastActiveAt: string | null
}

export interface DonorRankingEntry extends RankedEntry {
  name: string
  email: string
  donorType: 'individual' | 'organization'
  /** Money paid plus credited value of goods. */
  amount: number
  moneyAmount: number
  goodsAmount: number
  donations: number
  /** Null when nothing confirmed in the period. */
  lastDonatedAt: string | null
}

/** Board-agnostic podium row. */
export interface RankingLeader {
  id: string
  rank: number
  name: string
  subtitle: string
  /** e.g. `120 pts`, or a college's score. */
  figure: string
  badge?: string
}

/** Ornament only; colours come from the tier. */
export type RankFrameDesignId =
  | 'aurora'
  | 'laurel'
  | 'shield'
  | 'orbit'
  | 'crown'
  | 'starburst'
  | 'blossom'
  | 'gear'
  | 'flame'
  | 'prism'
  | 'halo'
  | 'ring'

export interface RankFrameDesign {
  id: RankFrameDesignId
  label: string
  description: string
}

/** Assigned by standing, not points, so the ladder means the same on both boards. */
export interface RankingTier {
  id: string
  label: string
  /** The last tier catches everyone below. */
  maxRank: number
  frame: RankFrameDesignId
  /** Low stop to high stop, hex. */
  colorFrom: string
  colorTo: string
}

export interface RankFrameAppearance {
  frame: RankFrameDesignId
  colorFrom: string
  colorTo: string
}

export interface RankColorCombo {
  id: string
  label: string
  colorFrom: string
  colorTo: string
}

export interface RankingSettings {
  pointsPerAttendance: number
  /** Each straight miss inside the window adds it again. */
  absencePenaltyStep: number
  /** Misses further apart restart the penalty. */
  absenceResetDays: number
  participationRolePoints: Record<SpecialParticipationRole, number>
  donorPesosPerPoint: number
  /** Keyed by goods-type id. */
  goodsTypeValues: Record<string, number>
  defaultBoard: RankingBoard
  defaultPeriod: RankingPeriod
  /** Highest first; the last has no cut-off. */
  tiers: RankingTier[]
}

export interface RankingTrendSeries {
  id: string
  name: string
  rank: number
  /** Cumulative, aligned to `RankingTrend.labels`. */
  values: number[]
}

export interface RankingTrend {
  labels: string[]
  series: RankingTrendSeries[]
}

export type DepartmentRankingBasis = 'overall' | 'hours' | 'donations'

export type DonorKindFilter = 'all' | 'money' | 'goods'

export type DepartmentRanks = Record<DepartmentRankingBasis, number>

/** Hours count toward the volunteer's college; donations toward the event's college. */
export interface DepartmentRankingEntry {
  /** College code when known, else the lowercased name. */
  id: string
  name: string
  code: string | null
  volunteers: number
  eventsAttended: number
  hours: number
  donationAmount: number
  donations: number
  /** 0–100: half share of hours, half share of pesos. */
  score: number
  ranks: DepartmentRanks
  /** Undefined for all time, or a college new since the previous window. */
  previousRanks?: DepartmentRanks
}

export interface DepartmentRankings {
  entries: DepartmentRankingEntry[]
  /** e.g. school-wide events. */
  unattributed: { hours: number; donationAmount: number }
}

export interface DisplayedDepartment extends DepartmentRankingEntry {
  rank: number
  previousRank?: number
}
