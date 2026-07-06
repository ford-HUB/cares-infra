import { create } from 'zustand'
import type { NotificationFeed } from '../types/notification'
import {
  fetchNotifications,
  markNotificationRead,
} from '../services/notification-service'

interface NotificationState {
  feed: NotificationFeed | null
  loading: boolean
  load: () => Promise<void>
  markRead: (id: string) => Promise<void>
  unreadCount: () => number
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  feed: null,
  loading: false,

  load: async () => {
    set({ loading: true })
    const feed = await fetchNotifications()
    set({ feed, loading: false })
  },

  markRead: async (id) => {
    const feed = await markNotificationRead(id)
    set({ feed })
  },

  unreadCount: () => get().feed?.summary.unread ?? 0,
}))
