import {
  formatDateShort,
  formatNumber,
  formatPercent,
} from '../../../constants/formatting'
import type { TopEvent } from '../../../types/department-statistics'
import { ChartCard } from './chart-card'

interface TopEventsTableProps {
  events: TopEvent[]
}

const headerClass =
  'px-3 py-2 text-[11px] font-medium tracking-wider text-gray-500 uppercase'
const cellClass = 'px-3 py-2 text-[13px] text-gray-700'

/** The department's best-attended events this period — the table view behind the charts. */
export function TopEventsTable({ events }: TopEventsTableProps) {
  return (
    <ChartCard
      title="Top events by attendance"
      description="The events that drew the most completed attendance in the period."
    >
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[520px] table-fixed border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className={`${headerClass} w-[38%]`}>Event</th>
              <th className={`${headerClass} w-[20%]`}>Date</th>
              <th className={`${headerClass} text-right`}>Registered</th>
              <th className={`${headerClass} text-right`}>Attended</th>
              <th className={`${headerClass} text-right`}>Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {events.map((event) => {
              const rate =
                event.registrations > 0 ? event.attended / event.registrations : 0
              return (
                <tr key={event.id} className="transition-colors hover:bg-gray-50">
                  <td className={cellClass}>
                    <span className="block truncate font-medium text-gray-900">
                      {event.title}
                    </span>
                    <span className="block truncate text-[11px] text-gray-400">
                      {event.category}
                    </span>
                  </td>
                  <td className={`${cellClass} whitespace-nowrap text-gray-500`}>
                    {formatDateShort(event.date)}
                  </td>
                  <td className={`${cellClass} text-right tabular-nums`}>
                    {formatNumber(event.registrations)}
                  </td>
                  <td className={`${cellClass} text-right tabular-nums`}>
                    <span className="font-semibold text-gray-900">
                      {formatNumber(event.attended)}
                    </span>
                    <span className="ml-1.5 text-[11px] text-gray-400">
                      {formatPercent(rate)}
                    </span>
                  </td>
                  <td className={`${cellClass} text-right tabular-nums`}>
                    {formatNumber(event.serviceHours)}
                  </td>
                </tr>
              )
            })}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[13px] text-gray-400">
                  No events in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ChartCard>
  )
}
