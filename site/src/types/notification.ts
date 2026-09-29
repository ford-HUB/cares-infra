/**
 * What a notification is about. Each category maps to one portal module; the server
 * already scopes the feed to the caller, so a coordinator never sees a blocked-IP
 * notice and an admin never sees "your report was returned".
 */
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

/** How loudly a row asks for attention; colour is spent on this, never on the category. */
export type NotificationTone = 'info' | 'attention' | 'critical'

export interface NotificationItem {
  id: string
  title: string
  description: string
  category: NotificationCategory
  tone: NotificationTone
  read: boolean
  createdAt: string
  /** Where "Open" takes the reader — the screen the notice is about. */
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
