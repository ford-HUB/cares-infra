import { ArrowRight, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatRelativeTime, formatTimestamp } from '../../../constants/formatting'
import type { AuditLogEntry } from '../../../types/audit-log'
import { AuditCategoryBadge, AuditOutcomeBadge, AuditSeverityBadge } from './audit-log-badges'

interface AuditLogDetailsPanelProps {
  entry: AuditLogEntry | null
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
 * The full record for one entry. Everything shown here is already loaded with the
 * row — an audit trail is append-only, so there is nothing to fetch or edit.
 */
export function AuditLogDetailsPanel({ entry, onClose }: AuditLogDetailsPanelProps) {
  if (!entry) return null

  const metadata = Object.entries(entry.metadata)

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        role="dialog"
        aria-label="Audit entry details"
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-[30rem] max-w-full flex-col overflow-hidden bg-white shadow-xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">{entry.description}</h3>
            <p className="mt-0.5 font-mono text-[11px] text-gray-400">{entry.action}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close audit entry details"
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <Section title="Classification">
            <div className="flex flex-wrap gap-2">
              <AuditCategoryBadge category={entry.category} />
              <AuditSeverityBadge severity={entry.severity} />
              <AuditOutcomeBadge outcome={entry.outcome} />
            </div>
          </Section>

          <Section title="When">
            <Field label="Timestamp" value={formatTimestamp(entry.createdAt)} />
            <Field label="Relative" value={formatRelativeTime(entry.createdAt)} />
          </Section>

          <Section title="Actor">
            <Field label="Name" value={entry.actor.name} />
            <Field label="Email" value={entry.actor.email} />
            <Field
              label="Role"
              value={<span className="capitalize">{entry.actor.role}</span>}
            />
            <Field
              label="User ID"
              value={<span className="font-mono text-xs">{entry.actor.id}</span>}
            />
          </Section>

          <Section title="Target">
            <Field
              label="Type"
              value={<span className="capitalize">{entry.target.type}</span>}
            />
            <Field label="Label" value={entry.target.label} />
            <Field
              label="Record ID"
              value={
                entry.target.id ? (
                  <span className="font-mono text-xs">{entry.target.id}</span>
                ) : undefined
              }
            />
          </Section>

          <Section title="Origin">
            <Field
              label="IP address"
              value={<span className="font-mono text-xs">{entry.ipAddress}</span>}
            />
            <Field label="Device" value={entry.userAgent} />
            <Field
              label="Source"
              value={<span className="capitalize">{entry.source}</span>}
            />
            <Field
              label="Request ID"
              value={<span className="font-mono text-xs">{entry.requestId}</span>}
            />
            <Field
              label="Entry ID"
              value={<span className="font-mono text-xs">{entry.id}</span>}
            />
          </Section>

          {entry.reason && (
            <Section title="Reason given">
              <p className="text-[13px] text-gray-700">{entry.reason}</p>
            </Section>
          )}

          {entry.changes.length > 0 && (
            <Section title="Changes">
              <ul className="space-y-2">
                {entry.changes.map((change) => (
                  <li
                    key={change.field}
                    className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                  >
                    <p className="font-mono text-[11px] text-gray-500">{change.field}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px]">
                      <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700 line-through">
                        {change.before ?? '—'}
                      </span>
                      <ArrowRight aria-hidden className="h-3 w-3 text-gray-400" />
                      <span className="rounded bg-green-50 px-1.5 py-0.5 text-green-700">
                        {change.after ?? '—'}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {metadata.length > 0 && (
            <Section title="Context">
              {metadata.map(([key, value]) => (
                <Field key={key} label={key} value={value} />
              ))}
            </Section>
          )}
        </div>

        <p className="shrink-0 border-t border-gray-200 bg-gray-50 px-5 py-3 text-[12px] text-gray-500">
          Audit entries are append-only — they cannot be edited or deleted from the portal.
        </p>
      </aside>
    </div>
  )
}
