import { isAxiosError } from 'axios'
import { MAILBOX_PAGE_SIZE } from '../constants/mailbox'
import type {
  MailAttachment,
  MailDetail,
  MailListPage,
  MailListQuery,
  MailSummary,
  MailboxConnection,
  MailboxResult,
  SendMailPayload,
} from '../types/mailbox'
import { apiClient, parseApiError } from './api-client'

const MAILBOX_BASE = '/api/v1/mailbox'

/** 412 is the server saying "no Google account is linked yet", not a failure. */
const NOT_CONNECTED_STATUS = 412

interface MailboxConnectionApiResponse {
  connected: boolean
  email: string | null
  connected_at: string | null
}

interface MailboxAuthorizeApiResponse {
  authorize_url: string
}

interface MailAttachmentApiResponse {
  attachment_id: string
  filename: string
  mime_type: string
  size: number
}

interface MailSummaryApiResponse {
  id: string
  thread_id: string
  from_name: string
  from_email: string
  to: string[]
  subject: string
  snippet: string
  received_at: string
  unread: boolean
  starred: boolean
  has_attachments: boolean
}

interface MailDetailApiResponse extends MailSummaryApiResponse {
  cc: string[]
  body_html: string | null
  body_text: string
  message_id_header: string | null
  attachments: MailAttachmentApiResponse[]
}

interface MailListApiResponse {
  messages: MailSummaryApiResponse[]
  next_page_token: string | null
  estimated_total: number
}

function mapSummary(data: MailSummaryApiResponse): MailSummary {
  return {
    id: data.id,
    threadId: data.thread_id,
    fromName: data.from_name,
    fromEmail: data.from_email,
    to: data.to,
    subject: data.subject,
    snippet: data.snippet,
    receivedAt: data.received_at,
    unread: data.unread,
    starred: data.starred,
    hasAttachments: data.has_attachments,
  }
}

function mapAttachment(data: MailAttachmentApiResponse): MailAttachment {
  return {
    id: data.attachment_id,
    filename: data.filename,
    mimeType: data.mime_type,
    size: data.size,
  }
}

function mapDetail(data: MailDetailApiResponse): MailDetail {
  return {
    ...mapSummary(data),
    cc: data.cc,
    bodyHtml: data.body_html,
    bodyText: data.body_text,
    messageIdHeader: data.message_id_header,
    attachments: data.attachments.map(mapAttachment),
  }
}

function toFailure<T>(error: unknown): MailboxResult<T> {
  return {
    success: false,
    message: parseApiError(error),
    data: null,
    notConnected:
      isAxiosError(error) && error.response?.status === NOT_CONNECTED_STATUS,
  }
}

export async function getMailboxConnection(): Promise<
  MailboxResult<MailboxConnection>
> {
  try {
    const { data: body } = await apiClient.get<{
      ok: true
      data: MailboxConnectionApiResponse
    }>(`${MAILBOX_BASE}/connection`)

    return {
      success: true,
      data: {
        connected: body.data.connected,
        email: body.data.email,
        connectedAt: body.data.connected_at,
      },
    }
  } catch (error) {
    return toFailure(error)
  }
}

/** Returns the Google consent URL; the caller navigates the browser to it. */
export async function createMailboxAuthorizeUrl(): Promise<
  MailboxResult<string>
> {
  try {
    const { data: body } = await apiClient.post<{
      ok: true
      data: MailboxAuthorizeApiResponse
    }>(`${MAILBOX_BASE}/connection`)

    return { success: true, data: body.data.authorize_url }
  } catch (error) {
    return toFailure(error)
  }
}

export async function disconnectMailbox(): Promise<MailboxResult<boolean>> {
  try {
    await apiClient.delete(`${MAILBOX_BASE}/connection`)
    return { success: true, data: true }
  } catch (error) {
    return toFailure(error)
  }
}

export async function listMail(
  query: MailListQuery,
): Promise<MailboxResult<MailListPage>> {
  try {
    const { data: body } = await apiClient.get<{
      ok: true
      data: MailListApiResponse
    }>(`${MAILBOX_BASE}/messages`, {
      params: {
        folder: query.folder,
        page_size: MAILBOX_PAGE_SIZE,
        ...(query.search ? { search: query.search } : {}),
        ...(query.pageToken ? { page_token: query.pageToken } : {}),
      },
    })

    return {
      success: true,
      data: {
        messages: body.data.messages.map(mapSummary),
        nextPageToken: body.data.next_page_token,
        estimatedTotal: body.data.estimated_total,
      },
    }
  } catch (error) {
    return toFailure(error)
  }
}

export async function getMail(id: string): Promise<MailboxResult<MailDetail>> {
  try {
    const { data: body } = await apiClient.get<{
      ok: true
      data: MailDetailApiResponse
    }>(`${MAILBOX_BASE}/messages/${encodeURIComponent(id)}`)

    return { success: true, data: mapDetail(body.data) }
  } catch (error) {
    return toFailure(error)
  }
}

export async function setMailReadState(
  id: string,
  unread: boolean,
): Promise<MailboxResult<MailSummary>> {
  try {
    const { data: body } = await apiClient.patch<{
      ok: true
      data: MailSummaryApiResponse
    }>(`${MAILBOX_BASE}/messages/${encodeURIComponent(id)}/read-state`, {
      unread,
    })

    return { success: true, data: mapSummary(body.data) }
  } catch (error) {
    return toFailure(error)
  }
}

export async function sendMail(
  payload: SendMailPayload,
): Promise<MailboxResult<{ id: string; threadId: string }>> {
  try {
    const { data: body } = await apiClient.post<{
      ok: true
      data: { id: string; thread_id: string }
    }>(`${MAILBOX_BASE}/messages`, {
      to: payload.to,
      ...(payload.cc?.length ? { cc: payload.cc } : {}),
      ...(payload.bcc?.length ? { bcc: payload.bcc } : {}),
      subject: payload.subject,
      body: payload.body,
      ...(payload.threadId ? { thread_id: payload.threadId } : {}),
      ...(payload.inReplyTo ? { in_reply_to: payload.inReplyTo } : {}),
    })

    return {
      success: true,
      data: { id: body.data.id, threadId: body.data.thread_id },
    }
  } catch (error) {
    return toFailure(error)
  }
}
