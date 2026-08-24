/**
 * Mock standings for both leaderboards. The two boards are scored on separate
 * criteria — hours for volunteers, pesos for donors — so they are ranked apart and
 * never compared against each other.
 *
 * Fixtures only; swap each call for `apiClient` once the ranking endpoints land.
 */
import dayjs from 'dayjs'
import {
  RANKING_DEFAULT_SETTINGS,
  RANKING_TREND_MONTHS,
} from '../../constants/ranking'
import type {
  DonorRankingEntry,
  RankingBoard,
  RankingSettings,
  RankingTrend,
  VolunteerRankingEntry,
} from '../../types/ranking'

/** Points are always derived from the saved criteria, never stored on the fixture. */
export function volunteerPoints(hours: number, pointsPerHour: number): number {
  return Math.round(hours * pointsPerHour)
}

export function donorPoints(amount: number, pesosPerPoint: number): number {
  return Math.floor(amount / pesosPerPoint)
}

/**
 * The saved settings, held in memory for now. Editing them in Customization rescores
 * both boards on the next fetch — swap this for `apiClient` when the endpoint lands.
 */
let savedSettings: RankingSettings = RANKING_DEFAULT_SETTINGS

export async function getRankingSettings(): Promise<{
  success: boolean
  data: RankingSettings
}> {
  return { success: true, data: savedSettings }
}

export async function updateRankingSettings(settings: RankingSettings): Promise<{
  success: boolean
  data: RankingSettings
}> {
  savedSettings = settings
  return { success: true, data: savedSettings }
}

type VolunteerSeed = Omit<VolunteerRankingEntry, 'rank' | 'points'>
type DonorSeed = Omit<DonorRankingEntry, 'rank' | 'points'>

const VOLUNTEER_SEED: VolunteerSeed[] = [
  { id: 'v1', firstName: 'Carlo', lastName: 'Mendoza', email: 'carlo.mendoza@uclm.edu.ph', department: 'Engineering', hours: 128.5, eventsJoined: 21, lastActiveAt: '2026-08-18T09:15:00Z', previousRank: 2 },
  { id: 'v2', firstName: 'Sofia', lastName: 'Lim', email: 'sofia.lim@uclm.edu.ph', department: 'Nursing', hours: 121, eventsJoined: 19, lastActiveAt: '2026-08-19T02:40:00Z', previousRank: 1 },
  { id: 'v3', firstName: 'Miguel', lastName: 'Tan', email: 'miguel.tan@uclm.edu.ph', department: 'Criminology', hours: 104.25, eventsJoined: 17, lastActiveAt: '2026-08-16T07:05:00Z', previousRank: 4 },
  { id: 'v4', firstName: 'Andrea', lastName: 'Bautista', email: 'andrea.bautista@uclm.edu.ph', department: 'Education', hours: 96, eventsJoined: 15, lastActiveAt: '2026-08-15T23:30:00Z', previousRank: 3 },
  { id: 'v5', firstName: 'Joshua', lastName: 'Reyes', email: 'joshua.reyes@uclm.edu.ph', department: 'Business', hours: 88.75, eventsJoined: 14, lastActiveAt: '2026-08-14T05:20:00Z', previousRank: 6 },
  { id: 'v6', firstName: 'Patricia', lastName: 'Uy', email: 'patricia.uy@uclm.edu.ph', department: 'Nursing', hours: 81, eventsJoined: 13, lastActiveAt: '2026-08-12T01:10:00Z', previousRank: 5 },
  { id: 'v7', firstName: 'Kenneth', lastName: 'Alcantara', email: 'kenneth.alcantara@uclm.edu.ph', department: 'Engineering', hours: 74.5, eventsJoined: 12, lastActiveAt: '2026-08-11T08:45:00Z' },
  { id: 'v8', firstName: 'Divine', lastName: 'Rosales', email: 'divine.rosales@uclm.edu.ph', department: 'Education', hours: 66, eventsJoined: 11, lastActiveAt: '2026-08-09T00:25:00Z', previousRank: 9 },
  { id: 'v9', firstName: 'Rafael', lastName: 'Duterte', email: 'rafael.duterte@uclm.edu.ph', department: 'Criminology', hours: 58.25, eventsJoined: 9, lastActiveAt: '2026-08-07T06:00:00Z', previousRank: 7 },
  { id: 'v10', firstName: 'Bea', lastName: 'Villanueva', email: 'bea.villanueva@uclm.edu.ph', department: 'Business', hours: 47, eventsJoined: 8, lastActiveAt: '2026-08-04T03:35:00Z', previousRank: 8 },
]

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

export async function listVolunteerRankings(settings: RankingSettings): Promise<{
  success: boolean
  data: VolunteerRankingEntry[]
}> {
  return {
    success: true,
    data: rankBy(VOLUNTEER_SEED, (entry) =>
      volunteerPoints(entry.hours, settings.volunteerPointsPerHour),
    ),
  }
}

export async function listDonorRankings(settings: RankingSettings): Promise<{
  success: boolean
  data: DonorRankingEntry[]
}> {
  return {
    success: true,
    data: rankBy(DONOR_SEED, (entry) =>
      donorPoints(entry.amount, settings.donorPesosPerPoint),
    ),
  }
}

/**
 * How each entrant's total spreads across the months on the chart. Profiles are
 * assigned by standing so the mock lines rise at different rates — a fast finisher,
 * a steady worker, an early leader who tapered — instead of three parallel curves.
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

export async function getRankingTrend(
  board: RankingBoard,
  settings: RankingSettings,
): Promise<{ success: boolean; data: RankingTrend }> {
  const top =
    board === 'volunteer'
      ? (await listVolunteerRankings(settings)).data
          .slice(0, TREND_SIZE)
          .map((entry) => ({
            id: entry.id,
            name: `${entry.firstName} ${entry.lastName}`,
            rank: entry.rank,
            points: entry.points,
          }))
      : (await listDonorRankings(settings)).data.slice(0, TREND_SIZE).map((entry) => ({
          id: entry.id,
          name: entry.name,
          rank: entry.rank,
          points: entry.points,
        }))

  return {
    success: true,
    data: {
      labels: trendLabels(),
      series: top.map((entry, index) => ({
        id: entry.id,
        name: entry.name,
        rank: entry.rank,
        values: cumulative(entry.points, TREND_PROFILES[index] ?? TREND_PROFILES[0]),
      })),
    },
  }
}
