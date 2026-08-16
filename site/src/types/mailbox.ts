/** Folders the portal exposes; the server maps each onto a Gmail system label. */
export type MailFolder = 'inbox' | 'starred' | 'sent' | 'drafts' | 'spam' | 'trash'

export interface MailboxConnection {
  connected: boolean
  email: string | null
  connectedAt: string | null
}

export interface MailAttachment {
  id: string
  filename: string
  mimeType: string
  size: number
}

export interface MailSummary {
  id: string
  threadId: string
  fromName: string
  fromEmail: string
  to: string[]
  subject: string
  snippet: string
  receivedAt: string
  unread: boolean
  starred: boolean
  hasAttachments: boolean
}

export interface MailDetail extends MailSummary {
  cc: string[]
  /** Sanitised server-side; still rendered inside a sandboxed frame. */
  bodyHtml: string | null
  bodyText: string
  /** RFC `Message-ID` of the original, needed so a reply threads correctly. */
  messageIdHeader: string | null
  attachments: MailAttachment[]
}

export interface MailListPage {
  messages: MailSummary[]
  nextPageToken: string | null
  estimatedTotal: number
}

export interface MailListQuery {
  folder: MailFolder
  search?: string
  pageToken?: string
}

export interface SendMailPayload {
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  body: string
  threadId?: string
  inReplyTo?: string
}

/**
 * `notConnected` separates "the admin has not linked Google yet" from a genuine
 * failure, so the page can show the connect screen instead of an error banner.
 */
export interface MailboxResult<T> {
  success: boolean
  message?: string
  data: T | null
  notConnected?: boolean
}
