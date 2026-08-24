import { Check, Copy, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { formatRelativeTime, formatTimestamp } from '../../../constants/formatting'
import type { IssuedCredentials } from '../../../types/manage-users'

interface IssuedCredentialsPanelProps {
  credentials: IssuedCredentials
}

/** How long the "copied" tick stays up before the button goes back to its idle state. */
const COPIED_FEEDBACK_MS = 1500

function CredentialRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS)
    } catch {
      // Clipboard access can be refused; the value is on screen to be read either way.
      setCopied(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium tracking-wide text-gray-500 uppercase">
          {label}
        </p>
        <p className="truncate font-mono text-[13px] text-gray-900">{value}</p>
      </div>

      <button
        type="button"
        onClick={() => void copy()}
        aria-label={`Copy ${label.toLowerCase()}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-[var(--cares-primary)]" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  )
}

/**
 * The credential as issued. It is shown once — the password is stored hashed, so
 * nothing can read it back and an administrator who closes this has to re-issue.
 */
export function IssuedCredentialsPanel({ credentials }: IssuedCredentialsPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2.5 rounded-lg bg-amber-50 px-3 py-2.5 text-[12px] text-amber-800">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Copy these now — the password is stored hashed and cannot be shown again.
          Hand them to the requester directly.
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-gray-200 p-3">
        <CredentialRow label="Email" value={credentials.email} />
        <CredentialRow label="Temporary password" value={credentials.password} />
      </div>

      <p className="text-[12px] text-gray-500">
        Expires {formatTimestamp(credentials.expiresAt)} (
        {formatRelativeTime(credentials.expiresAt)}). After that, sign-in is refused
        until an administrator issues new credentials.
      </p>
    </div>
  )
}
