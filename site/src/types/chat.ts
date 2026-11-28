export type ChatPresence = 'online' | 'offline'

/** Mirrors server PORTAL_ROLE_TYPES. */
export type ChatRoleType = 'ADMIN' | 'DIRECTOR' | 'COORDINATOR'

export interface ChatContact {
  id: string
  firstName: string
  lastName: string
  email: string
  roleType: ChatRoleType
  department: string | null
}

export interface ChatRoleGroup {
  id: ChatRoleType
  label: string
  description: string
  contacts: ChatContact[]
}

export interface ChatAttachment {
  id: string
  name: string
  size: number
  mimeType: string
}

export interface ChatDraftAttachment {
  id: string
  name: string
  size: number
  mimeType: string
  previewUrl?: string
  file: File
}

export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  senderRoleType: ChatRoleType
  body: string
  sentAt: string
  attachments: ChatAttachment[]
}

/** Absent when there is no history. */
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
