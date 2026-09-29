import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { REQUEST_ACCESS_EMAIL_BODY } from '../../../constants/request-access'

export function MessageFormatCollapsible() {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-lg border border-[var(--cares-border)] bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left"
      >
        <span className="text-[11px] font-semibold text-[var(--cares-heading)]">
          Message format
        </span>
        <ChevronDown
          className={[
            'h-3.5 w-3.5 shrink-0 text-[var(--cares-muted)] transition-transform',
            open ? 'rotate-180' : '',
          ].join(' ')}
        />
      </button>
      {open && (
        <pre className="max-h-36 overflow-y-auto border-t border-[var(--cares-border)] px-2.5 py-2 font-mono text-[10px] leading-snug whitespace-pre-wrap text-[var(--cares-body)]">
          {REQUEST_ACCESS_EMAIL_BODY}
        </pre>
      )}
    </div>
  )
}
