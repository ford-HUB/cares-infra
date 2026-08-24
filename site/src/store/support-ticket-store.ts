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
  assign: (id: string, assignee: string) => Promise<void>
  reply: (id: string, author: string, body: string) => Promise<void>
}

export const useSupportTicketStore = create<SupportTicketState>((set) => ({
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
    set({ tickets: await updateSupportTicket(id, patch) })
  },

  assign: async (id, assignee) => {
    set({ tickets: await assignSupportTicket(id, assignee) })
  },

  reply: async (id, author, body) => {
    set({ tickets: await replyToSupportTicket(id, author, body) })
  },
}))
