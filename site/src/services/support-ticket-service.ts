import { MOCK_API_DELAY_MS, delay } from '../constants/durations'
import type {
  SupportTicket,
  SupportTicketReply,
  SupportTicketStatus,
} from '../types/support-ticket'
import { mockSupportTickets } from './mock-data'

/**
 * The support-ticket endpoints are not built yet, so this module serves the fixture
 * list and keeps mutations in memory. Swap each function for an `apiClient` call —
 * the signatures already match what the endpoint will return.
 */
let tickets: SupportTicket[] = structuredClone(mockSupportTickets)

export async function fetchSupportTickets(): Promise<SupportTicket[]> {
  await delay(MOCK_API_DELAY_MS.default)
  return structuredClone(tickets)
}

export interface SupportTicketUpdate {
  status: SupportTicketStatus
  /** Optional note posted to the thread alongside the status change. */
  note?: string
  author: string
}

export async function updateSupportTicket(
  id: string,
  update: SupportTicketUpdate,
): Promise<SupportTicket[]> {
  await delay(MOCK_API_DELAY_MS.default)

  const now = new Date().toISOString()
  const note = update.note?.trim()

  tickets = tickets.map((ticket) =>
    ticket.id === id
      ? {
          ...ticket,
          status: update.status,
          updatedAt: now,
          replies: note
            ? [
                ...ticket.replies,
                {
                  id: `r-${Date.now()}`,
                  author: update.author,
                  authorType: 'staff' as const,
                  body: note,
                  createdAt: now,
                },
              ]
            : ticket.replies,
        }
      : ticket,
  )
  return structuredClone(tickets)
}

export async function assignSupportTicket(
  id: string,
  assignee: string,
): Promise<SupportTicket[]> {
  tickets = tickets.map((ticket) =>
    ticket.id === id
      ? { ...ticket, assignee, updatedAt: new Date().toISOString() }
      : ticket,
  )
  return structuredClone(tickets)
}

export async function replyToSupportTicket(
  id: string,
  author: string,
  body: string,
): Promise<SupportTicket[]> {
  await delay(MOCK_API_DELAY_MS.default)

  const reply: SupportTicketReply = {
    id: `r-${Date.now()}`,
    author,
    authorType: 'staff',
    body,
    createdAt: new Date().toISOString(),
  }

  tickets = tickets.map((ticket) =>
    ticket.id === id
      ? {
          ...ticket,
          replies: [...ticket.replies, reply],
          // A reply on an untouched ticket means someone picked it up.
          status: ticket.status === 'open' ? 'in_progress' : ticket.status,
          updatedAt: reply.createdAt,
        }
      : ticket,
  )
  return structuredClone(tickets)
}
