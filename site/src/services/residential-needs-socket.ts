import { io, type Socket } from 'socket.io-client'
import {
  RESIDENTIAL_NEEDS_CHANGED_EVENT,
  RESIDENTIAL_NEEDS_SOCKET_NAMESPACE,
} from '../constants/residential-needs'
import { TOKEN_KEY } from '../constants/session'

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

let socket: Socket | null = null
const listeners = new Set<() => void>()

/**
 * Calls `onChanged` whenever a beneficiary submits or updates a Needs Assessment
 * Survey. One connection is shared by every screen that subscribes and closed
 * when the last one leaves. Returns the unsubscribe.
 */
export function subscribeToResidentialNeeds(onChanged: () => void): () => void {
  listeners.add(onChanged)

  if (!socket) {
    const token = sessionStorage.getItem(TOKEN_KEY)
    if (token) {
      socket = io(`${baseUrl}${RESIDENTIAL_NEEDS_SOCKET_NAMESPACE}`, {
        auth: { token },
        transports: ['websocket'],
        autoConnect: true,
      })
      socket.on(RESIDENTIAL_NEEDS_CHANGED_EVENT, () => {
        listeners.forEach((listener) => listener())
      })
    }
  }

  return () => {
    listeners.delete(onChanged)
    if (listeners.size === 0) {
      socket?.removeAllListeners()
      socket?.disconnect()
      socket = null
    }
  }
}
