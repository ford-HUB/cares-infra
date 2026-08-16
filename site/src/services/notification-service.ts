import type { NotificationFeed } from '../types/notification'
import { MOCK_API_DELAY_MS, delay } from '../constants/durations'
import { mockNotifications } from './mock-data'

export async function fetchNotifications(): Promise<NotificationFeed> {
  await delay(MOCK_API_DELAY_MS.default)
  return structuredClone(mockNotifications)
}

export async function markNotificationRead(id: string): Promise<NotificationFeed> {
  const feed = structuredClone(mockNotifications)
  const item = feed.items.find((n) => n.id === id)
  if (item && !item.read) {
    item.read = true
    feed.summary.unread -= 1
    feed.summary.read += 1
  }
  return feed
}
