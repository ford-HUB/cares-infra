import {
  CLUSTER_MAX_ITERATIONS,
  NEED_CATEGORY_ORDER,
  NEEDS_FEATURE_ORDER,
} from '../constants/residential-needs'
import { needPriorityOf } from '../services/residential-needs-mock'
import type {
  Household,
  NeedCategory,
  NeedsCluster,
  NeedsClusteringResult,
  NeedsFeatureKey,
} from '../types/residential-needs'
import { seededRandom } from './seeded-random'

/**
 * Mock k-means over the household survey — plain Lloyd's algorithm with k-means++
 * seeding, run in the browser on the mock rows. It is here so the Clusters screen
 * has something real to draw; the production model will live in a microservice and
 * this file's only job then is to shape its response into `NeedsClusteringResult`.
 */

function isNeedCategory(key: NeedsFeatureKey): key is NeedCategory {
  return (NEED_CATEGORY_ORDER as string[]).includes(key)
}

/** One survey measure by feature key — need scores live under `needs`, the rest at the top level. */
export function featureValue(household: Household, key: NeedsFeatureKey): number {
  return isNeedCategory(key) ? household.needs[key] : household[key]
}

function featureVector(household: Household): number[] {
  return NEEDS_FEATURE_ORDER.map((key) => featureValue(household, key))
}

/** Z-score each column so household size cannot swamp a need score (0–5). */
function standardise(rows: number[][]): number[][] {
  const dims = rows[0]?.length ?? 0
  const mean = Array.from({ length: dims }, (_, d) =>
    rows.reduce((sum, row) => sum + row[d], 0) / rows.length,
  )
  const std = Array.from({ length: dims }, (_, d) => {
    const variance = rows.reduce((sum, row) => sum + (row[d] - mean[d]) ** 2, 0) / rows.length
    return Math.sqrt(variance) || 1
  })
  return rows.map((row) => row.map((value, d) => (value - mean[d]) / std[d]))
}

function squaredDistance(a: number[], b: number[]): number {
  let sum = 0
  for (let d = 0; d < a.length; d += 1) sum += (a[d] - b[d]) ** 2
  return sum
}

/** k-means++: each next centre is drawn with probability proportional to D². */
function seedCentroids(points: number[][], k: number, rand: () => number): number[][] {
  const centroids = [points[Math.floor(rand() * points.length)]]
  while (centroids.length < k) {
    const weights = points.map((p) =>
      Math.min(...centroids.map((c) => squaredDistance(p, c))),
    )
    const total = weights.reduce((sum, w) => sum + w, 0)
    let roll = rand() * total
    let chosen = points.length - 1
    for (let i = 0; i < points.length; i += 1) {
      roll -= weights[i]
      if (roll <= 0) {
        chosen = i
        break
      }
    }
    centroids.push(points[chosen])
  }
  return centroids
}

export function clusterHouseholds(
  households: Household[],
  k: number,
  seed: number,
): NeedsClusteringResult {
  const empty: NeedsClusteringResult = {
    k,
    clusters: [],
    assignments: {},
    inertia: 0,
    iterations: 0,
    converged: true,
    seed,
  }
  if (households.length === 0 || k < 1) return empty

  const effectiveK = Math.min(k, households.length)
  const rand = seededRandom(seed)
  const raw = households.map(featureVector)
  const scaled = standardise(raw)

  let centroids = seedCentroids(scaled, effectiveK, rand)
  let assignment = new Array<number>(scaled.length).fill(-1)
  let iterations = 0
  let converged = false

  while (iterations < CLUSTER_MAX_ITERATIONS) {
    iterations += 1
    const next = scaled.map((p) => {
      let best = 0
      let bestDistance = Infinity
      centroids.forEach((c, index) => {
        const distance = squaredDistance(p, c)
        if (distance < bestDistance) {
          bestDistance = distance
          best = index
        }
      })
      return best
    })

    const changed = next.some((value, i) => value !== assignment[i])
    assignment = next
    if (!changed) {
      converged = true
      break
    }

    centroids = centroids.map((current, index) => {
      const members = scaled.filter((_, i) => assignment[i] === index)
      if (members.length === 0) return current
      return current.map(
        (_, d) => members.reduce((sum, p) => sum + p[d], 0) / members.length,
      )
    })
  }

  const inertia = scaled.reduce(
    (sum, p, i) => sum + squaredDistance(p, centroids[assignment[i]]),
    0,
  )

  const clusters: NeedsCluster[] = Array.from({ length: effectiveK }, (_, index) => {
    const memberIndexes = assignment.flatMap((value, i) => (value === index ? [i] : []))
    const centroid = Object.fromEntries(
      NEEDS_FEATURE_ORDER.map((key, d) => [
        key,
        memberIndexes.length
          ? memberIndexes.reduce((sum, i) => sum + raw[i][d], 0) / memberIndexes.length
          : 0,
      ]),
    ) as Record<NeedsFeatureKey, number>

    const dominantNeed = NEED_CATEGORY_ORDER.reduce((top, category) =>
      centroid[category] > centroid[top] ? category : top,
    )
    const total = NEED_CATEGORY_ORDER.reduce((sum, category) => sum + centroid[category], 0)

    const countByBarangay = new Map<string, number>()
    memberIndexes.forEach((i) => {
      const { barangay } = households[i]
      countByBarangay.set(barangay, (countByBarangay.get(barangay) ?? 0) + 1)
    })
    // The barangay holding the most members is where the group concentrates.
    const [topName, topCount] = [...countByBarangay.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0] ?? ['—', 0]
    const barangay = {
      name: topName,
      count: topCount,
      share: memberIndexes.length ? topCount / memberIndexes.length : 0,
    }

    return {
      index,
      householdIds: memberIndexes.map((i) => households[i].id),
      centroid,
      dominantNeed,
      priority: needPriorityOf(total),
      barangay,
    }
  })

  return {
    k: effectiveK,
    clusters,
    assignments: Object.fromEntries(households.map((h, i) => [h.id, assignment[i]])),
    inertia,
    iterations,
    converged,
    seed,
  }
}
