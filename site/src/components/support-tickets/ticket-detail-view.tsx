import { useState, type ReactNode } from 'react'
import { Inbox, Loader2, PencilLine, Send } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelativeTime, formatTimestamp } from '../../constants/formatting'
import type { SupportTicket } from '../../types/support-ticket'
import { UserAvatar } from '../portal/ui/user-avatar'
import { TicketPriorityBadge } from './ui/ticket-priority-badge'
import { TicketStatusBadge } from './ui/ticket-status-badge'
import { TicketTypeBadge } from './ui/ticket-type-badge'

interface TicketDetailViewProps {
  ticket: SupportTicket | null
  /** False until the first fetch settles — see `support-ticket-store`. */
  initialized: boolean
  /** True while a status change, assignment, or reply is in flight. */
  saving: boolean
  /** Opens the update dialog, where status and an optional note are set. */
  onUpdate: () => void
  onAssignToMe: () => void
  onReply: (body: string) => void
}

const shell =
  'flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'

function Meta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <span className="block text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
        {label}
      </span>
      <span className="block truncate text-[12px] text-gray-800">{value}</span>
    </div>
  )
}

/** Splits "Marites Delgado" into the two parts `UserAvatar` expects. */
function nameParts(fullName: string) {
  const [first = '', ...rest] = fullName.trim().split(/\s+/)
  return { firstName: first, lastName: rest.at(-1) ?? '' }
}

/**
 * Fills the right-hand column. Condensed on purpose — the whole ticket has to fit
 * beside the list without the page itself scrolling, so only the conversation does.
 */
export function TicketDetailView({
  ticket,
  initialized,
  saving,
  onUpdate,
  onAssignToMe,
  onReply,
}: TicketDetailViewProps) {
  const [draft, setDraft] = useState('')

  // A different ticket opened — drop the half-typed reply so it cannot be posted
  // against the wrong thread.
  const [draftTicketId, setDraftTicketId] = useState(ticket?.id)
  if (draftTicketId !== ticket?.id) {
    setDraftTicketId(ticket?.id)
    setDraft('')
  }

  if (!initialized) {
    return (
      <section className={shell} aria-busy>
        <div className="space-y-3 border-b border-gray-200 px-4 py-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-5 w-40 rounded-full" />
        </div>
        <div className="flex-1 space-y-3 px-4 py-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/6" />
        </div>
      </section>
    )
  }

  if (!ticket) {
    return (
      <section className={`${shell} items-center justify-center text-center`}>
        <Inbox className="h-8 w-8 text-gray-300" />
        <p className="mt-2 text-[13px] text-gray-500">
          Select a ticket to see the full report.
        </p>
      </section>
    )
  }

  const { firstName, lastName } = nameParts(ticket.requester.name)

  const submitReply = () => {
    const body = draft.trim()
    if (!body || saving) return
    onReply(body)
    setDraft('')
  }

  return (
    <section className={shell}>
      <header className="shrink-0 border-b border-gray-200 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[12px] font-semibold text-gray-500">
            {ticket.reference}
          </span>
          <TicketStatusBadge status={ticket.status} />
          <TicketPriorityBadge priority={ticket.priority} />
          <TicketTypeBadge type={ticket.type} />
        </div>
        <h2 className="mt-1.5 text-[15px] leading-snug font-semibold break-words text-gray-900">
          {ticket.subject}
        </h2>

        <div className="mt-2.5 flex items-center gap-2.5 border-t border-gray-100 pt-2.5">
          <UserAvatar firstName={firstName} lastName={lastName} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-gray-900">
              {ticket.requester.name}
              <span className="ml-1.5 font-normal text-gray-400 capitalize">
                {ticket.requester.role}
              </span>
            </p>
            <p className="truncate text-[11px] text-gray-500">{ticket.requester.email}</p>
          </div>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-gray-100 pt-2.5 sm:grid-cols-4">
          <Meta label="Assigned to" value={ticket.assignee ?? 'Unassigned'} />
          <Meta label="Source" value={ticket.source} />
          <Meta label="Opened" value={formatTimestamp(ticket.createdAt)} />
          <Meta label="Last update" value={formatRelativeTime(ticket.updatedAt)} />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <h3 className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
          Description
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed whitespace-pre-line text-gray-700">
          {ticket.description}
        </p>

        <h3 className="mt-4 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
          Conversation ({ticket.replies.length})
        </h3>
        {ticket.replies.length === 0 ? (
          <p className="mt-1.5 text-[13px] text-gray-500">
            No replies yet. The requester has not been contacted about this ticket.
          </p>
        ) : (
          <ul className="mt-1.5 space-y-2.5">
            {ticket.replies.map((reply) => (
              <li
                key={reply.id}
                className={`rounded-lg px-3 py-2 ${
                  reply.authorType === 'staff'
                    ? 'bg-green-50/70'
                    : 'bg-gray-50 ring-1 ring-gray-100 ring-inset'
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[12px] font-semibold text-gray-900">
                    {reply.author}
                  </span>
                  <span className="shrink-0 text-[11px] text-gray-400">
                    {formatRelativeTime(reply.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-gray-700">
                  {reply.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="shrink-0 space-y-2.5 border-t border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onUpdate}
            disabled={saving}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-[12px] font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60"
          >
            <PencilLine className="h-3.5 w-3.5" />
            Update status
          </button>

          <button
            type="button"
            onClick={onAssignToMe}
            disabled={saving}
            className="ml-auto h-8 rounded-lg border border-gray-200 bg-white px-2.5 text-[12px] text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60"
          >
            Assign to me
          </button>
        </div>

        <div className="flex items-end gap-2.5">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={2}
            placeholder={`Reply to ${ticket.requester.name}…`}
            className="h-14 min-h-14 flex-1 resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
          />
          <button
            type="button"
            onClick={submitReply}
            disabled={saving || draft.trim().length === 0}
            className="flex h-8 items-center gap-2 rounded-lg bg-[var(--cares-primary)] px-3 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Send
          </button>
        </div>
      </footer>
    </section>
  )
}
