import { MapPin, Search, Users, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  ASSISTANCE_CATEGORY_LABELS,
  ASSISTANCE_URGENCY_LABELS,
  ASSISTANCE_URGENCY_STYLES,
} from '../../../constants/assistance-requests'
import type { AssistanceRequest } from '../../../types/assistance-request'

interface TargetBeneficiaryModalProps {
  isOpen: boolean
  requests: AssistanceRequest[]
  loading: boolean
  error: string | null
  /** Ids already targeted when the modal opens. */
  initialSelected: string[]
  /** Max beneficiaries set on the event; undefined leaves the pick uncapped. */
  limit?: number
  onRetry: () => void
  onCancel: () => void
  onConfirm: (ids: string[]) => void
}

/**
 * Picks which approved assistance requests the event is aimed at. Each confirmed
 * pick is pinned on the event map so the director can place the event near them.
 */
export function TargetBeneficiaryModal({
  isOpen,
  ...props
}: TargetBeneficiaryModalProps) {
  if (!isOpen) return null
  // Mounted fresh on every open, so the draft always starts from the saved pick.
  return <TargetBeneficiaryDialog {...props} />
}

function TargetBeneficiaryDialog({
  requests,
  loading,
  error,
  initialSelected,
  limit,
  onRetry,
  onCancel,
  onConfirm,
}: Omit<TargetBeneficiaryModalProps, 'isOpen'>) {
  const [draft, setDraft] = useState<string[]>(initialSelected)
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return requests
    return requests.filter((request) =>
      [
        request.requester.name,
        request.reference,
        request.title,
        request.requester.barangay ?? '',
        request.location?.details ?? '',
      ].some((value) => value.toLowerCase().includes(term)),
    )
  }, [query, requests])

  const atLimit = limit !== undefined && draft.length >= limit

  const toggle = (id: string) =>
    setDraft((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : atLimit
          ? current
          : [...current, id],
    )

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-lg">
        <div className="flex items-start justify-between gap-4 border-b p-6 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Target beneficiaries</h3>
            <p className="mt-1 text-sm text-gray-500">
              Approved assistance requests this event will serve. Their pinned locations show
              on the event map.
            </p>
          </div>
          <button type="button" onClick={onCancel} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="border-b px-6 py-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, reference, need, or barangay"
              className="w-full rounded-lg border border-gray-300 py-2 pr-3 pl-9 text-sm focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
            />
          </div>
        </div>

        <div className="scrollbar-hide flex-1 overflow-y-auto px-6 py-3">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {error}{' '}
              <button type="button" onClick={onRetry} className="font-medium underline">
                Try again
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-gray-500">
              <Users className="h-6 w-6 text-gray-400" />
              {requests.length === 0
                ? 'No approved assistance requests right now.'
                : 'No approved requests match your search.'}
            </div>
          ) : (
            <ul className="space-y-2">
              {visible.map((request) => {
                const checked = draft.includes(request.id)
                const disabled = !checked && atLimit
                return (
                  <li key={request.id}>
                    <label
                      className={`flex items-start gap-3 rounded-lg border-2 p-3 ${
                        checked
                          ? 'border-[var(--cares-primary)] bg-green-50'
                          : 'border-gray-200 bg-white'
                      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggle(request.id)}
                        className="mt-1 rounded"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {request.requester.name}
                          </span>
                          <span className="text-xs text-gray-400">{request.reference}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ASSISTANCE_URGENCY_STYLES[request.urgency]}`}
                          >
                            {ASSISTANCE_URGENCY_LABELS[request.urgency]}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-sm text-gray-700">
                          {ASSISTANCE_CATEGORY_LABELS[request.category]} · {request.title}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {request.location
                            ? (request.location.details ??
                              request.requester.barangay ??
                              'Pinned location')
                            : 'No pinned location'}
                          <span className="text-gray-300">·</span>
                          Household of {request.householdSize}
                        </p>
                      </div>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t p-6 pt-4">
          <span className="text-sm text-gray-500">
            {draft.length} selected{limit !== undefined && ` of ${limit} max`}
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(draft)}
              className="rounded-lg bg-[var(--cares-primary)] px-4 py-2 text-white hover:bg-[var(--cares-primary-hover)]"
            >
              Confirm selection
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
