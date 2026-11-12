import { AlertTriangle, X } from 'lucide-react'
import { DIAGNOSTIC_GROUP_LABELS } from '../../constants/system-diagnostics'
import {
  SERVICE_HEALTH_BADGE_STYLES,
  SERVICE_HEALTH_DOT_STYLES,
  SERVICE_HEALTH_LABELS,
  SUCCESS_WARN_PERCENT,
  formatEventTime,
  formatMs,
  formatPercent,
} from '../../constants/system-usage'
import type { LiveSourceState, ServiceHealth, ServiceStatusRow } from '../../types/system-usage'
import { UsageCard } from './ui/usage-card'

interface ServiceUsageTableProps {
  rows: ServiceStatusRow[]
  total: number
  healthFilter: ServiceHealth | null
  onClearFilter: () => void
  source: LiveSourceState
}

const head = 'px-3 py-2 text-left text-[11px] font-medium tracking-wider text-gray-500 uppercase'
const cell = 'h-12 border-t border-gray-100 px-3 text-[13px] text-gray-700'

/**
 * Everything that can break, live: each diagnostics probe (database, cache, ML
 * services, queues) and each scheduler — worst first. Probes report their
 * round-trip; schedulers their median run time and how many recent runs succeeded.
 */
export function ServiceUsageTable({
  rows,
  total,
  healthFilter,
  onClearFilter,
  source,
}: ServiceUsageTableProps) {
  return (
    <UsageCard
      title="Services"
      hint="Live from the diagnostics sweep and the scheduler roster — worst first."
      aside={
        healthFilter && (
          <button
            type="button"
            onClick={onClearFilter}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-gray-600 transition-colors hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
          >
            {SERVICE_HEALTH_LABELS[healthFilter]} · {rows.length} of {total}
            <X className="h-3.5 w-3.5" />
          </button>
        )
      }
    >
      {total === 0 ? (
        <p className="py-8 text-center text-[13px] text-gray-500">
          {!source.allowed
            ? 'Your account can’t read the services or diagnostics.'
            : (source.error ?? 'No services reported yet.')}
        </p>
      ) : (
        <div className="-mx-4 overflow-x-auto">
          <table className="w-full min-w-[40rem]">
            <thead>
              <tr>
                <th className={`${head} pl-4`}>Service</th>
                <th className={head}>Status</th>
                <th className={`${head} text-right`}>Timing</th>
                <th className={`${head} text-right`}>Recent success</th>
                <th className={`${head} pr-4 text-right`}>Last activity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-gray-50">
                  <td className={`${cell} max-w-[18rem] pl-4`}>
                    <p className="truncate font-medium text-gray-900">{row.name}</p>
                    <p className="truncate text-[12px] text-gray-400">
                      {DIAGNOSTIC_GROUP_LABELS[row.kind]}
                      {row.note && ` · ${row.note}`}
                    </p>
                  </td>
                  <td className={cell}>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium whitespace-nowrap ${SERVICE_HEALTH_BADGE_STYLES[row.health]}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${SERVICE_HEALTH_DOT_STYLES[row.health]}`} />
                      {SERVICE_HEALTH_LABELS[row.health]}
                    </span>
                  </td>
                  <td className={`${cell} text-right tabular-nums`}>
                    {row.timing ? (
                      <>
                        {formatMs(row.timing.ms)}
                        <span className="ml-1 text-[11px] text-gray-400">{row.timing.label.toLowerCase()}</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className={`${cell} text-right tabular-nums`}>
                    {row.successRate === null ? (
                      '—'
                    ) : (
                      <span className="inline-flex items-center justify-end gap-1">
                        {row.successRate < SUCCESS_WARN_PERCENT && (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-label="Below target" />
                        )}
                        {formatPercent(row.successRate)}
                      </span>
                    )}
                  </td>
                  <td className={`${cell} pr-4 text-right text-[12px] whitespace-nowrap text-gray-500`}>
                    {row.lastActivityAt ? formatEventTime(row.lastActivityAt) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </UsageCard>
  )
}
