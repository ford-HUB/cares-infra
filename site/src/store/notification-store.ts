import { create } from 'zustand'
import {
  clearReadNotifications,
  dismissNotification,
  fetchNotifications,
  mapApiNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notification-service'
import {
  connectNotificationSocket,
  disconnectNotificationSocket,
} from '../services/notification-socket'
import type { NotificationFeed, NotificationItem } from '../types/notification'
import { showBrowserNotification } from '../utils/browser-notifications'
import { playNotificationSound } from '../utils/notification-sound'

interface NotificationState {
  feed: NotificationFeed | null
  loading: boolean
  initialized: boolean
  error: string | null
  /** Where a desktop alert's click should take the person; set by the layout. */
  openHref: (href: string) => void
  load: () => Promise<void>
  /** Opens the live channel; safe to call again — it re-binds rather than doubling up. */
  connect: (openHref: (href: string) => void) => void
  disconnect: () => void
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  dismiss: (id: string) => Promise<void>
  clearRead: () => Promise<void>
  unreadCount: () => number
}

export const useNotificationStore = create<NotificationState>((set, get) => {
  /** Every write returns the whole feed, so the store swaps rather than patches. */
  const apply = (result: Awaited<ReturnType<typeof fetchNotifications>>) => {
    if (result.success && result.feed) {
      set({ feed: result.feed, error: null })
    } else {
      set({ error: result.message ?? 'Notifications could not be updated' })
    }
  }

  /** A row pushed over the socket: prepend it, bump the count, and make some noise. */
  const receive = (item: NotificationItem) => {
    const current = get().feed ?? { summary: { total: 0, unread: 0, read: 0 }, items: [] }
    if (current.items.some((existing) => existing.id === item.id)) return

    set({
      feed: {
        summary: {
          total: current.summary.total + 1,
          unread: current.summary.unread + (item.read ? 0 : 1),
          read: current.summary.read + (item.read ? 1 : 0),
        },
        items: [item, ...current.items],
      },
    })

    playNotificationSound()
    showBrowserNotification(item, (opened) => {
      void get().markRead(opened.id)
      if (opened.href) get().openHref(opened.href)
    })
  }

  return {
    feed: null,
    loading: false,
    initialized: false,
    error: null,
    openHref: () => {},

    load: async () => {
      set({ loading: true })
      const result = await fetchNotifications()
      if (result.success && result.feed) {
        set({ feed: result.feed, error: null, loading: false, initialized: true })
      } else {
        set({
          error: result.message ?? 'Notifications could not be loaded',
          loading: false,
          initialized: true,
        })
      }
    },

    connect: (openHref) => {
      set({ openHref })
      connectNotificationSocket({
        onNew: (event) => receive(mapApiNotification(event)),
        onUnread: ({ unread }) => {
          const feed = get().feed
          if (!feed || feed.summary.unread === unread) return
          // Another tab changed something; the count is authoritative, the rows are
          // refetched so the two agree.
          set({ feed: { ...feed, summary: { ...feed.summary, unread } } })
          void get().load()
        },
      })
    },

    disconnect: () => {
      disconnectNotificationSocket()
    },

    markRead: async (id) => apply(await markNotificationRead(id)),
    markAllRead: async () => apply(await markAllNotificationsRead()),
    dismiss: async (id) => apply(await dismissNotification(id)),
    clearRead: async () => apply(await clearReadNotifications()),

    unreadCount: () => get().feed?.summary.unread ?? 0,
  }
})
