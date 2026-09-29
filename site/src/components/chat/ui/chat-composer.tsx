import { Paperclip, Send } from 'lucide-react'
import { useRef, type ChangeEvent, type KeyboardEvent } from 'react'
import {
  CHAT_ATTACHMENT_ACCEPT,
  CHAT_COMPOSER_PLACEHOLDER,
  CHAT_MESSAGE_MAX_LENGTH,
} from '../../../constants/chat'
import type { ChatDraftAttachment } from '../../../types/chat'
import { ChatAttachmentChip } from './chat-attachment-chip'
import { ChatEmojiPicker } from './chat-emoji-picker'

interface ChatComposerProps {
  value: string
  attachments: ChatDraftAttachment[]
  disabled: boolean
  sending: boolean
  onChange: (value: string) => void
  onAttach: (files: FileList | File[]) => void
  onRemoveAttachment: (id: string) => void
  onSend: () => void
}

export function ChatComposer({
  value,
  attachments,
  disabled,
  sending,
  onChange,
  onAttach,
  onRemoveAttachment,
  onSend,
}: ChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const canSend =
    !disabled && !sending && (value.trim().length > 0 || attachments.length > 0)

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (canSend) onSend()
    }
  }

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) onAttach(event.target.files)
    // Reset so picking the same file twice still fires a change event.
    event.target.value = ''
  }

  /** Drops the emoji at the caret rather than at the end of the draft. */
  const handleEmoji = (emoji: string) => {
    const textarea = textareaRef.current
    const start = textarea?.selectionStart ?? value.length
    const end = textarea?.selectionEnd ?? value.length
    const next = `${value.slice(0, start)}${emoji}${value.slice(end)}`

    onChange(next.slice(0, CHAT_MESSAGE_MAX_LENGTH))
    requestAnimationFrame(() => {
      if (!textarea) return
      const caret = start + emoji.length
      textarea.focus()
      textarea.setSelectionRange(caret, caret)
    })
  }

  return (
    <div className="shrink-0 border-t border-[var(--cares-border)] bg-[var(--cares-card)] p-2">
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {attachments.map((attachment) => (
            <ChatAttachmentChip
              key={attachment.id}
              attachment={attachment}
              onRemove={onRemoveAttachment}
            />
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          accept={CHAT_ATTACHMENT_ACCEPT}
          onChange={handleFiles}
        />
        <button
          type="button"
          disabled={disabled}
          aria-label="Attach files"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-9 w-9 items-center justify-center rounded-[var(--cares-radius)] border border-[var(--cares-border)] text-[var(--cares-muted)] transition-colors hover:bg-[var(--cares-bg)] hover:text-[var(--cares-primary)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Paperclip size={16} />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          disabled={disabled}
          maxLength={CHAT_MESSAGE_MAX_LENGTH}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={CHAT_COMPOSER_PLACEHOLDER}
          className="max-h-24 min-h-9 flex-1 resize-y rounded-[var(--cares-radius)] border border-[var(--cares-border)] bg-[var(--cares-bg)] px-2.5 py-2 text-xs text-[var(--cares-body)] outline-none focus:border-[var(--cares-primary)] disabled:opacity-60"
        />

        <ChatEmojiPicker disabled={disabled} onSelect={handleEmoji} />

        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className="flex h-9 items-center gap-1.5 rounded-[var(--cares-radius)] bg-[var(--cares-primary)] px-3 text-xs font-medium text-white transition-colors hover:bg-[var(--cares-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={14} />
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  )
}
