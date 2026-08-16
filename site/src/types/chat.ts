/** Presence comes from the socket gateway — a contact is online or it is not. */
export type ChatPresence = 'online' | 'offline'

/** The portal roles that can be messaged; mirrors the server's PORTAL_ROLE_TYPES. */
export type ChatRoleType = 'ADMIN' | 'DIRECTOR' | 'COORDINATOR'

export interface ChatContact {
  id: string
  firstName: string
  lastName: string
  email: string
  roleType: ChatRoleType
  department: string | null
}

/** One administrator role in the sidebar, with the people holding it. */
export interface ChatRoleGroup {
  id: ChatRoleType
  label: string
  description: string
  contacts: ChatContact[]
}

export interface ChatAttachment {
  id: string
  name: string
  /** Bytes, rendered with `formatFileSize`. */
  size: number
  mimeType: string
}

/** A file picked in the composer but not uploaded yet. */
export interface ChatDraftAttachment {
  id: string
  name: string
  size: number
  mimeType: string
  /** Local object URL for the composer thumbnail only. */
  previewUrl?: string
  file: File
}

export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  /** Drives the notification sound — director/coordinator messages chime. */
  senderRoleType: ChatRoleType
  body: string
  sentAt: string
  attachments: ChatAttachment[]
}

/** Thread summary used by the sidebar; absent entirely when there is no history. */
export interface ChatThreadSummary {
  contactId: string
  conversationId: string
  preview: string
  lastMessageAt: string
  unread: number
}

export interface ChatDirectory {
  contacts: ChatContact[]
  threads: ChatThreadSummary[]
}

export interface ChatConversation {
  contactId: string
  conversationId: string | null
  messages: ChatMessage[]
}
