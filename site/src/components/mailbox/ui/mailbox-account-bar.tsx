import { Loader2, LogOut } from 'lucide-react'
import { GoogleMark } from './google-mark'

interface MailboxAccountBarProps {
  email: string | null
  disconnecting: boolean
  onDisconnect: () => void
}

/** Names the linked Google account and gives the admin the way back out of it. */
export function MailboxAccountBar({
  email,
  disconnecting,
  onDisconnect,
}: MailboxAccountBarProps) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-[var(--cares-border)] bg-[var(--cares-card)] px-3 py-2">
      <GoogleMark size={14} />
      <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--cares-muted)]">
        Connected as{' '}
        <span className="font-medium text-[var(--cares-body)]">{email}</span>
      </span>

      <button
        type="button"
        onClick={onDisconnect}
        disabled={disconnecting}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--cares-radius)] border border-[var(--cares-border)] px-2.5 py-1 text-[11px] text-[var(--cares-body)] transition hover:bg-[var(--cares-bg)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {disconnecting ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <LogOut size={12} />
        )}
        {disconnecting ? 'Signing out…' : 'Sign out of Google'}
      </button>
    </div>
  )
}
