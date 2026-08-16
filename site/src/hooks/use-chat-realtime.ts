import { useEffect } from 'react'
import { useAuthStore } from '../store/auth-store'
import { useChatStore } from '../store/chat-store'

/**
 * Holds the chat socket open for the whole portal session, not just the chat
 * page — otherwise a message from a director only chimes if you happen to be
 * looking at the conversation list.
 */
export function useChatRealtime() {
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const connect = useChatStore((s) => s.connect)
  const disconnect = useChatStore((s) => s.disconnect)

  useEffect(() => {
    if (!userId) return

    connect(userId)
    return () => disconnect()
  }, [connect, disconnect, userId])
}
