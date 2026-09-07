import { Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '../../constants/formatting'
import { formatReportPeriodShort } from '../../constants/monthly-report'
import type { MonthlyReport } from '../../types/monthly-report'
import { DepartmentChip } from './ui/department-chip'
import { ReportStatusBadge } from './ui/report-status-badge'
import { ReportSubmissionListSkeleton } from './ui/report-submission-list-skeleton'

interface ReportSubmissionListProps {
  reports: MonthlyReport[]
  loading: boolean
  initialized: boolean
  /** True when the fetch failed, so an empty list isn't read as "no matches". */
  errored: boolean
  selectedId?: string
  onSelect: (report: MonthlyReport) => void
}

export function ReportSubmissionList({
  reports,
  loading,
  initialized,
  errored,
  selectedId,
  onSelect,
}: ReportSubmissionListProps) {
  const showSkeleton = !initialized || (loading && reports.length === 0)

  return (
    <div
      aria-busy={showSkeleton}
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white ring-1 ring-gray-200"
    >
      <div className="shrink-0 border-b border-gray-100 px-4 py-2.5">
        <p className="text-[11px] tracking-wider text-gray-500 uppercase">
          Submissions
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {showSkeleton && <ReportSubmissionListSkeleton />}

        {!showSkeleton && reports.length === 0 && (
          <p className="px-4 py-10 text-center text-[13px] text-gray-500">
            {errored
              ? 'Submissions could not be loaded.'
              : 'No submissions match the current filters.'}
          </p>
        )}

        {!showSkeleton &&
          reports.map((report) => (
            <button
              key={report.id}
              type="button"
              aria-pressed={report.id === selectedId}
              onClick={() => onSelect(report)}
              className={cn(
                'flex w-full flex-col gap-1.5 border-b border-gray-100 px-4 py-3 text-left transition-colors',
                'focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none focus-visible:-outline-offset-2',
                report.id === selectedId
                  ? 'bg-green-50/70'
                  : 'hover:bg-gray-50',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <DepartmentChip department={report.department} />
                  <span className="truncate text-[11px] text-gray-400 tabular-nums">
                    {report.reference}
                  </span>
                </span>
                <ReportStatusBadge status={report.status} />
              </div>

              <p className="truncate text-[13px] font-medium text-gray-900">
                {report.title}
              </p>

              <div className="flex items-center justify-between gap-2 text-[11px] text-gray-400">
                <span className="truncate">{report.submittedBy.name}</span>
                <span className="flex shrink-0 items-center gap-2 tabular-nums">
                  <span className="flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    {report.documents.length}
                  </span>
                  <span>{formatReportPeriodShort(report.period)}</span>
                </span>
              </div>

              <p className="text-[11px] text-gray-400">
                Submitted {formatRelativeTime(report.submittedAt)}
              </p>
            </button>
          ))}
      </div>
    </div>
  )
}
