import type { NotificationItem } from '../types/notification'

export type BrowserNotificationPermission = NotificationPermission | 'unsupported'

/** How long a desktop alert stays up before closing itself. */
const AUTO_CLOSE_MS = 8000

export function browserNotificationPermission(): BrowserNotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

/**
 * Must run from a user gesture — browsers ignore the prompt otherwise, which is why
 * the portal asks from a button rather than on page load.
 */
export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (browserNotificationPermission() === 'unsupported') return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

/**
 * Pops a desktop alert for a freshly arrived notice. Clicking it focuses the tab and
 * opens the screen the notice is about; `onOpen` is where the caller navigates.
 * Nothing is shown unless the person has granted permission.
 */
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
      // Urgent notices stay until dismissed; the rest close themselves.
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
    // Some browsers throw when the tab is in a state that cannot show alerts; the
    // in-app feed still has the row, so there is nothing to recover.
  }
}
