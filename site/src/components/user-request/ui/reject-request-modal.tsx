import { useState, type FormEvent } from 'react'
import { Loader2, X, XCircle } from 'lucide-react'
import { REJECTION_REASON_MAX_LENGTH } from '../../../constants/user-requests'
import type { UserRequest } from '../../../types/user-request'

interface RejectRequestModalProps {
  request: UserRequest
  /** True while the reject call is in flight. */
  busy: boolean
  onConfirm: (reason: string) => void
  onClose: () => void
}

/**
 * Rejecting needs a reason before it can be confirmed — the beneficiary reads it in
 * the app, and it is what tells them what to fix before they apply again.
 */
export function RejectRequestModal({ request, busy, onConfirm, onClose }: RejectRequestModalProps) {
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)

  const trimmed = reason.trim()
  const missing = trimmed.length === 0

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (missing || busy) return
    onConfirm(trimmed)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-lg rounded-xl bg-white shadow-lg"
        aria-labelledby="reject-request-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-5">
          <div>
            <h3 id="reject-request-title" className="text-lg font-semibold text-gray-900">
              Reject {request.reference}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {request.submitter.name}
              {request.event && <> · {request.event.title}</>}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          <label htmlFor="rejection-reason" className="text-sm font-medium text-gray-900">
            Reason for rejection
          </label>
          <p className="mt-0.5 text-xs text-gray-500">
            The beneficiary sees this in the app and can apply again with a corrected document.
          </p>
          <textarea
            id="rejection-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            onBlur={() => setTouched(true)}
            maxLength={REJECTION_REASON_MAX_LENGTH}
            rows={4}
            autoFocus
            placeholder="e.g. The proof of residency is unreadable — please upload a clearer scan of your barangay certificate."
            aria-invalid={touched && missing}
            aria-describedby="rejection-reason-hint"
            className="mt-2 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[var(--cares-primary)] focus:ring-1 focus:ring-[var(--cares-primary)] focus:outline-none aria-[invalid=true]:border-red-400"
          />
          <div
            id="rejection-reason-hint"
            className="mt-1 flex justify-between gap-2 text-xs"
          >
            <span className="text-red-600">
              {touched && missing ? 'Enter a reason before rejecting.' : ''}
            </span>
            <span className="text-gray-400">
              {reason.length}/{REJECTION_REASON_MAX_LENGTH}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={missing || busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Confirm rejection
          </button>
        </div>
      </form>
    </div>
  )
}
