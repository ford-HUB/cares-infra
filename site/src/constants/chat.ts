import type { ChatPresence, ChatRoleType } from '../types/chat'

/** Sidebar sections, in the order administrators are listed. */
export const CHAT_ROLE_GROUPS: {
  id: ChatRoleType
  label: string
  description: string
}[] = [
  {
    id: 'ADMIN',
    label: 'System Administrators',
    description: 'Portal configuration, services, and maintenance',
  },
  {
    id: 'DIRECTOR',
    label: 'Directors',
    description: 'Program approvals and reporting oversight',
  },
  {
    id: 'COORDINATOR',
    label: 'Coordinators',
    description: 'Department events, attendance, and volunteers',
  },
]

export const CHAT_ROLE_LABEL: Record<ChatRoleType, string> = {
  ADMIN: 'System Administrator',
  DIRECTOR: 'Director',
  COORDINATOR: 'Coordinator',
}

/** Roles whose incoming messages play the notification sound. */
export const CHAT_SOUND_ROLES: ChatRoleType[] = ['DIRECTOR', 'COORDINATOR']

export const CHAT_PRESENCE_LABEL: Record<ChatPresence, string> = {
  online: 'Online',
  offline: 'Offline',
}

export const CHAT_PRESENCE_DOT: Record<ChatPresence, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-300',
}

/** Copy for the panel shown before any contact is picked. */
export const CHAT_NO_SELECTION_TITLE = 'Select who you want to contact'
export const CHAT_NO_SELECTION_BODY =
  'Pick an administrator from the roles on the left to open a conversation.'

/** Copy for a contact the admin has never messaged before. */
export const CHAT_NO_HISTORY_TITLE = 'No conversation history yet'
export const CHAT_NO_HISTORY_BODY =
  'You have not messaged this person before. Send the first message to start the thread.'

export const CHAT_COMPOSER_PLACEHOLDER = 'Write a message…'
export const CHAT_SEARCH_PLACEHOLDER = 'Search administrators'
export const CHAT_MESSAGE_MAX_LENGTH = 2000

/** Attachment limits — kept in step with the server's chat-site-validator. */
export const CHAT_ATTACHMENT_MAX_COUNT = 5
export const CHAT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024
export const CHAT_ATTACHMENT_ACCEPT =
  'image/jpeg,image/png,image/webp,image/gif,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt'

export const CHAT_ATTACHMENT_TOO_LARGE = (name: string) =>
  `${name} is larger than 10 MB and was not attached.`
export const CHAT_ATTACHMENT_TOO_MANY = `You can attach up to ${CHAT_ATTACHMENT_MAX_COUNT} files per message.`

/** Emoji picker popover box, in pixels. */
export const CHAT_EMOJI_PICKER_WIDTH = 320
export const CHAT_EMOJI_PICKER_HEIGHT = 380

/** Socket.io namespace and event names — must match server/chat-gateway.ts. */
export const CHAT_SOCKET_NAMESPACE = '/chat'
export const CHAT_SOCKET_EVENTS = {
  message: 'chat:message',
  read: 'chat:read',
  presence: 'chat:presence',
  presenceList: 'chat:presence-list',
} as const
