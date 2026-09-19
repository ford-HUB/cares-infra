import { useCallback, useMemo, useState } from 'react'
import { CLUSTER_DEFAULT_SEED, CLUSTER_K_DEFAULT } from '../constants/residential-needs'
import type { Household } from '../types/residential-needs'
import { clusterHouseholds } from '../utils/needs-kmeans'

/**
 * Owns the two knobs the Clusters screen exposes — how many groups, and which random
 * start — and re-runs the mock k-means whenever either moves. The run is synchronous
 * on ~50 rows, so a `useMemo` is enough; a service-backed model would become a fetch.
 */
export function useNeedsClusters(households: Household[]) {
  const [k, setK] = useState(CLUSTER_K_DEFAULT)
  const [seed, setSeed] = useState(CLUSTER_DEFAULT_SEED)
  const [selected, setSelected] = useState<number | null>(null)

  const result = useMemo(
    () => clusterHouseholds(households, k, seed),
    [households, k, seed],
  )

  const changeK = useCallback((next: number) => {
    setK(next)
    setSelected(null)
  }, [])

  /** A new start can land the same households in different groups — that is the point. */
  const reseed = useCallback(() => {
    setSeed((current) => current + 1)
    setSelected(null)
  }, [])

  const toggleSelected = useCallback((index: number) => {
    setSelected((current) => (current === index ? null : index))
  }, [])

  return { k, seed, result, selected, changeK, reseed, toggleSelected }
}
