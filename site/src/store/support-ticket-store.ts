import { create } from 'zustand'
import {
  assignSupportTicket,
  fetchSupportTickets,
  replyToSupportTicket,
  updateSupportTicket,
  type SupportTicketUpdate,
} from '../services/support-ticket-service'
import type { SupportTicket } from '../types/support-ticket'

interface SupportTicketState {
  tickets: SupportTicket[]
  loading: boolean
  /** False until the first fetch settles, so the toolbar counts don't flash "0 of 0". */
  initialized: boolean
  error: string | null
  fetchTickets: () => Promise<void>
  update: (id: string, update: SupportTicketUpdate) => Promise<void>
  /** Hands the ticket to the signed-in staff account. */
  assign: (id: string, assigneeId: string) => Promise<void>
  reply: (id: string, body: string) => Promise<void>
}

export const useSupportTicketStore = create<SupportTicketState>((set) => {
  // A mutation returns just the changed ticket; splice it in so the rest of the
  // queue (and the selection) stays put.
  const replace = (updated: SupportTicket) =>
    set((state) => ({
      tickets: state.tickets.map((ticket) =>
        ticket.id === updated.id ? updated : ticket,
      ),
    }))

  return {
    tickets: [],
    loading: false,
    initialized: false,
    error: null,

    fetchTickets: async () => {
      set({ loading: true, error: null })
      try {
        const tickets = await fetchSupportTickets()
        set({ tickets, loading: false, initialized: true })
      } catch {
        set({
          loading: false,
          initialized: true,
          error: 'Support tickets could not be loaded',
        })
      }
    },

    update: async (id, patch) => {
      replace(await updateSupportTicket(id, patch))
    },

    assign: async (id, assigneeId) => {
      replace(await assignSupportTicket(id, assigneeId))
    },

    reply: async (id, body) => {
      replace(await replyToSupportTicket(id, body))
    },
  }
})
