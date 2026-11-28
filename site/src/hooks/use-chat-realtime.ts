import { useEffect } from 'react'
import { useAuthStore } from '../store/auth-store'
import { useChatStore } from '../store/chat-store'

/** Portal-wide so messages chime outside the chat page too. */
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
