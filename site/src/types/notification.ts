/** The server scopes the feed to the caller. */
export type NotificationCategory =
  | 'event'
  | 'report'
  | 'access'
  | 'system'
  | 'volunteer'
  | 'certificate'
  | 'donation'
  | 'user_request'
  | 'security'
  | 'support'
  | 'mail'

/** Colour is spent on tone, never on category. */
export type NotificationTone = 'info' | 'attention' | 'critical'

export interface NotificationItem {
  id: string
  title: string
  description: string
  category: NotificationCategory
  tone: NotificationTone
  read: boolean
  createdAt: string
  href?: string
}

export interface NotificationSummary {
  total: number
  unread: number
  read: number
}

export interface NotificationFeed {
  summary: NotificationSummary
  items: NotificationItem[]
}

export interface NotificationFeedResult {
  success: boolean
  message?: string
  feed?: NotificationFeed
}
