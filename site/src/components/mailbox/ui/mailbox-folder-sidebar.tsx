import { PenSquare } from 'lucide-react'
import { MAILBOX_FOLDERS } from '../../../constants/mailbox'
import type { MailFolder } from '../../../types/mailbox'

interface MailboxFolderSidebarProps {
  folder: MailFolder
  disabled: boolean
  onSelect: (folder: MailFolder) => void
  onCompose: () => void
}

/** Collapsed rail on desktop: labels appear on hover, mobile keeps the icon+label row. */
const buttonClass =
  'inline-flex shrink-0 items-center gap-2 rounded-[var(--cares-radius)] px-3 py-2 text-xs transition md:w-full md:justify-center md:group-hover:justify-start'

const labelClass = 'whitespace-nowrap md:hidden md:group-hover:inline'

export function MailboxFolderSidebar({
  folder,
  disabled,
  onSelect,
  onCompose,
}: MailboxFolderSidebarProps) {
  return (
    // The rail stays in the flow and widens on hover, so the columns beside it move
    // across instead of being covered by the expanded labels.
    <aside className="group flex w-full shrink-0 flex-row gap-1 overflow-hidden border-b border-[var(--cares-border)] bg-[var(--cares-card)] p-2 md:w-14 md:flex-col md:border-b-0 md:border-r md:transition-[width] md:duration-200 md:hover:w-56">
      <button
        type="button"
        onClick={onCompose}
        disabled={disabled}
        title="Compose"
        className={`${buttonClass} mb-0 bg-[var(--cares-primary)] font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 md:mb-2`}
      >
        <PenSquare size={14} className="shrink-0" />
        <span className={labelClass}>Compose</span>
      </button>

      <nav className="flex flex-1 flex-row gap-1 overflow-x-auto md:flex-col md:overflow-visible">
        {MAILBOX_FOLDERS.map(({ value, label, icon: Icon }) => {
          const active = value === folder
          return (
            <button
              key={value}
              type="button"
              onClick={() => onSelect(value)}
              aria-current={active ? 'page' : undefined}
              title={label}
              className={`${buttonClass} ${
                active
                  ? 'bg-[var(--cares-bg)] font-semibold text-[var(--cares-primary)]'
                  : 'text-[var(--cares-body)] hover:bg-[var(--cares-bg)]'
              }`}
            >
              <Icon size={14} className="shrink-0" />
              <span className={labelClass}>{label}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
