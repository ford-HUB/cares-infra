import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useRecipientSuggestions } from '../../../hooks/use-recipient-suggestions'
import type { MailContact } from '../../../types/mailbox'

interface MailboxRecipientFieldProps {
  value: string
  placeholder: string
  className: string
  onChange: (value: string) => void
  onBlur: () => void
}

/** The address being typed is whatever follows the last comma. */
function fragmentStart(value: string): number {
  return value.lastIndexOf(',') + 1
}

export function MailboxRecipientField({
  value,
  placeholder,
  className,
  onChange,
  onBlur,
}: MailboxRecipientFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)

  const start = fragmentStart(value)
  const fragment = value.slice(start)
  const { suggestions, loading } = useRecipientSuggestions(fragment, open)

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // The first match is pre-selected, so Enter completes without arrowing down first.
  const activeIndex = highlighted < suggestions.length ? highlighted : 0

  /** Replaces the fragment being typed, leaving the caret ready for the next address. */
  const choose = (contact: MailContact) => {
    const head = value.slice(0, start)
    onChange(`${head}${head ? ' ' : ''}${contact.email}, `)
    setOpen(false)
    setHighlighted(0)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlighted((index) => (index + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlighted((index) => (index <= 0 ? suggestions.length - 1 : index - 1))
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      // Enter would otherwise send the message while the list is still open.
      event.preventDefault()
      choose(suggestions[activeIndex])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const showDropdown = open && (loading || suggestions.length > 0)

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        className={className}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
          setHighlighted(0)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      />

      {showDropdown && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-[var(--cares-radius)] border border-[var(--cares-border)] bg-[var(--cares-card)] shadow-lg">
          {loading && suggestions.length === 0 && (
            <li className="flex items-center gap-2 px-2.5 py-2 text-[11px] text-[var(--cares-muted)]">
              <Loader2 size={12} className="animate-spin" />
              Searching…
            </li>
          )}

          {suggestions.map((contact, index) => (
            <li key={contact.email}>
              <button
                type="button"
                // Keeps focus in the input so the blur handler does not fire first.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(contact)}
                onMouseEnter={() => setHighlighted(index)}
                className={`flex w-full flex-col items-start px-2.5 py-1.5 text-left ${
                  index === activeIndex ? 'bg-[var(--cares-bg)]' : ''
                }`}
              >
                <span className="text-xs font-medium text-[var(--cares-heading)]">
                  {contact.name}
                </span>
                <span className="text-[11px] text-[var(--cares-muted)]">
                  {contact.email}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
