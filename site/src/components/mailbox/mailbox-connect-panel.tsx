import { Loader2, Mail } from 'lucide-react'
import {
  MAILBOX_CONNECT_BODY,
  MAILBOX_CONNECT_TITLE,
} from '../../constants/mailbox'
import { GoogleMark } from './ui/google-mark'

interface MailboxConnectPanelProps {
  connecting: boolean
  error: string | null
  onConnect: () => void
}

/** Shown whenever no Google account is linked — the page's default state. */
export function MailboxConnectPanel({
  connecting,
  error,
  onConnect,
}: MailboxConnectPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center rounded-[var(--cares-radius)] border border-[var(--cares-border)] bg-[var(--cares-card)] p-6 shadow-sm">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--cares-bg)]">
          <Mail size={22} className="text-[var(--cares-primary)]" />
        </div>

        <h2 className="mt-4 text-base font-semibold text-[var(--cares-heading)]">
          {MAILBOX_CONNECT_TITLE}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-[var(--cares-muted)]">
          {MAILBOX_CONNECT_BODY}
        </p>

        <button
          type="button"
          onClick={onConnect}
          disabled={connecting}
          className="mt-5 inline-flex items-center gap-2.5 rounded-[var(--cares-radius)] border border-[var(--cares-border)] bg-white px-4 py-2.5 text-xs font-medium text-[var(--cares-body)] shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {connecting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <GoogleMark />
          )}
          {connecting ? 'Opening Google…' : 'Sign in with Google'}
        </button>

        {error && (
          <p role="alert" className="mt-4 text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
