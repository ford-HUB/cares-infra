import { formatRelativeTime } from '../../../constants/formatting'
import type { ChatMessage } from '../../../types/chat'
import { ChatMessageAttachments } from './chat-message-attachments'

interface ChatMessageBubbleProps {
  message: ChatMessage
  outgoing: boolean
}

export function ChatMessageBubble({
  message,
  outgoing,
}: ChatMessageBubbleProps) {
  return (
    <div className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[70%] lg:max-w-[60%]">
        <div
          className={[
            'rounded-[var(--cares-radius)] px-3 py-2 text-xs leading-relaxed',
            outgoing
              ? 'bg-[var(--cares-primary)] text-white'
              : 'border border-[var(--cares-border)] bg-[var(--cares-card)] text-[var(--cares-body)]',
          ].join(' ')}
        >
          {message.body && <p>{message.body}</p>}
          {message.attachments.length > 0 && (
            <ChatMessageAttachments
              attachments={message.attachments}
              outgoing={outgoing}
            />
          )}
        </div>
        <p
          className={`mt-0.5 text-[10px] text-[var(--cares-muted)] ${
            outgoing ? 'text-right' : 'text-left'
          }`}
        >
          {formatRelativeTime(message.sentAt)}
        </p>
      </div>
    </div>
  )
}
