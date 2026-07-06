import type { NotificationFeed } from '../types/notification'
import { MOCK_API_DELAY_MS, delay } from '../constants/durations'
import { USE_MOCK_API } from './api-client'
import { mockNotifications } from './mock-data'

export async function fetchNotifications(): Promise<NotificationFeed> {
  if (USE_MOCK_API) {
    await delay(MOCK_API_DELAY_MS.default)
    return structuredClone(mockNotifications)
  }
  throw new Error('Backend not wired')
}

export async function markNotificationRead(id: string): Promise<NotificationFeed> {
  if (USE_MOCK_API) {
    const feed = structuredClone(mockNotifications)
    const item = feed.items.find((n) => n.id === id)
    if (item && !item.read) {
      item.read = true
      feed.summary.unread -= 1
      feed.summary.read += 1
    }
    return feed
  }
  throw new Error('Backend not wired')
}
