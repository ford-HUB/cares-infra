import { useEffect, useRef } from 'react'
import { Skeleton } from '../../ui/skeleton'
import { CHAT_PRESENCE_LABEL, CHAT_ROLE_LABEL } from '../../../constants/chat'
import type { ChatContact, ChatMessage, ChatPresence } from '../../../types/chat'
import { ChatAvatar } from './chat-avatar'
import { ChatEmptyState } from './chat-empty-state'
import { ChatMessageBubble } from './chat-message-bubble'

interface ChatConversationProps {
  contact: ChatContact
  presence: ChatPresence
  messages: ChatMessage[]
  currentUserId: string | null
  hasHistory: boolean
  loading: boolean
}

export function ChatConversation({
  contact,
  presence,
  messages,
  currentUserId,
  hasHistory,
  loading,
}: ChatConversationProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, contact.id])

  return (
    <>
      <header className="flex shrink-0 items-center gap-2.5 border-b border-[var(--cares-border)] bg-[var(--cares-card)] px-3 py-2">
        <ChatAvatar
          firstName={contact.firstName}
          lastName={contact.lastName}
          presence={presence}
          size="md"
        />
        <div className="min-w-0">
          <h2 className="truncate text-xs font-semibold text-[var(--cares-heading)]">
            {contact.firstName} {contact.lastName}
          </h2>
          <p className="truncate text-[10px] text-[var(--cares-muted)]">
            {CHAT_ROLE_LABEL[contact.roleType]}
            {contact.department ? ` · ${contact.department}` : ''} ·{' '}
            {CHAT_PRESENCE_LABEL[presence]}
          </p>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--cares-bg)] p-3">
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-10 w-2/3 rounded-[var(--cares-radius)]" />
            <Skeleton className="ml-auto h-10 w-1/2 rounded-[var(--cares-radius)]" />
            <Skeleton className="h-10 w-3/5 rounded-[var(--cares-radius)]" />
          </div>
        )}

        {!loading && !hasHistory && <ChatEmptyState variant="no-history" />}

        {!loading && hasHistory && (
          <div className="space-y-2">
            {messages.map((message) => (
              <ChatMessageBubble
                key={message.id}
                message={message}
                outgoing={message.senderId === currentUserId}
              />
            ))}
          </div>
        )}

        <div ref={endRef} />
      </div>
    </>
  )
}
