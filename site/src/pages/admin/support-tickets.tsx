import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ContentShell } from '../../components/portal/ui/content-shell'
import { SupportTicketsList } from '../../components/support-tickets/support-tickets-list'
import { SupportTicketsToolbar } from '../../components/support-tickets/support-tickets-toolbar'
import { TicketDetailView } from '../../components/support-tickets/ticket-detail-view'
import { TicketPriorityBoard } from '../../components/support-tickets/ui/ticket-priority-board'
import { TicketUpdateModal } from '../../components/support-tickets/ui/ticket-update-modal'
import {
  TICKET_PRIORITY_FILTER_ALL,
  TICKET_PRIORITY_ORDER,
  TICKET_PRIORITY_RANK,
  TICKET_STATUS_FILTER_ALL,
  TICKET_STATUS_LABELS,
  TICKET_TYPE_FILTER_ALL,
  TICKET_UNRESOLVED_STATUSES,
  type TicketPriorityFilter,
  type TicketStatusFilter,
  type TicketTypeFilter,
} from '../../constants/support-tickets'
import { useAuthStore } from '../../store/auth-store'
import { useSupportTicketStore } from '../../store/support-ticket-store'
import type {
  SupportTicketBucketCount,
  SupportTicketStatus,
  SupportTicketSummary,
} from '../../types/support-ticket'

export function SupportTicketsPage() {
  const tickets = useSupportTicketStore((s) => s.tickets)
  const loading = useSupportTicketStore((s) => s.loading)
  const initialized = useSupportTicketStore((s) => s.initialized)
  const error = useSupportTicketStore((s) => s.error)
  const fetchTickets = useSupportTicketStore((s) => s.fetchTickets)
  const updateTicket = useSupportTicketStore((s) => s.update)
  const assign = useSupportTicketStore((s) => s.assign)
  const reply = useSupportTicketStore((s) => s.reply)

  const user = useAuthStore((s) => s.user)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TicketStatusFilter>(
    TICKET_STATUS_FILTER_ALL,
  )
  const [typeFilter, setTypeFilter] = useState<TicketTypeFilter>(TICKET_TYPE_FILTER_ALL)
  const [priorityFilter, setPriorityFilter] = useState<TicketPriorityFilter>(
    TICKET_PRIORITY_FILTER_ALL,
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [updateOpen, setUpdateOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void fetchTickets()
  }, [fetchTickets])

  const summary = useMemo<SupportTicketSummary>(
    () => ({
      total: tickets.length,
      open: tickets.filter((ticket) => ticket.status === 'open').length,
      inProgress: tickets.filter((ticket) => ticket.status === 'in_progress').length,
      resolved: tickets.filter((ticket) => ticket.status === 'resolved').length,
    }),
    [tickets],
  )

  // Counted over every ticket, not the filtered view — the board is the overview the
  // filters act on, so its numbers must not move when a filter is applied.
  const buckets = useMemo<SupportTicketBucketCount[]>(
    () =>
      TICKET_PRIORITY_ORDER.map((priority) => {
        const inBucket = tickets.filter((ticket) => ticket.priority === priority)
        return {
          priority,
          total: inBucket.length,
          unresolved: inBucket.filter((ticket) =>
            TICKET_UNRESOLVED_STATUSES.includes(ticket.status),
          ).length,
        }
      }),
    [tickets],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    return tickets
      .filter((ticket) => {
        const matchesSearch =
          !term ||
          ticket.reference.toLowerCase().includes(term) ||
          ticket.subject.toLowerCase().includes(term) ||
          ticket.requester.name.toLowerCase().includes(term) ||
          ticket.requester.email.toLowerCase().includes(term)
        const matchesStatus =
          statusFilter === TICKET_STATUS_FILTER_ALL || ticket.status === statusFilter
        const matchesType =
          typeFilter === TICKET_TYPE_FILTER_ALL || ticket.type === typeFilter
        const matchesPriority =
          priorityFilter === TICKET_PRIORITY_FILTER_ALL ||
          ticket.priority === priorityFilter
        return matchesSearch && matchesStatus && matchesType && matchesPriority
      })
      .sort((a, b) => {
        // Triage order: issues first, then whatever moved most recently.
        const byPriority =
          TICKET_PRIORITY_RANK[a.priority] - TICKET_PRIORITY_RANK[b.priority]
        if (byPriority !== 0) return byPriority
        return b.updatedAt.localeCompare(a.updatedAt)
      })
  }, [tickets, search, statusFilter, typeFilter, priorityFilter])

  // Read from the store rather than holding a copy, so the detail view reflects a
  // reply or status change the moment it lands. Falling back to the first row keeps
  // the right column filled — including after a filter hides the previous selection.
  const selected =
    filtered.find((ticket) => ticket.id === selectedId) ?? filtered[0] ?? null

  const runMutation = async (action: () => Promise<void>, message: string) => {
    setSaving(true)
    try {
      await action()
      toast.success(message)
    } catch {
      toast.error('The request could not be completed')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = (status: SupportTicketStatus, note: string) => {
    if (!selected) return
    void runMutation(
      () => updateTicket(selected.id, { status, note }),
      `${selected.reference} marked ${TICKET_STATUS_LABELS[status]}`,
    ).then(() => setUpdateOpen(false))
  }

  const handleAssignToMe = () => {
    if (!selected || !user) return
    void runMutation(
      () => assign(selected.id, user.id),
      `${selected.reference} assigned to you`,
    )
  }

  const handleReply = (body: string) => {
    if (!selected) return
    void runMutation(
      () => reply(selected.id, body),
      `Reply sent to ${selected.requester.name}`,
    )
  }

  return (
    <ContentShell variant="full" className="flex h-full flex-col">
      <SupportTicketsToolbar
        search={search}
        status={statusFilter}
        type={typeFilter}
        shown={filtered.length}
        summary={summary}
        initialized={initialized}
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
        onTypeChange={setTypeFilter}
      />

      {/*
        A failed fetch leaves the list empty, which would otherwise read as "no tickets
        match the current filters" — a filter problem, not the outage it actually is.
      */}
      {error && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-800">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void fetchTickets()}
            className="font-medium underline underline-offset-2 hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <div className="flex min-h-0 shrink-0 flex-col gap-4 lg:w-72 xl:w-80">
          <TicketPriorityBoard
            buckets={buckets}
            total={summary.total}
            active={priorityFilter}
            initialized={initialized}
            onSelect={setPriorityFilter}
          />

          <SupportTicketsList
            tickets={filtered}
            loading={loading}
            initialized={initialized}
            errored={Boolean(error)}
            selectedId={selected?.id}
            onSelect={(ticket) => setSelectedId(ticket.id)}
          />
        </div>

        <TicketDetailView
          ticket={selected}
          initialized={initialized}
          saving={saving}
          onUpdate={() => setUpdateOpen(true)}
          onAssignToMe={handleAssignToMe}
          onReply={handleReply}
        />
      </div>

      {updateOpen && (
        <TicketUpdateModal
          // Keyed by ticket so the dialog's draft never carries over to another one.
          key={selected?.id}
          ticket={selected}
          saving={saving}
          onClose={() => setUpdateOpen(false)}
          onSubmit={handleUpdate}
        />
      )}
    </ContentShell>
  )
}
