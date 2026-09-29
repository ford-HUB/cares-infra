import { CHAT_PRESENCE_DOT } from '../../../constants/chat'
import type { ChatPresence } from '../../../types/chat'

interface ChatAvatarProps {
  firstName: string
  lastName: string
  presence: ChatPresence
  size?: 'sm' | 'md'
}

export function ChatAvatar({
  firstName,
  lastName,
  presence,
  size = 'sm',
}: ChatAvatarProps) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  const box = size === 'md' ? 'h-9 w-9 text-xs' : 'h-8 w-8 text-[10px]'

  return (
    <span className="relative shrink-0">
      <span
        className={`flex ${box} items-center justify-center rounded-full bg-[var(--cares-primary)]/10 font-semibold text-[var(--cares-primary)]`}
      >
        {initials}
      </span>
      <span
        className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--cares-card)] ${CHAT_PRESENCE_DOT[presence]}`}
      />
    </span>
  )
}
