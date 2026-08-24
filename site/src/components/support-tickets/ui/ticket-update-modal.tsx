import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  TICKET_STATUS_HINTS,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_ORDER,
} from '../../../constants/support-tickets'
import type { SupportTicket, SupportTicketStatus } from '../../../types/support-ticket'

interface TicketUpdateModalProps {
  ticket: SupportTicket | null
  saving: boolean
  onClose: () => void
  onSubmit: (status: SupportTicketStatus, note: string) => void
}

/**
 * Where a ticket's state actually changes: pick the new status — close it, hand it
 * back for client verification, or park it on client feedback — and optionally post
 * a note explaining the move to the requester.
 */
export function TicketUpdateModal({
  ticket,
  saving,
  onClose,
  onSubmit,
}: TicketUpdateModalProps) {
  // The parent keys this component by ticket id, so the draft starts fresh per ticket.
  const [status, setStatus] = useState<SupportTicketStatus>(ticket?.status ?? 'open')
  const [note, setNote] = useState('')

  if (!ticket) return null

  const unchanged = status === ticket.status && note.trim().length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-label={`Update ${ticket.reference}`}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
      >
        <h3 className="text-lg font-semibold text-gray-900">Update ticket</h3>
        <p className="mt-1 text-sm text-gray-600">
          <span className="font-mono font-medium">{ticket.reference}</span> —{' '}
          {ticket.subject}
        </p>

        <label
          className="mt-4 block text-sm font-medium text-gray-700"
          htmlFor="ticket-update-status"
        >
          Status
        </label>
        <select
          id="ticket-update-status"
          value={status}
          onChange={(event) => setStatus(event.target.value as SupportTicketStatus)}
          className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
        >
          {TICKET_STATUS_ORDER.map((option) => (
            <option key={option} value={option}>
              {TICKET_STATUS_LABELS[option]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[12px] text-gray-500">{TICKET_STATUS_HINTS[status]}</p>

        <label
          className="mt-4 block text-sm font-medium text-gray-700"
          htmlFor="ticket-update-note"
        >
          Note <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          id="ticket-update-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          placeholder="Posted to the conversation so the requester sees why it moved."
          className="mt-1 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
        />

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(status, note.trim())}
            disabled={saving || unchanged}
            className="flex items-center gap-2 rounded-lg bg-[var(--cares-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save update
          </button>
        </div>
      </div>
    </div>
  )
}
