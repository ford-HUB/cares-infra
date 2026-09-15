import { CalendarDays, FileStack, MessageSquareText, UserRound } from 'lucide-react'
import { formatTimestamp } from '../../constants/formatting'
import { formatReportPeriod } from '../../constants/monthly-report'
import type { MonthlyReport } from '../../types/monthly-report'
import { DocumentKindIcon } from './ui/document-kind-icon'
import { ReportStatusBadge } from './ui/report-status-badge'
import { ReportSubmissionListSkeleton } from './ui/report-submission-list-skeleton'

interface DepartmentReportListProps {
  /** Every report of the coordinator's college, newest upload first. */
  reports: MonthlyReport[]
  initialized: boolean
  errored: boolean
  /** Day picked on the calendar, `YYYY-MM-DD`, when the list is narrowed to one day. */
  selectedDay: string | null
  onClearDay: () => void
  onOpenDocument: (report: MonthlyReport, documentId: string) => void
}

/**
 * The department's monthly reports as a plain list — one row per report, every
 * status, with the files inline. There is nothing to file or move here; the row is
 * the record, and the calendar beside it says when each one went up.
 */
export function DepartmentReportList({
  reports,
  initialized,
  errored,
  selectedDay,
  onClearDay,
  onOpenDocument,
}: DepartmentReportListProps) {
  return (
    <div
      aria-busy={!initialized}
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white ring-1 ring-gray-200"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-4 py-2.5">
        <p className="text-[11px] tracking-wider text-gray-500 uppercase">
          {selectedDay ? `Uploaded ${formatTimestamp(selectedDay)}` : 'Monthly reports'}
        </p>
        {selectedDay ? (
          <button
            type="button"
            onClick={onClearDay}
            className="text-[11px] font-medium text-[var(--cares-primary)] underline-offset-2 hover:underline"
          >
            Show all days
          </button>
        ) : (
          initialized && (
            <p className="text-[11px] text-gray-400 tabular-nums">{reports.length} total</p>
          )
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!initialized && <ReportSubmissionListSkeleton />}

        {initialized && reports.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
              <FileStack className="h-5 w-5" />
            </span>
            <p className="text-[13px] font-medium text-gray-700">
              {errored
                ? 'Reports could not be loaded'
                : selectedDay
                  ? 'Nothing was uploaded that day'
                  : 'No monthly reports yet'}
            </p>
            <p className="max-w-xs text-[12px] text-gray-500">
              {errored
                ? 'Try again in a moment.'
                : selectedDay
                  ? 'Pick another day on the calendar, or show all days.'
                  : "Reports uploaded for your department will be listed here."}
            </p>
          </div>
        )}

        {initialized &&
          reports.map((report) => (
            <article
              key={report.id}
              className="border-b border-gray-100 px-4 py-3 last:border-b-0"
            >
              <div className="flex flex-wrap items-center gap-2">
                <ReportStatusBadge status={report.status} />
                <span className="text-[11px] text-gray-400 tabular-nums">
                  {report.reference}
                </span>
                <span className="ml-auto flex items-center gap-1 text-[11px] text-gray-400">
                  <CalendarDays className="h-3 w-3" />
                  Uploaded {formatTimestamp(report.submittedAt)}
                </span>
              </div>

              <p className="mt-1.5 truncate text-[13px] font-semibold text-gray-900">
                {report.title}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-gray-500">
                <span>{formatReportPeriod(report.period)}</span>
                <span className="text-gray-300">·</span>
                <span className="flex items-center gap-1">
                  <UserRound className="h-3 w-3 text-gray-400" />
                  {report.submittedBy.name}
                </span>
              </p>

              {report.status === 'returned' && report.decisionNote && (
                <p className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-[12px] leading-relaxed text-red-800">
                  <MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                  <span>{report.decisionNote}</span>
                </p>
              )}

              <ul className="mt-2 flex flex-wrap gap-1.5">
                {report.documents.map((document) => (
                  <li key={document.id}>
                    <button
                      type="button"
                      title={document.name}
                      onClick={() => onOpenDocument(report, document.id)}
                      className="flex max-w-56 items-center gap-1.5 rounded-md bg-gray-50 py-1 pr-2.5 pl-1 text-[11px] text-gray-700 ring-1 ring-gray-200 transition-colors hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
                    >
                      <DocumentKindIcon kind={document.kind} className="h-5 w-5 rounded" />
                      <span className="truncate">{document.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </article>
          ))}
      </div>
    </div>
  )
}
