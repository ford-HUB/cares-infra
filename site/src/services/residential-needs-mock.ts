import {
  CLUSTER_NEED_CATEGORIES,
  NEED_PRIORITY_ORDER,
  NEED_PRIORITY_THRESHOLDS,
} from '../constants/residential-needs'
import type {
  CommunityProblem,
  Household,
  HouseholdSurvey,
  NeedBarrier,
  NeedCategory,
  NeedPriority,
  NeedSeriousness,
} from '../types/residential-needs'
import { seededRandom } from '../utils/seeded-random'

/**
 * MOCK DATA — the survey is not in the database yet. Each row stands in for one
 * Beneficiary Needs Assessment answered on the mobile app. Households below are
 * generated once from a fixed seed so the screens are stable between reloads; swap
 * `getMockHouseholds` for a real fetch when the survey endpoint exists. The Clusters
 * screen already sends these rows to the server for the K-Means grouping.
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

const OTHER_NEEDS = ['House repair', 'Clean water', 'Electricity', 'Transportation']
const OTHER_BARRIERS = ['Caring for a sick relative', 'No one to leave the children with']
const OTHER_COMMUNITY_PROBLEMS = ['Flooding', 'Waste collection', 'Street safety']

const CONCERNS = [
  'Our area floods during the rainy season and the nearest health center is far.',
  'One senior in the household needs maintenance medication every month.',
  'Two of the children may stop schooling next year if we cannot cover the fees.',
  'The main earner lost work when the shop closed; we are looking for any livelihood.',
  'The roof leaks badly whenever it rains.',
  'We would like to know about scholarship programs for the eldest child.',
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
  /** Chance each Q1 category is ticked. */
  needs: Record<Exclude<NeedCategory, 'other'>, number>
  /** Chance the "Other" need is ticked, with free text drawn from `OTHER_NEEDS`. */
  otherNeed: number
  seriousness: [NeedSeriousness, NeedSeriousness]
  /** Chance each Q3 barrier is ticked; "none" wins outright when it is drawn. */
  barriers: Record<Exclude<NeedBarrier, 'none'>, number>
  noDifficulty: number
  /** Relative weight of each Q4 answer. */
  communityProblem: Record<CommunityProblem, number>
  /** Chance a Q5 concern was written. */
  concern: number
}

/** Share of an archetype's rows that land in one of its home barangays. */
const HOME_BARANGAY_SHARE = 0.8

const ARCHETYPES: Archetype[] = [
  {
    weight: 0.35,
    members: [5, 9],
    homeBarangays: ['Looc'],
    needs: { food: 0.9, healthcare: 0.75, education: 0.7, livelihood: 0.6, financial: 0.85 },
    otherNeed: 0.3,
    seriousness: [4, 5],
    barriers: { money: 0.95, services: 0.5, distance: 0.55, information: 0.3, documents: 0.4, opportunities: 0.5, other: 0.1 },
    noDifficulty: 0,
    communityProblem: { food: 3, healthcare: 3, education: 1, livelihood: 2, financial: 2, environmental: 4, other: 1 },
    concern: 0.7,
  },
  {
    weight: 0.4,
    members: [3, 6],
    homeBarangays: ['Umapad'],
    needs: { food: 0.65, healthcare: 0.3, education: 0.45, livelihood: 0.9, financial: 0.5 },
    otherNeed: 0.1,
    seriousness: [3, 4],
    barriers: { money: 0.7, services: 0.2, distance: 0.2, information: 0.45, documents: 0.35, opportunities: 0.85, other: 0.05 },
    noDifficulty: 0,
    communityProblem: { food: 2, healthcare: 1, education: 2, livelihood: 5, financial: 3, environmental: 1, other: 1 },
    concern: 0.5,
  },
  {
    weight: 0.25,
    members: [2, 4],
    homeBarangays: ['Opao'],
    needs: { food: 0.15, healthcare: 0.45, education: 0.3, livelihood: 0.15, financial: 0.2 },
    otherNeed: 0.1,
    seriousness: [1, 3],
    barriers: { money: 0.3, services: 0.25, distance: 0.15, information: 0.3, documents: 0.15, opportunities: 0.15, other: 0.05 },
    noDifficulty: 0.35,
    communityProblem: { food: 1, healthcare: 3, education: 2, livelihood: 1, financial: 1, environmental: 3, other: 1 },
    concern: 0.3,
  },
]

