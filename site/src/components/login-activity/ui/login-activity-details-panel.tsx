import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatRelativeTime, formatTimestamp } from '../../../constants/formatting'
import { LOGIN_SOURCE_LABELS } from '../../../constants/login-activity'
import type { LoginActivityEntry } from '../../../types/login-activity'
import { formatUserAgent } from '../../../utils/user-agent-label'
import { LoginOutcomeBadge } from './login-outcome-badge'

interface LoginActivityDetailsPanelProps {
  entry: LoginActivityEntry | null
  onClose: () => void
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-gray-100 px-5 py-4 last:border-b-0">
      <h4 className="mb-2 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
        {title}
      </h4>
      {children}
    </section>
  )
}

function Field({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <span className="shrink-0 text-[13px] text-gray-500">{label}</span>
      <span className="text-right text-[13px] font-medium break-words text-gray-900">
        {value === undefined || value === '' ? 'N/A' : value}
      </span>
    </div>
  )
}

/**
 * The full record for one attempt. Everything shown here is already loaded with the
 * row — the trail is append-only, so there is nothing to fetch or edit.
 */
export function LoginActivityDetailsPanel({
  entry,
  onClose,
}: LoginActivityDetailsPanelProps) {
  if (!entry) return null

  const name = [entry.firstName, entry.lastName].filter(Boolean).join(' ')

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        role="dialog"
        aria-label="Sign-in attempt details"
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-[30rem] max-w-full flex-col overflow-hidden bg-white shadow-xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-gray-900">
              {name || 'Unknown account'}
            </h3>
            <p className="mt-0.5 truncate text-[11px] text-gray-400">{entry.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign-in attempt details"
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <Section title="Outcome">
            <div className="flex flex-wrap gap-2">
              <LoginOutcomeBadge outcome={entry.outcome} />
            </div>
            {entry.failureReason && (
              <p className="mt-2 text-[13px] text-gray-700">{entry.failureReason}</p>
            )}
          </Section>

          <Section title="When">
            <Field label="Timestamp" value={formatTimestamp(entry.createdAt)} />
            <Field label="Relative" value={formatRelativeTime(entry.createdAt)} />
          </Section>

          <Section title="Account">
            <Field label="Name" value={name} />
            <Field label="Email submitted" value={entry.email} />
            <Field
              label="Role"
              value={entry.role ? <span className="capitalize">{entry.role}</span> : undefined}
            />
            <Field
              label="User ID"
              value={
                entry.userId ? (
                  <span className="font-mono text-xs">{entry.userId}</span>
                ) : undefined
              }
            />
          </Section>

          <Section title="Origin">
            <Field
              label="IP address"
              value={<span className="font-mono text-xs">{entry.ipAddress}</span>}
            />
            <Field label="Source" value={LOGIN_SOURCE_LABELS[entry.source] ?? entry.source} />
            <Field label="Device" value={formatUserAgent(entry.userAgent)} />
            <Field
              label="User agent"
              value={
                entry.userAgent ? (
                  <span className="font-mono text-[11px]">{entry.userAgent}</span>
                ) : undefined
              }
            />
            <Field
              label="Entry ID"
              value={<span className="font-mono text-xs">{entry.id}</span>}
            />
          </Section>
        </div>

        <p className="shrink-0 border-t border-gray-200 bg-gray-50 px-5 py-3 text-[12px] text-gray-500">
          Sign-in records are append-only — they cannot be edited or deleted from the portal.
        </p>
      </aside>
    </div>
  )
}
