import { useMemo } from 'react'
import dayjs from 'dayjs'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  REPORT_STATUS_BAR_STYLES,
  REPORT_STATUS_LABELS,
  REPORT_STATUS_ORDER,
} from '../../../constants/monthly-report'
import type { MonthlyReport } from '../../../types/monthly-report'
import { monthGridDays } from '../../../utils/calendar-layout'

interface ReportUploadCalendarProps {
  /** The department's reports; each is marked on the day it was uploaded. */
  reports: MonthlyReport[]
  /** Month on show as `YYYY-MM`; null lets the calendar open on the latest upload. */
  month: string | null
  /** Fired by the month arrows — the page keeps its month filter in step with this. */
  onMonthChange: (month: string) => void
  /** `YYYY-MM-DD` of the day the list is narrowed to, if any. */
  selectedDay: string | null
  onSelectDay: (day: string | null) => void
}

const DAY_KEY = 'YYYY-MM-DD'
const MONTH_KEY = 'YYYY-MM'
const WEEKDAY_HEADINGS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/**
 * A month at a glance with a dot on every day a report went up, coloured by where
 * that report stands now. The month shown is the month the list is filtered to —
 * the arrows here and the month picker in the toolbar move the same thing. Picking
 * a day narrows the list further; picking it again lets go. With no month chosen
 * the calendar opens on the most recent upload, not on today, so a coordinator
 * catching up in a quiet month still lands on something.
 */
export function ReportUploadCalendar({
  reports,
  month,
  onMonthChange,
  selectedDay,
  onSelectDay,
}: ReportUploadCalendarProps) {
  const uploadsByDay = useMemo(() => {
    const map = new Map<string, MonthlyReport[]>()
    reports.forEach((report) => {
      const key = dayjs(report.submittedAt).format(DAY_KEY)
      map.set(key, [...(map.get(key) ?? []), report])
    })
    return map
  }, [reports])

  const latestUpload = useMemo(
    () =>
      reports.reduce<string | null>(
        (latest, report) =>
          !latest || report.submittedAt > latest ? report.submittedAt : latest,
        null,
      ),
    [reports],
  )

  const cursor = dayjs(month ? `${month}-01` : (latestUpload ?? undefined)).startOf('month')

  const days = monthGridDays(cursor)
  const today = dayjs().format(DAY_KEY)
  const monthUploads = reports.filter((report) =>
    dayjs(report.submittedAt).isSame(cursor, 'month'),
  ).length

  return (
    <div className="rounded-xl bg-white ring-1 ring-gray-200">
      <header className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2.5">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => onMonthChange(cursor.subtract(1, 'month').format(MONTH_KEY))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="text-[13px] font-semibold text-gray-900">
            {cursor.format('MMMM YYYY')}
          </p>
          <p className="text-[11px] text-gray-400 tabular-nums">
            {monthUploads} upload{monthUploads === 1 ? '' : 's'}
          </p>
        </div>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => onMonthChange(cursor.add(1, 'month').format(MONTH_KEY))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </header>

      <div className="px-3 pt-2 pb-3">
        <div className="grid grid-cols-7 text-center">
          {WEEKDAY_HEADINGS.map((heading, index) => (
            <span
              key={`${heading}-${index}`}
              className="py-1 text-[10px] font-semibold tracking-wider text-gray-400"
            >
              {heading}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-0.5">
          {days.map((day) => {
            const key = day.format(DAY_KEY)
            const uploads = uploadsByDay.get(key) ?? []
            const inMonth = day.isSame(cursor, 'month')
            const selected = key === selectedDay
            const isToday = key === today

            return (
              <button
                key={key}
                type="button"
                disabled={uploads.length === 0}
                aria-pressed={selected}
                aria-label={
                  uploads.length > 0
                    ? `${day.format('MMMM D')} — ${uploads.length} upload${uploads.length === 1 ? '' : 's'}`
                    : day.format('MMMM D')
                }
                title={uploads.map((report) => report.reference).join(', ') || undefined}
                onClick={() => onSelectDay(selected ? null : key)}
                className={cn(
                  'mx-auto flex h-9 w-9 flex-col items-center justify-center rounded-lg text-[12px] tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none',
                  !inMonth && 'text-gray-300',
                  inMonth && uploads.length === 0 && 'text-gray-500',
                  uploads.length > 0 &&
                    !selected &&
                    'font-semibold text-gray-900 hover:bg-[var(--cares-primary)]/10',
                  selected && 'bg-[var(--cares-primary)] font-semibold text-white',
                  isToday && !selected && 'ring-1 ring-[var(--cares-primary)]/50',
                )}
              >
                <span className="leading-none">{day.date()}</span>
                {uploads.length > 0 && (
                  <span className="mt-1 flex items-center gap-0.5">
                    {uploads.slice(0, 3).map((report) => (
                      <span
                        key={report.id}
                        aria-hidden
                        className={cn(
                          'h-1 w-1 rounded-full',
                          selected ? 'bg-white' : REPORT_STATUS_BAR_STYLES[report.status],
                        )}
                      />
                    ))}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <ul className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-100 pt-2">
          {REPORT_STATUS_ORDER.map((status) => (
            <li key={status} className="flex items-center gap-1 text-[10px] text-gray-500">
              <span
                aria-hidden
                className={cn('h-1.5 w-1.5 rounded-full', REPORT_STATUS_BAR_STYLES[status])}
              />
              {REPORT_STATUS_LABELS[status]}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
