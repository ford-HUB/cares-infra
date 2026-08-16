import { io, type Socket } from 'socket.io-client'
import { CHAT_SOCKET_EVENTS, CHAT_SOCKET_NAMESPACE } from '../constants/chat'
import { TOKEN_KEY } from '../constants/session'
import type {
  ChatMessageEventApi,
  ChatPresenceEventApi,
  ChatPresenceListEventApi,
  ChatReadEventApi,
} from '../types/chat-api'

export interface ChatSocketHandlers {
  onMessage: (event: ChatMessageEventApi) => void
  onRead: (event: ChatReadEventApi) => void
  onPresence: (event: ChatPresenceEventApi) => void
  onPresenceList: (event: ChatPresenceListEventApi) => void
}

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

let socket: Socket | null = null

/**
 * One shared connection for the tab. The gateway authenticates the handshake
 * token, so a missing token means there is nothing to connect for.
 */
export function connectChatSocket(handlers: ChatSocketHandlers): Socket | null {
  const token = sessionStorage.getItem(TOKEN_KEY)
  if (!token) return null

  if (socket) {
    socket.removeAllListeners()
  } else {
    socket = io(`${baseUrl}${CHAT_SOCKET_NAMESPACE}`, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
    })
  }

  socket.on(CHAT_SOCKET_EVENTS.message, handlers.onMessage)
  socket.on(CHAT_SOCKET_EVENTS.read, handlers.onRead)
  socket.on(CHAT_SOCKET_EVENTS.presence, handlers.onPresence)
  socket.on(CHAT_SOCKET_EVENTS.presenceList, handlers.onPresenceList)

  return socket
}

export function disconnectChatSocket(): void {
  socket?.removeAllListeners()
  socket?.disconnect()
  socket = null
}
