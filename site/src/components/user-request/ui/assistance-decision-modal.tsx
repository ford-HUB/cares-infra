import { useState, type FormEvent } from 'react'
import { Check, Loader2, X, XCircle } from 'lucide-react'
import { ASSISTANCE_NOTE_MAX_LENGTH } from '../../../constants/assistance-requests'
import type { AssistanceNoteDecision } from '../../../hooks/use-assistance-request-review'
import type { AssistanceRequest } from '../../../types/assistance-request'

interface AssistanceDecisionModalProps {
  request: AssistanceRequest
  decision: AssistanceNoteDecision
  /** True while the call is in flight. */
  busy: boolean
  onConfirm: (note: string) => void
  onClose: () => void
}

const COPY: Record<
  AssistanceNoteDecision,
  {
    title: string
    label: string
    placeholder: string
    confirm: string
    required: boolean
  }
> = {
  approve: {
    title: 'Approve',
    label: 'Note to the beneficiary (optional)',
    placeholder: 'e.g. Claim your food pack at the barangay hall on Friday, 9 AM.',
    confirm: 'Approve request',
    required: false,
  },
  decline: {
    title: 'Decline',
    label: 'Reason for declining',
    placeholder: 'The beneficiary reads this in the app.',
    confirm: 'Decline request',
    required: true,
  },
}

/** Approving may say when and where to claim; declining must say why. */
export function AssistanceDecisionModal({
  request,
  decision,
  busy,
  onConfirm,
  onClose,
}: AssistanceDecisionModalProps) {
  const copy = COPY[decision]
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)

  const trimmed = note.trim()
  const missing = copy.required && trimmed.length === 0

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
        aria-labelledby="assistance-decision-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-5">
          <div>
            <h3 id="assistance-decision-title" className="text-lg font-semibold text-gray-900">
              {copy.title} {request.reference}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {request.requester.name} · {request.title}
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
          <label htmlFor="assistance-decision-note" className="text-sm font-medium text-gray-800">
            {copy.label}
          </label>
          <textarea
            id="assistance-decision-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onBlur={() => setTouched(true)}
            maxLength={ASSISTANCE_NOTE_MAX_LENGTH}
            rows={4}
            autoFocus
            placeholder={copy.placeholder}
            className="mt-2 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-[var(--cares-primary)] focus:outline-none"
          />
          <div className="mt-1 flex justify-between text-xs">
            <span className="text-red-600">
              {touched && missing ? 'A reason is required.' : ''}
            </span>
            <span className="text-gray-400">
              {note.length}/{ASSISTANCE_NOTE_MAX_LENGTH}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 ${
              decision === 'decline' ? 'bg-red-600' : 'bg-[var(--cares-primary)]'
            }`}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : decision === 'decline' ? (
              <XCircle className="h-4 w-4" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {copy.confirm}
          </button>
        </div>
      </form>
    </div>
  )
}
