/**
 * Which leaderboard is being shown. Volunteers and donors are scored on different
 * criteria; the department board compares colleges on both at once.
 */
export type RankingBoard = 'volunteer' | 'donor' | 'department'

/** The two tabs: headline figures, or the full standings table. */
export type RankingView = 'dashboard' | 'list'

/** How far back the standings are counted. */
export type RankingPeriod = 'month' | 'quarter' | 'year' | 'all'

interface RankedEntry {
  id: string
  /** 1-based standing within the board, assigned after sorting by points. */
  rank: number
  /** Standing in the previous period; undefined for a first-time entrant. */
  previousRank?: number
  /** Earned points — the only value the ranking sorts on. */
  points: number
}

export interface VolunteerRankingEntry extends RankedEntry {
  firstName: string
  lastName: string
  email: string
  department: string
  /** Credited service hours, shown for context — points never come from them. */
  hours: number
  /** Events attended — each one earns `pointsPerAttendance`. */
  eventsJoined: number
  /** Registered events the volunteer skipped — each one cost an escalating penalty. */
  eventsMissed: number
  pointsEarned: number
  pointsDeducted: number
  /** Straight misses still counting against the next one; 0 once the window passed. */
  currentStreak: number
  /** Null when the volunteer has yet to attend anything in the period. */
  lastActiveAt: string | null
}

export interface DonorRankingEntry extends RankedEntry {
  name: string
  email: string
  donorType: 'individual' | 'organization'
  /** Confirmed pesos in the period — money paid plus the credited value of goods. */
  amount: number
  moneyAmount: number
  goodsAmount: number
  donations: number
  /** Null when nothing of theirs was confirmed in the period. */
  lastDonatedAt: string | null
}

/**
 * A board-agnostic row for the dashboard's podium — every board maps into this so
 * the podium doesn't have to know which criteria produced the standing.
 */
export interface RankingLeader {
  id: string
  rank: number
  name: string
  /** The criteria figure behind the standing: hours given, or amount donated. */
  subtitle: string
  /** What the standing is measured in, formatted — `120 pts`, or a college's score. */
  figure: string
  /** Short text drawn in place of initials — a college's code. */
  badge?: string
}

/**
 * Which avatar frame a tier draws. The preset is the ornament only — its colours
 * come from the tier, so a director can restyle a tier without redrawing it.
 */
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

/** One selectable frame design, as listed in the Customization gallery. */
export interface RankFrameDesign {
  id: RankFrameDesignId
  label: string
  /** One line on what the ornament reads as, shown under its preview. */
  description: string
}

/**
 * A rank tier — the badge frame drawn around a ranked avatar. Tiers are assigned by
 * standing, not raw points, so the ladder means the same thing on both boards even
 * though hours and pesos score on different scales.
 */
export interface RankingTier {
  id: string
  label: string
  /** Highest standing still in this tier; the last tier catches everyone below. */
  maxRank: number
  /** The frame ornament, picked from the design gallery in Customization. */
  frame: RankFrameDesignId
  /** Frame gradient, low stop to high stop — both are director-editable hex. */
  colorFrom: string
  colorTo: string
}

/**
 * What a frame needs to draw itself, independent of who is wearing it — the
 * Customization previews render straight from this without a standing.
 */
export interface RankFrameAppearance {
  frame: RankFrameDesignId
  colorFrom: string
  colorTo: string
}

/** A named pair of gradient stops offered as a one-click colour pick. */
export interface RankColorCombo {
  id: string
  label: string
  colorFrom: string
  colorTo: string
}

/**
 * How the boards are scored and how the tier ladder is cut. Editable from
 * Rankings → Customization; the standings recompute from whatever is saved here.
 */
export interface RankingSettings {
  /** Points earned for every attended event. */
  pointsPerAttendance: number
  /** What the first miss costs; each straight miss inside the window adds it again. */
  absencePenaltyStep: number
  /** Misses further apart than this many days restart the penalty at the first step. */
  absenceResetDays: number
  donorPesosPerPoint: number
  /** Pesos credited per unit of each goods type, keyed by goods-type id. */
  goodsTypeValues: Record<string, number>
  defaultBoard: RankingBoard
  defaultPeriod: RankingPeriod
  /** Highest tier first; the last one has no cut-off and catches everyone below. */
  tiers: RankingTier[]
}

/** One line on the participation chart — the top-three race over recent months. */
export interface RankingTrendSeries {
  id: string
  name: string
  rank: number
  /** Cumulative points at the end of each month, aligned to `RankingTrend.labels`. */
  values: number[]
}

export interface RankingTrend {
  labels: string[]
  series: RankingTrendSeries[]
}

/** What the department board is ordered on — the filter on that board. */
export type DepartmentRankingBasis = 'overall' | 'hours' | 'donations'

/** Only donors who gave this way — the filter on the donor board. */
export type DonorKindFilter = 'all' | 'money' | 'goods'

/** A college's standing on each of the department board's three orders. */
export type DepartmentRanks = Record<DepartmentRankingBasis, number>

/**
 * One college's volunteer hours and confirmed giving. Hours count toward the
 * volunteer's own college; a donation counts toward the college whose event it
 * went to.
 */
export interface DepartmentRankingEntry {
  /** Stable key — the college code when known, else its lowercased name. */
  id: string
  name: string
  /** Short code (`CCS`, …) when the name maps to a known college. */
  code: string | null
  volunteers: number
  eventsAttended: number
  hours: number
  donationAmount: number
  donations: number
  /** 0–100: half the college's share of all hours, half its share of all pesos. */
  score: number
  ranks: DepartmentRanks
  /** Undefined for all time, or a college new since the previous window. */
  previousRanks?: DepartmentRanks
}

export interface DepartmentRankings {
  entries: DepartmentRankingEntry[]
  /** Hours and pesos no college could be credited with (e.g. school-wide events). */
  unattributed: { hours: number; donationAmount: number }
}

/** A college row as shown: its standing on the order the filter picked. */
export interface DisplayedDepartment extends DepartmentRankingEntry {
  rank: number
  previousRank?: number
}
