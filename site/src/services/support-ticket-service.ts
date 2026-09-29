import { formatTicketReference } from '../constants/support-tickets'
import type {
  SupportTicket,
  SupportTicketPriority,
  SupportTicketReply,
  SupportTicketStatus,
  SupportTicketType,
} from '../types/support-ticket'
import { apiClient, parseApiError } from './api-client'

/** Backend wraps successful responses in an { ok, data } envelope. */
type ApiEnvelope<T> = { ok: true; message?: string; data: T }

const SUPPORT_TICKETS_URL = '/api/v1/support-tickets'

interface SupportTicketReplyApiResponse {
  support_ticket_reply_id: string
  author_id: string | null
  author_name: string
  author_type: 'STAFF' | 'REQUESTER'
  body: string
  created_at: string
}

interface SupportTicketApiResponse {
  support_ticket_id: string
  reference_number: number
  subject: string
  description: string
  type: string
  status: string
  priority: string
  requester_id: string
  requester_firstname: string
  requester_lastname: string
  requester_email: string
  requester_role_type: string
  assignee_id: string | null
  assignee_name: string | null
  source: 'PORTAL' | 'MOBILE'
  replies: SupportTicketReplyApiResponse[]
  created_at: string
  updated_at: string
}

interface SupportTicketListApiResponse {
  items: SupportTicketApiResponse[]
  total: number
}

/** Server enums are SCREAMING_SNAKE; the portal's own vocabulary is snake_case. */
const SOURCE_LABELS: Record<SupportTicketApiResponse['source'], string> = {
  MOBILE: 'Mobile app',
  PORTAL: 'Staff portal',
}

function mapReply(reply: SupportTicketReplyApiResponse): SupportTicketReply {
  return {
    id: reply.support_ticket_reply_id,
    author: reply.author_name,
    authorType: reply.author_type === 'STAFF' ? 'staff' : 'requester',
    body: reply.body,
    createdAt: reply.created_at,
  }
}

function mapTicket(data: SupportTicketApiResponse): SupportTicket {
  return {
    id: data.support_ticket_id,
    reference: formatTicketReference(data.reference_number),
    subject: data.subject,
    description: data.description,
    type: data.type.toLowerCase() as SupportTicketType,
    status: data.status.toLowerCase() as SupportTicketStatus,
    priority: data.priority.toLowerCase() as SupportTicketPriority,
    requester: {
      name: `${data.requester_firstname} ${data.requester_lastname}`,
      email: data.requester_email,
      role: data.requester_role_type.toLowerCase(),
    },
    assignee: data.assignee_name ?? undefined,
    source: SOURCE_LABELS[data.source] ?? data.source,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    replies: data.replies.map(mapReply),
  }
}

/**
 * The whole queue in one read — the portal filters and sorts client-side. The server
 * caps the row count; `total` is the full match count when the cap bites.
 */
export async function fetchSupportTickets(): Promise<SupportTicket[]> {
  try {
    const { data: body } = await apiClient.get<
      ApiEnvelope<SupportTicketListApiResponse>
    >(SUPPORT_TICKETS_URL)
    return body.data.items.map(mapTicket)
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error })
  }
}

export interface SupportTicketUpdate {
  status: SupportTicketStatus
  /** Optional note posted to the thread alongside the status change. */
  note?: string
}

/** Every mutation returns the updated ticket, so the store swaps one row in place. */
export async function updateSupportTicket(
  id: string,
  update: SupportTicketUpdate,
): Promise<SupportTicket> {
  try {
    const note = update.note?.trim()
    const { data: body } = await apiClient.patch<
      ApiEnvelope<SupportTicketApiResponse>
    >(`${SUPPORT_TICKETS_URL}/${id}`, {
      status: update.status.toUpperCase(),
      ...(note ? { note } : {}),
    })
    return mapTicket(body.data)
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error })
  }
}

export async function assignSupportTicket(
  id: string,
  assigneeId: string,
): Promise<SupportTicket> {
  try {
    const { data: body } = await apiClient.patch<
      ApiEnvelope<SupportTicketApiResponse>
    >(`${SUPPORT_TICKETS_URL}/${id}`, { assignee_id: assigneeId })
    return mapTicket(body.data)
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error })
  }
}

export async function replyToSupportTicket(
  id: string,
  body: string,
): Promise<SupportTicket> {
  try {
    const { data: response } = await apiClient.post<
      ApiEnvelope<SupportTicketApiResponse>
    >(`${SUPPORT_TICKETS_URL}/${id}/replies`, { body })
    return mapTicket(response.data)
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error })
  }
}
