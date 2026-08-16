import { Smile } from 'lucide-react'
import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Skeleton } from '../../ui/skeleton'
import {
  CHAT_EMOJI_PICKER_HEIGHT,
  CHAT_EMOJI_PICKER_WIDTH,
} from '../../../constants/chat'

// The emoji set is heavy; keep it out of the main bundle until the picker opens.
const EmojiPicker = lazy(() => import('emoji-picker-react'))

interface ChatEmojiPickerProps {
  disabled: boolean
  onSelect: (emoji: string) => void
}

export function ChatEmojiPicker({ disabled, onSelect }: ChatEmojiPickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-label="Insert emoji"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-9 w-9 items-center justify-center rounded-[var(--cares-radius)] border border-[var(--cares-border)] text-[var(--cares-muted)] transition-colors hover:bg-[var(--cares-bg)] hover:text-[var(--cares-primary)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Smile size={16} />
      </button>

      {open && (
        <div className="absolute bottom-11 right-0 z-20 overflow-hidden rounded-[var(--cares-radius)] border border-[var(--cares-border)] bg-[var(--cares-card)] shadow-lg">
          <Suspense
            fallback={
              <Skeleton
                style={{
                  width: CHAT_EMOJI_PICKER_WIDTH,
                  height: CHAT_EMOJI_PICKER_HEIGHT,
                }}
              />
            }
          >
            <EmojiPicker
              width={CHAT_EMOJI_PICKER_WIDTH}
              height={CHAT_EMOJI_PICKER_HEIGHT}
              lazyLoadEmojis
              skinTonesDisabled
              previewConfig={{ showPreview: false }}
              onEmojiClick={(emoji) => {
                onSelect(emoji.emoji)
                setOpen(false)
              }}
            />
          </Suspense>
        </div>
      )}
    </div>
  )
}
