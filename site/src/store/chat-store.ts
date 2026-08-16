import { create } from 'zustand'
import { CHAT_SOUND_ROLES } from '../constants/chat'
import {
  fetchChatConversation,
  fetchChatDirectory,
  mapChatMessage,
  markConversationRead,
  sendChatMessage,
} from '../services/chat-service'
import {
  connectChatSocket,
  disconnectChatSocket,
} from '../services/chat-socket'
import type { ChatMessageEventApi } from '../types/chat-api'
import type {
  ChatContact,
  ChatMessage,
  ChatThreadSummary,
} from '../types/chat'
import { playNotificationSound } from '../utils/notification-sound'

interface ChatState {
  contacts: ChatContact[]
  threads: ChatThreadSummary[]
  /** Loaded lazily per contact; a missing key means "not fetched yet". */
  messages: Record<string, ChatMessage[]>
  /** User ids the gateway reports as connected. */
  onlineIds: string[]
  /** `null` until the admin picks who to contact — the page's default state. */
  activeContactId: string | null
  loading: boolean
  messagesLoading: boolean
  sending: boolean
  error: string | null
  load: () => Promise<void>
  selectContact: (contactId: string) => Promise<void>
  send: (body: string, files: File[]) => Promise<boolean>
  connect: (currentUserId: string) => void
  disconnect: () => void
}

function previewOf(message: ChatMessage): string {
  if (message.body) return message.body
  const count = message.attachments.length
  return count === 1 ? '📎 1 attachment' : `📎 ${count} attachments`
}

function upsertThread(
  threads: ChatThreadSummary[],
  summary: ChatThreadSummary,
): ChatThreadSummary[] {
  const without = threads.filter((t) => t.contactId !== summary.contactId)
  return [summary, ...without]
}

export const useChatStore = create<ChatState>((set, get) => ({
  contacts: [],
  threads: [],
  messages: {},
  onlineIds: [],
  activeContactId: null,
  loading: false,
  messagesLoading: false,
  sending: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null })
    const res = await fetchChatDirectory()
    if (res.success && res.data) {
      set({ contacts: res.data.contacts, threads: res.data.threads, loading: false })
      return
    }
    set({ loading: false, error: res.message ?? 'Could not load the directory' })
  },

  selectContact: async (contactId) => {
    set((state) => ({
      activeContactId: contactId,
      threads: state.threads.map((thread) =>
        thread.contactId === contactId ? { ...thread, unread: 0 } : thread,
      ),
    }))

    if (get().messages[contactId]) {
      void markConversationRead(contactId)
      return
    }

    set({ messagesLoading: true })
    const res = await fetchChatConversation(contactId)
    if (res.success && res.data) {
      set((state) => ({
        messages: { ...state.messages, [contactId]: res.data!.messages },
        messagesLoading: false,
      }))
      return
    }
    set({ messagesLoading: false, error: res.message ?? 'Could not open the conversation' })
  },

  send: async (body, files) => {
    const contactId = get().activeContactId
    if (!contactId) return false

    set({ sending: true, error: null })
    const res = await sendChatMessage(contactId, body, files)
    if (!res.success || !res.data) {
      set({ sending: false, error: res.message ?? 'Message not sent' })
      return false
    }

    // The socket echoes this back too; appending by id keeps it from doubling.
    const message = res.data
    set((state) => {
      const existing = state.messages[contactId] ?? []
      const already = existing.some((item) => item.id === message.id)
      return {
        sending: false,
        messages: {
          ...state.messages,
          [contactId]: already ? existing : [...existing, message],
        },
        threads: upsertThread(state.threads, {
          contactId,
          conversationId: message.conversationId,
          preview: previewOf(message),
          lastMessageAt: message.sentAt,
          unread: 0,
        }),
      }
    })

    return true
  },

  connect: (currentUserId) => {
    connectChatSocket({
      onMessage: ({ contact_id, message: raw }: ChatMessageEventApi) => {
        const message = mapChatMessage(raw)
        const incoming = message.senderId !== currentUserId
        const isOpen = get().activeContactId === contact_id

        set((state) => {
          const known = state.messages[contact_id]
          const already = known?.some((item) => item.id === message.id) ?? false
          const previousUnread =
            state.threads.find((t) => t.contactId === contact_id)?.unread ?? 0

          return {
            // Only extend a thread already in memory; the rest load on open.
            messages:
              known && !already
                ? { ...state.messages, [contact_id]: [...known, message] }
                : state.messages,
            threads: upsertThread(state.threads, {
              contactId: contact_id,
              conversationId: message.conversationId,
              preview: previewOf(message),
              lastMessageAt: message.sentAt,
              unread: incoming && !isOpen ? previousUnread + 1 : 0,
            }),
          }
        })

        if (incoming && isOpen) void markConversationRead(contact_id)

        // Directors and coordinators are the escalation paths — they chime.
        if (incoming && CHAT_SOUND_ROLES.includes(message.senderRoleType)) {
          playNotificationSound()
        }
      },

      onRead: ({ contact_id }) => {
        set((state) => ({
          threads: state.threads.map((thread) =>
            thread.contactId === contact_id ? { ...thread, unread: 0 } : thread,
          ),
        }))
      },

      onPresence: ({ user_id, online }) => {
        set((state) => ({
          onlineIds: online
            ? [...new Set([...state.onlineIds, user_id])]
            : state.onlineIds.filter((id) => id !== user_id),
        }))
      },

      onPresenceList: ({ user_ids }) => set({ onlineIds: user_ids }),
    })
  },

  disconnect: () => {
    disconnectChatSocket()
    set({ onlineIds: [] })
  },
}))
