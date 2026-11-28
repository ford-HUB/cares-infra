import dayjs from 'dayjs'
import {
  Award,
  Bell,
  CalendarClock,
  FileText,
  HandCoins,
  KeyRound,
  LifeBuoy,
  Mail,
  ShieldAlert,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type {
  NotificationCategory,
  NotificationItem,
  NotificationTone,
} from '../types/notification'
import type { PortalRole } from '../types/portal-roles'
import { formatNoticeDay } from './maintenance'

export const NOTIFICATION_RECENT_WINDOW_DAYS = 7

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  event: 'Events',
  report: 'Monthly reports',
  access: 'Access control',
  system: 'System notices',
  volunteer: 'Volunteers',
  certificate: 'Certificates',
  donation: 'Donations',
  user_request: 'User requests',
  security: 'Security',
  support: 'Support tickets',
  mail: 'Mail inbox',
}

export const NOTIFICATION_CATEGORY_ICONS: Record<NotificationCategory, LucideIcon> = {
  event: CalendarClock,
  report: FileText,
  access: KeyRound,
  system: Bell,
  volunteer: Users,
  certificate: Award,
  donation: HandCoins,
  user_request: UserPlus,
  security: ShieldAlert,
  support: LifeBuoy,
  mail: Mail,
}

export const ROLE_NOTIFICATION_BLURBS: Record<PortalRole, string> = {
  coordinator:
    'Events you run, reports you owe, and changes to your access — this week first, then the record.',
  director:
    'Reports awaiting your review, events across departments, and certificates to sign — this week first, then the record.',
  admin:
    'Access requests, security alerts, and portal health — this week first, then the record.',
}

export const NOTIFICATION_TONE_LABELS: Record<NotificationTone, string> = {
  info: 'For your information',
  attention: 'Needs your attention',
  critical: 'Urgent',
}

export const NOTIFICATION_TONE_RAIL_STYLES: Record<NotificationTone, string> = {
  info: 'bg-gray-300',
  attention: 'bg-amber-400',
  critical: 'bg-red-500',
}

export const NOTIFICATION_TONE_CHIP_STYLES: Record<NotificationTone, string> = {
  info: 'bg-gray-100 text-gray-600',
  attention: 'bg-amber-50 text-amber-700',
  critical: 'bg-red-50 text-red-700',
}

export interface NotificationDayGroup {
  key: string
  label: string
  items: NotificationItem[]
}

function isRecentNotification(item: NotificationItem, now = dayjs()): boolean {
  return dayjs(item.createdAt).isAfter(
    now.startOf('day').subtract(NOTIFICATION_RECENT_WINDOW_DAYS - 1, 'day'),
  )
}

/** Week grouped by day, older history by month. */
export function splitNotificationFeed(items: NotificationItem[]): {
  recent: NotificationDayGroup[]
  history: NotificationDayGroup[]
} {
  const ordered = [...items].sort(
    (a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf(),
  )

  const recent: NotificationDayGroup[] = []
  const history: NotificationDayGroup[] = []

  for (const item of ordered) {
    const isRecent = isRecentNotification(item)
    const bucket = isRecent ? recent : history
    const key = dayjs(item.createdAt).format(isRecent ? 'YYYY-MM-DD' : 'YYYY-MM')
    const current = bucket.at(-1)

    if (current?.key === key) {
      current.items.push(item)
      continue
    }

    bucket.push({
      key,
      label: isRecent
        ? formatNoticeDay(item.createdAt)
        : dayjs(item.createdAt).format('MMMM YYYY'),
      items: [item],
    })
  }

  return { recent, history }
}
