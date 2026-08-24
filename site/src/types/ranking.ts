/** Which leaderboard is being shown — the two are scored on different criteria. */
export type RankingBoard = 'volunteer' | 'donor'

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
  /** Verified service hours — points are `hours × VOLUNTEER_POINTS_PER_HOUR`. */
  hours: number
  eventsJoined: number
  lastActiveAt: string
}

export interface DonorRankingEntry extends RankedEntry {
  name: string
  email: string
  donorType: 'individual' | 'organization'
  /** Total donated in pesos — points are `amount ÷ DONOR_PESOS_PER_POINT`. */
  amount: number
  donations: number
  lastDonatedAt: string
}

/**
 * A board-agnostic row for the dashboard's podium — either board maps into this so
 * the podium doesn't have to know which criteria produced the points.
 */
export interface RankingLeader {
  id: string
  rank: number
  name: string
  /** The criteria figure behind the points: hours given, or amount donated. */
  subtitle: string
  points: number
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
  volunteerPointsPerHour: number
  donorPesosPerPoint: number
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
