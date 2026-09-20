import {
  NEED_CATEGORY_ORDER,
  NEED_PRIORITY_ORDER,
  NEED_PRIORITY_THRESHOLDS,
  NEED_SCORE_MAX,
} from '../constants/residential-needs'
import type {
  Household,
  NeedCategory,
  NeedPriority,
  NeedScores,
} from '../types/residential-needs'
import { seededRandom } from '../utils/seeded-random'

/**
 * MOCK DATA — the Residential Needs module is a design pass and does not call the
 * server. Each row stands in for one Beneficiary Needs Assessment survey answered on
 * the mobile app. Households below are generated once from a fixed seed so the
 * screens are stable between reloads; swap `getMockHouseholds` for a real fetch when
 * the survey endpoint exists. Not wired on purpose.
 */

const BARANGAYS = ['Looc', 'Umapad', 'Opao', 'Paknaan'] as const

const FAMILY_NAMES = [
  'Abellana', 'Bacalso', 'Cabrera', 'Dagoy', 'Enriquez', 'Flores', 'Gonzaga',
  'Herrera', 'Inoc', 'Jumao-as', 'Kintanar', 'Labrador', 'Mangubat', 'Navarro',
  'Ouano', 'Pepito', 'Quijano', 'Rosales', 'Sanchez', 'Tabada', 'Ursal', 'Villaceran',
  'Wenceslao', 'Ybanez', 'Zafra', 'Alcoseba', 'Baclayon', 'Canete', 'Dela Cerna',
  'Escario', 'Fernan', 'Gantuangco', 'Hortelano', 'Igot', 'Jaca', 'Kyamko',
  'Lapinid', 'Malinao', 'Nunez', 'Ocampo', 'Pilapil', 'Quimno', 'Roble', 'Sabellano',
  'Tampus', 'Umbao', 'Vergara', 'Yap',
]

/**
 * Three archetypes the generator draws from, so the data has real structure for
 * k-means to find rather than uniform noise: a large family short on nearly
 * everything, a household with food and livelihood gaps, and a stable household
 * with a single lingering need. Each archetype is rooted in a home barangay (most
 * of its rows land there) so a cluster has a barangay it concentrates in.
 */
interface Archetype {
  weight: number
  members: [number, number]
  /** Where most of these households live; the rest are spread across the others. */
  homeBarangays: readonly string[]
  needs: Record<NeedCategory, [number, number]>
}

/** Share of an archetype's rows that land in one of its home barangays. */
const HOME_BARANGAY_SHARE = 0.8

const ARCHETYPES: Archetype[] = [
  {
    weight: 0.35,
    members: [5, 9],
    homeBarangays: ['Looc'],
    needs: {
      food: [3, 5], water: [3, 5], shelter: [3, 5],
      health: [3, 5], education: [2, 4], livelihood: [3, 5],
    },
  },
  {
    weight: 0.4,
    members: [3, 6],
    homeBarangays: ['Umapad'],
    needs: {
      food: [2, 4], water: [0, 2], shelter: [1, 3],
      health: [1, 3], education: [2, 4], livelihood: [3, 5],
    },
  },
  {
    weight: 0.25,
    members: [2, 4],
    homeBarangays: ['Opao'],
    needs: {
      food: [0, 1], water: [0, 1], shelter: [0, 2],
      health: [0, 3], education: [0, 2], livelihood: [0, 2],
    },
  },
]

const HOUSEHOLD_COUNT = 48

function buildHouseholds(): Household[] {
  const rand = seededRandom(20260919)
  const between = (lo: number, hi: number) => lo + rand() * (hi - lo)
  const intBetween = (lo: number, hi: number) => Math.round(between(lo, hi))
  const pickArchetype = () => {
    const roll = rand()
    let acc = 0
    for (const one of ARCHETYPES) {
      acc += one.weight
      if (roll < acc) return one
    }
    return ARCHETYPES[ARCHETYPES.length - 1]
  }

  return Array.from({ length: HOUSEHOLD_COUNT }, (_, i) => {
    const archetype = pickArchetype()
    const needs = Object.fromEntries(
      NEED_CATEGORY_ORDER.map((category) => {
        const [lo, hi] = archetype.needs[category]
        return [category, Math.min(NEED_SCORE_MAX, Math.max(0, intBetween(lo, hi)))]
      }),
    ) as NeedScores

    const pool =
      rand() < HOME_BARANGAY_SHARE
        ? archetype.homeBarangays
        : BARANGAYS.filter((b) => !archetype.homeBarangays.includes(b))
    const barangay = pool[Math.floor(rand() * pool.length)]

    const daysAgo = intBetween(2, 75)
    const surveyedAt = new Date(Date.UTC(2026, 8, 19) - daysAgo * 86_400_000).toISOString()

    return {
      id: `hh-${String(i + 1).padStart(3, '0')}`,
      familyName: FAMILY_NAMES[i % FAMILY_NAMES.length],
      barangay,
      members: intBetween(...archetype.members),
      needs,
      surveyedAt,
    }
  })
}

const MOCK_HOUSEHOLDS: Household[] = buildHouseholds()

/** The full survey list. Synchronous because it is mock; a real service would be async. */
export function getMockHouseholds(): Household[] {
  return MOCK_HOUSEHOLDS
}

export const RESIDENTIAL_NEEDS_BARANGAYS: readonly string[] = BARANGAYS

export function totalNeedScore(needs: NeedScores): number {
  return NEED_CATEGORY_ORDER.reduce((sum, category) => sum + needs[category], 0)
}

export function needPriorityOf(total: number): NeedPriority {
  return (
    NEED_PRIORITY_ORDER.find((band) => total >= NEED_PRIORITY_THRESHOLDS[band]) ?? 'low'
  )
}
