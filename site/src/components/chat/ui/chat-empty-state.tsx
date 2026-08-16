import { MessagesSquare, UserPlus } from 'lucide-react'
import {
  CHAT_NO_HISTORY_BODY,
  CHAT_NO_HISTORY_TITLE,
  CHAT_NO_SELECTION_BODY,
  CHAT_NO_SELECTION_TITLE,
} from '../../../constants/chat'

interface ChatEmptyStateProps {
  /** `no-selection` is the page default; `no-history` is a never-messaged contact. */
  variant: 'no-selection' | 'no-history'
}

export function ChatEmptyState({ variant }: ChatEmptyStateProps) {
  const noSelection = variant === 'no-selection'
  const Icon = noSelection ? MessagesSquare : UserPlus

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--cares-primary)]/10">
        <Icon size={20} className="text-[var(--cares-primary)]" />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-[var(--cares-heading)]">
        {noSelection ? CHAT_NO_SELECTION_TITLE : CHAT_NO_HISTORY_TITLE}
      </h3>
      <p className="mt-1 max-w-xs text-xs text-[var(--cares-muted)]">
        {noSelection ? CHAT_NO_SELECTION_BODY : CHAT_NO_HISTORY_BODY}
      </p>
    </div>
  )
}
