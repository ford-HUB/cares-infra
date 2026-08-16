import { PenSquare } from 'lucide-react'
import { MAILBOX_FOLDERS } from '../../../constants/mailbox'
import type { MailFolder } from '../../../types/mailbox'

interface MailboxFolderSidebarProps {
  folder: MailFolder
  disabled: boolean
  onSelect: (folder: MailFolder) => void
  onCompose: () => void
}

export function MailboxFolderSidebar({
  folder,
  disabled,
  onSelect,
  onCompose,
}: MailboxFolderSidebarProps) {
  return (
    <aside className="flex w-full shrink-0 flex-row gap-1 border-b border-[var(--cares-border)] bg-[var(--cares-card)] p-2 md:w-48 md:flex-col md:border-b-0 md:border-r lg:w-56">
      <button
        type="button"
        onClick={onCompose}
        disabled={disabled}
        className="mb-0 inline-flex shrink-0 items-center gap-2 rounded-[var(--cares-radius)] bg-[var(--cares-primary)] px-3 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 md:mb-2 md:w-full"
      >
        <PenSquare size={14} />
        Compose
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
              className={`inline-flex shrink-0 items-center gap-2 rounded-[var(--cares-radius)] px-3 py-2 text-xs transition md:w-full ${
                active
                  ? 'bg-[var(--cares-bg)] font-semibold text-[var(--cares-primary)]'
                  : 'text-[var(--cares-body)] hover:bg-[var(--cares-bg)]'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
