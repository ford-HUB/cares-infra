import type { ChatRoleType } from './chat'

/** Wire shapes returned by server/src/modules/chat — snake_case, mapped in the service. */
export interface ChatContactApi {
  user_id: string
  firstname: string
  lastname: string
  email: string
  role_type: ChatRoleType
  department: string | null
}

export interface ChatThreadApi {
  contact_id: string
  conversation_id: string
  preview: string
  last_message_at: string
  unread: number
}

export interface ChatDirectoryApi {
  contacts: ChatContactApi[]
  threads: ChatThreadApi[]
}

export interface ChatAttachmentApi {
  attachment_id: string
  name: string
  size: number
  mime_type: string
}

export interface ChatMessageApi {
  message_id: string
  conversation_id: string
  sender_id: string
  sender_role_type: ChatRoleType
  body: string
  created_at: string
  attachments: ChatAttachmentApi[]
}

export interface ChatConversationApi {
  conversation_id: string | null
  contact_id: string
  messages: ChatMessageApi[]
}

/** Socket payloads (server/src/modules/chat/gateways/chat-gateway.ts). */
export interface ChatMessageEventApi {
  contact_id: string
  message: ChatMessageApi
}

export interface ChatReadEventApi {
  conversation_id: string
  contact_id: string
  unread: number
}

export interface ChatPresenceEventApi {
  user_id: string
  online: boolean
}

export interface ChatPresenceListEventApi {
  user_ids: string[]
}
