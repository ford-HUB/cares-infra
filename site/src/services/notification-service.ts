import type {
  NotificationCategory,
  NotificationFeed,
  NotificationFeedResult,
  NotificationItem,
  NotificationTone,
} from '../types/notification'
import { apiClient, parseApiError } from './api-client'

/** The server's row: upper-case Prisma enums and snake_case fields. */
export interface NotificationApiResponse {
  notification_id: string
  title: string
  description: string
  category: Uppercase<NotificationCategory>
  tone: Uppercase<NotificationTone>
  href: string | null
  read: boolean
  created_at: string
}

interface NotificationFeedApiResponse {
  summary: { total: number; unread: number; read: number }
  items: NotificationApiResponse[]
}

export function mapApiNotification(data: NotificationApiResponse): NotificationItem {
  return {
    id: data.notification_id,
    title: data.title,
    description: data.description,
    category: data.category.toLowerCase() as NotificationCategory,
    tone: data.tone.toLowerCase() as NotificationTone,
    read: data.read,
    createdAt: data.created_at,
    href: data.href ?? undefined,
  }
}

function mapApiFeed(data: NotificationFeedApiResponse): NotificationFeed {
  return { summary: data.summary, items: data.items.map(mapApiNotification) }
}

/**
 * Every call returns the whole feed after the change, so the store can replace its
 * state rather than patch it — the server is the only place read/dismissed is decided.
 */
async function feedRequest(
  request: () => Promise<{ data: { ok: true; data: NotificationFeedApiResponse } }>,
): Promise<NotificationFeedResult> {
  try {
    const { data: body } = await request()
    return { success: true, feed: mapApiFeed(body.data) }
  } catch (error) {
    return { success: false, message: parseApiError(error) }
  }
}

export function fetchNotifications(): Promise<NotificationFeedResult> {
  return feedRequest(() => apiClient.get('/api/v1/notifications'))
}

export function markNotificationRead(id: string): Promise<NotificationFeedResult> {
  return feedRequest(() => apiClient.patch(`/api/v1/notifications/${id}/read`))
}

export function markAllNotificationsRead(): Promise<NotificationFeedResult> {
  return feedRequest(() => apiClient.patch('/api/v1/notifications/read-all'))
}

export function dismissNotification(id: string): Promise<NotificationFeedResult> {
  return feedRequest(() => apiClient.delete(`/api/v1/notifications/${id}`))
}

export function clearReadNotifications(): Promise<NotificationFeedResult> {
  return feedRequest(() => apiClient.delete('/api/v1/notifications/read'))
}
