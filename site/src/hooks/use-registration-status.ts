import { useEffect, useState } from 'react'
import { fetchRegistrationStatus } from '../services/registration-status-service'
import type { RegistrationStatus } from '../types/registration-status'

export type RegistrationStatusState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; status: RegistrationStatus }

const MISSING_TOKEN =
  'This link is missing its status code. Open the "Check status" button from your registration email again.'

export function useRegistrationStatus(token: string | null): RegistrationStatusState {
  // Keyed by token so a new token reads as loading without a sync reset in the effect.
  const [loaded, setLoaded] = useState<{
    token: string
    state: RegistrationStatusState
  } | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    void fetchRegistrationStatus(token).then((result) => {
      if (cancelled) return
      setLoaded({
        token,
        state:
          result.success && result.data
            ? { phase: 'ready', status: result.data }
            : {
                phase: 'error',
                message: result.message ?? 'Unable to load this registration',
              },
      })
    })
    return () => {
      cancelled = true
    }
  }, [token])

  if (!token) return { phase: 'error', message: MISSING_TOKEN }
  if (loaded?.token !== token) return { phase: 'loading' }
  return loaded.state
}
