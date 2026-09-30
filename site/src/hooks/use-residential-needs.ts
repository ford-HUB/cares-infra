import { useEffect } from 'react'
import { subscribeToResidentialNeeds } from '../services/residential-needs-socket'
import { useResidentialNeedsStore } from '../store/residential-needs-store'

/**
 * The submitted surveys, kept current: fetched when a screen opens, and again
 * whenever the server announces a new or updated survey — or the tab comes back
 * into focus, in case an announcement was missed while the socket was down.
 */
export function useResidentialNeeds() {
  const households = useResidentialNeedsStore((s) => s.households)
  const loaded = useResidentialNeedsStore((s) => s.loaded)
  const loading = useResidentialNeedsStore((s) => s.loading)
  const error = useResidentialNeedsStore((s) => s.error)
  const reload = useResidentialNeedsStore((s) => s.fetchHouseholds)

  useEffect(() => {
    void reload()
    const refresh = () => void reload()
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    const unsubscribe = subscribeToResidentialNeeds(refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      unsubscribe()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [reload])

  return { households, loaded, loading, error, reload }
}
