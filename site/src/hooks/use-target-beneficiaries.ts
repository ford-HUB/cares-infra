import { useEffect, useMemo } from 'react'
import { useAssistanceRequestStore } from '../store/assistance-request-store'
import type { AssistanceRequest } from '../types/assistance-request'

/** A beneficiary's assistance pin, as the event map draws it. */
export interface BeneficiaryPin {
  id: string
  lng: number
  lat: number
  label: string
}

/**
 * Approved assistance requests an event can be aimed at. Only approved ones qualify:
 * the desk has vetted the need, but nothing has been released for it yet.
 */
export function useTargetBeneficiaries(selectedIds: string[], enabled: boolean) {
  const requests = useAssistanceRequestStore((s) => s.requests)
  const loading = useAssistanceRequestStore((s) => s.loading)
  const initialized = useAssistanceRequestStore((s) => s.initialized)
  const error = useAssistanceRequestStore((s) => s.error)
  const fetchRequests = useAssistanceRequestStore((s) => s.fetchRequests)

  useEffect(() => {
    if (enabled && !initialized && !loading) void fetchRequests()
  }, [enabled, initialized, loading, fetchRequests])

  const approved = useMemo(
    () => requests.filter((request) => request.status === 'approved'),
    [requests],
  )

  const selected = useMemo(
    () => approved.filter((request) => selectedIds.includes(request.id)),
    [approved, selectedIds],
  )

  const pins = useMemo<BeneficiaryPin[]>(
    () => selected.flatMap((request) => toPin(request)),
    [selected],
  )

  return {
    approved,
    selected,
    pins,
    loading: loading || (enabled && !initialized),
    error,
    retry: () => void fetchRequests(),
  }
}

function toPin(request: AssistanceRequest): BeneficiaryPin[] {
  if (!request.location) return []
  return [
    {
      id: request.id,
      lng: request.location.longitude,
      lat: request.location.latitude,
      label: `${request.requester.name} · ${request.title}`,
    },
  ]
}
