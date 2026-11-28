import { useCallback, useEffect, useState } from 'react'
import { useNeedsClustersStore } from '../store/needs-clusters-store'
import type { Household } from '../types/residential-needs'

/** New `households` (a survey came in) re-runs the server clustering. */
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
    void fetchClusters()
  }, [households, fetchClusters])

  const changeK = useCallback(
    (next: number) => {
      setSelected(null)
      void setK(next)
    },
    [setK],
  )

  const reseed = useCallback(() => {
    setSelected(null)
    void reseedStore()
  }, [reseedStore])

  const toggleSelected = useCallback((index: number) => {
    setSelected((current) => (current === index ? null : index))
  }, [])

  return { k, seed, result, loading, error, selected, changeK, reseed, toggleSelected }
}
