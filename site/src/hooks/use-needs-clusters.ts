import { useCallback, useEffect, useState } from 'react'
import { useNeedsClustersStore } from '../store/needs-clusters-store'
import type { Household } from '../types/residential-needs'

/**
 * Owns the two knobs the Clusters screen exposes — how many groups, and which random
 * start — and asks decision-service (through the server) for a fresh grouping
 * whenever either moves, plus which cluster card is selected.
 */
export function useNeedsClusters(households: Household[]) {
  const k = useNeedsClustersStore((s) => s.k)
  const seed = useNeedsClustersStore((s) => s.seed)
  const result = useNeedsClustersStore((s) => s.result)
  const loading = useNeedsClustersStore((s) => s.loading)
  const error = useNeedsClustersStore((s) => s.error)
  const fetchClusters = useNeedsClustersStore((s) => s.fetchClusters)
  const setK = useNeedsClustersStore((s) => s.setK)
  const reseedStore = useNeedsClustersStore((s) => s.reseed)

  const [selected, setSelected] = useState<number | null>(null)

  useEffect(() => {
    void fetchClusters(households)
  }, [households, fetchClusters])

  const changeK = useCallback(
    (next: number) => {
      setSelected(null)
      void setK(households, next)
    },
    [households, setK],
  )

  /** A new start can land the same households in different groups — that is the point. */
  const reseed = useCallback(() => {
    setSelected(null)
    void reseedStore(households)
  }, [households, reseedStore])

  const toggleSelected = useCallback((index: number) => {
    setSelected((current) => (current === index ? null : index))
  }, [])

  return { k, seed, result, loading, error, selected, changeK, reseed, toggleSelected }
}
