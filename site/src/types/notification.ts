export type NotificationCategory = 'volunteer' | 'reminder' | 'system' | 'event'

export interface NotificationItem {
  id: string
  title: string
  description: string
  category: NotificationCategory
  read: boolean
  createdAt: string
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