const HOUSEHOLD_COUNT = 48

function buildHouseholds(): Household[] {
  const rand = seededRandom(20260919)
  const between = (lo: number, hi: number) => lo + rand() * (hi - lo)
  const intBetween = (lo: number, hi: number) => Math.round(between(lo, hi))
  const chance = (p: number) => rand() < p
  const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)]
  const weighted = <T extends string>(weights: Record<T, number>): T => {
    const entries = Object.entries(weights) as [T, number][]
    const total = entries.reduce((sum, [, w]) => sum + w, 0)
    let roll = rand() * total
    for (const [key, w] of entries) {
      roll -= w
      if (roll <= 0) return key
    }
    return entries[entries.length - 1][0]
  }
  const pickArchetype = () => weighted(
    Object.fromEntries(ARCHETYPES.map((one, i) => [String(i), one.weight])),
  )

  const buildSurvey = (archetype: Archetype): HouseholdSurvey => {
    const needs: NeedCategory[] = CLUSTER_NEED_CATEGORIES.filter((c) => chance(archetype.needs[c]))
    const otherNeed = chance(archetype.otherNeed) ? pick(OTHER_NEEDS) : undefined
    if (otherNeed) needs.push('other')
    // Every survey ticks at least one need — the form does not submit otherwise.
    if (needs.length === 0) needs.push(weighted(archetype.needs))

    const seriousness = intBetween(...archetype.seriousness) as NeedSeriousness

    let barriers: NeedBarrier[]
    let otherBarrier: string | undefined
    if (chance(archetype.noDifficulty)) {
      barriers = ['none']
    } else {
      barriers = (Object.keys(archetype.barriers) as Exclude<NeedBarrier, 'none'>[]).filter(
        (b) => chance(archetype.barriers[b]),
      )
      if (barriers.includes('other')) otherBarrier = pick(OTHER_BARRIERS)
      if (barriers.length === 0) barriers = [weighted(archetype.barriers)]
    }

    const communityProblem = weighted(archetype.communityProblem)
    const otherCommunityProblem =
      communityProblem === 'other' ? pick(OTHER_COMMUNITY_PROBLEMS) : undefined

    return {
      needs,
      otherNeed,
      seriousness,
      barriers,
      otherBarrier,
      communityProblem,
      otherCommunityProblem,
      concern: chance(archetype.concern) ? pick(CONCERNS) : undefined,
    }
  }

  return Array.from({ length: HOUSEHOLD_COUNT }, (_, i) => {
    const archetype = ARCHETYPES[Number(pickArchetype())]
    const survey = buildSurvey(archetype)

    const pool =
      rand() < HOME_BARANGAY_SHARE
        ? archetype.homeBarangays
        : BARANGAYS.filter((b) => !archetype.homeBarangays.includes(b))
    const barangay = pick(pool)

    const daysAgo = intBetween(2, 75)
    const surveyedAt = new Date(Date.UTC(2026, 8, 19) - daysAgo * 86_400_000).toISOString()

    return {
      id: `hh-${String(i + 1).padStart(3, '0')}`,
      familyName: FAMILY_NAMES[i % FAMILY_NAMES.length],
      barangay,
      members: intBetween(...archetype.members),
      survey,
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

/** Priority band for a Q2 answer. */
export function needPriorityOf(seriousness: number): NeedPriority {
  return (
    NEED_PRIORITY_ORDER.find((band) => seriousness >= NEED_PRIORITY_THRESHOLDS[band]) ?? 'low'
  )
}

/** The band a household lands in — read straight off how serious it rated its need. */
export function householdPriority(household: Household): NeedPriority {
  return needPriorityOf(household.survey.seriousness)
}
