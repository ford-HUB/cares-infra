import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { OPEN_ASSISTANCE_STATUSES, type AssistanceFilter } from '../constants/assistance-requests'
import { useAssistanceRequestStore } from '../store/assistance-request-store'
import type { AssistanceDecision, AssistanceRequest } from '../types/assistance-request'

export type AssistanceNoteDecision = Extract<AssistanceDecision, 'approve' | 'decline'>

const SUCCESS_MESSAGES: Record<AssistanceDecision, (reference: string) => string> = {
  review: (reference) => `${reference} moved to review`,
  approve: (reference) => `${reference} approved`,
  decline: (reference) => `${reference} declined`,
  complete: (reference) => `${reference} marked as released`,
}

export function useAssistanceRequestReview() {
  const requests = useAssistanceRequestStore((s) => s.requests)
  const loading = useAssistanceRequestStore((s) => s.loading)
  const initialized = useAssistanceRequestStore((s) => s.initialized)
  const error = useAssistanceRequestStore((s) => s.error)
  const fetchRequests = useAssistanceRequestStore((s) => s.fetchRequests)
  const decide = useAssistanceRequestStore((s) => s.decide)

  const [filter, setFilter] = useState<AssistanceFilter>('open')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [noting, setNoting] = useState<{
    request: AssistanceRequest
    decision: AssistanceNoteDecision
  } | null>(null)

  useEffect(() => {
    void fetchRequests()
  }, [fetchRequests])

  const visible = useMemo(
    () =>
      requests.filter((request) => {
        const open = OPEN_ASSISTANCE_STATUSES.includes(request.status)
        return filter === 'all' || (filter === 'open') === open
      }),
    [requests, filter],
  )

  const awaitingCount = useMemo(
    () => requests.filter((request) => request.status === 'pending').length,
    [requests],
  )

  const run = async (request: AssistanceRequest, decision: AssistanceDecision, note?: string) => {
    setBusyId(request.id)
    try {
      await decide(request.id, decision, note)
      toast.success(SUCCESS_MESSAGES[decision](request.reference))
      return true
    } catch (error) {
      // Usually the beneficiary cancelled it meanwhile.
      toast.error(error instanceof Error ? error.message : 'The request could not be updated')
      return false
    } finally {
      setBusyId(null)
    }
  }

  const onDecide = (request: AssistanceRequest, decision: AssistanceDecision) => {
    if (decision === 'approve' || decision === 'decline') {
      setNoting({ request, decision })
      return
    }
    void run(request, decision)
  }

  // Modal stays open until settled so a failure keeps the typed note.
  const onConfirmNote = async (note: string) => {
    if (!noting) return
    const done = await run(noting.request, noting.decision, note)
    if (done) setNoting(null)
  }

  return {
    requests: visible,
    awaitingCount,
    showSkeleton: !initialized || (loading && requests.length === 0),
    error,
    retry: () => void fetchRequests(),
    filter,
    setFilter,
    busyId,
    onDecide,
    noting,
    onConfirmNote: (note: string) => void onConfirmNote(note),
    closeNote: () => setNoting(null),
  }
}
