import type { NotificationItem } from '../types/notification'

export type BrowserNotificationPermission = NotificationPermission | 'unsupported'

const AUTO_CLOSE_MS = 8000

export function browserNotificationPermission(): BrowserNotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

/** Must run from a user gesture or browsers ignore the prompt. */
export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (browserNotificationPermission() === 'unsupported') return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export function showBrowserNotification(
  item: NotificationItem,
  onOpen: (item: NotificationItem) => void,
): void {
  if (browserNotificationPermission() !== 'granted') return

  try {
    const alert = new Notification(item.title, {
      body: item.description,
      tag: item.id,
      icon: '/transparent-logo.png',
      requireInteraction: item.tone === 'critical',
    })

    alert.onclick = () => {
      window.focus()
      onOpen(item)
      alert.close()
    }

    if (item.tone !== 'critical') {
      window.setTimeout(() => alert.close(), AUTO_CLOSE_MS)
    }
  } catch {
    // Some browsers throw here; the in-app feed still has the row.
  }
}
