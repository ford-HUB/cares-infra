import { io, type Socket } from 'socket.io-client'
import {
  NOTIFICATION_SOCKET_EVENTS,
  NOTIFICATION_SOCKET_NAMESPACE,
} from '../constants/notifications-socket'
import { TOKEN_KEY } from '../constants/session'
import type { NotificationApiResponse } from './notification-service'

export interface NotificationSocketHandlers {
  onNew: (event: NotificationApiResponse) => void
  onUnread: (event: { unread: number }) => void
}

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

let socket: Socket | null = null

/**
 * One shared connection for the tab. The gateway authenticates the handshake
 * token, so a missing token means there is nothing to connect for.
 */
export function connectNotificationSocket(
  handlers: NotificationSocketHandlers,
): Socket | null {
  const token = sessionStorage.getItem(TOKEN_KEY)
  if (!token) return null

  if (socket) {
    socket.removeAllListeners()
  } else {
    socket = io(`${baseUrl}${NOTIFICATION_SOCKET_NAMESPACE}`, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
    })
  }

  socket.on(NOTIFICATION_SOCKET_EVENTS.new, handlers.onNew)
  socket.on(NOTIFICATION_SOCKET_EVENTS.unread, handlers.onUnread)

  return socket
}

export function disconnectNotificationSocket(): void {
  socket?.removeAllListeners()
  socket?.disconnect()
  socket = null
}
