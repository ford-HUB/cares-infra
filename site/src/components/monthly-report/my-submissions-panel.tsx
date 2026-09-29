import { CalendarDays, FileStack, MessageSquareText, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '../../constants/formatting'
import {
  REPORT_STATUS_BAR_STYLES,
  REPORT_STATUS_LABELS,
  REPORT_STATUS_ORDER,
  REPORT_STATUS_SUBMITTER_HINTS,
  formatReportPeriod,
} from '../../constants/monthly-report'
import type { MonthlyReport, MonthlyReportStatus } from '../../types/monthly-report'
import { DepartmentChip } from './ui/department-chip'
import { DocumentKindIcon } from './ui/document-kind-icon'
import { ReportStatusBadge } from './ui/report-status-badge'
import { ReportSubmissionListSkeleton } from './ui/report-submission-list-skeleton'

interface MySubmissionsPanelProps {
  /** This coordinator's reports only, newest movement first. */
  reports: MonthlyReport[]
  initialized: boolean
  errored: boolean
  onOpenDocument: (report: MonthlyReport, documentId: string) => void
}

/**
 * The status side of Upload Report: every report this coordinator has sent, where
 * each one sits with the director, and — when one comes back — the note explaining
 * why. Approved reports stay listed here as the coordinator's own record.
 */
export function MySubmissionsPanel({
  reports,
  initialized,
  errored,
  onOpenDocument,
}: MySubmissionsPanelProps) {
  const counts = REPORT_STATUS_ORDER.map((status) => ({
    status,
    count: reports.filter((report) => report.status === status).length,
  }))

  return (
    <div
      aria-busy={!initialized}
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white ring-1 ring-gray-200"
    >
      <header className="shrink-0 border-b border-gray-100 px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[11px] tracking-wider text-gray-500 uppercase">
            Uploaded reports
          </p>
          {initialized && (
            <p className="text-[11px] text-gray-400 tabular-nums">
              {reports.length} total
            </p>
          )}
        </div>

        {/* One tile per status so the coordinator sees at a glance what is still
            with the director and what needs a corrected copy. */}
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {counts.map(({ status, count }) => (
            <StatusTile key={status} status={status} count={count} initialized={initialized} />
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!initialized && <ReportSubmissionListSkeleton />}

        {initialized && reports.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
              <FileStack className="h-5 w-5" />
            </span>
            <p className="text-[13px] font-medium text-gray-700">
              {errored ? 'Your reports could not be loaded' : 'Nothing uploaded yet'}
            </p>
            <p className="max-w-xs text-[12px] text-gray-500">
              {errored
                ? 'Try again in a moment.'
                : 'Your first monthly report will show here with its review status.'}
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
                <DepartmentChip department={report.department} />
                <ReportStatusBadge status={report.status} />
                <span className="text-[11px] text-gray-400 tabular-nums">
                  {report.reference}
                </span>
                <span className="ml-auto text-[11px] text-gray-400">
                  {formatRelativeTime(report.updatedAt)}
                </span>
              </div>

              <p className="mt-1.5 truncate text-[13px] font-semibold text-gray-900">
                {report.title}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-500">
                <CalendarDays className="h-3 w-3 text-gray-400" />
                {formatReportPeriod(report.period)}
                <span className="text-gray-300">·</span>
                {REPORT_STATUS_SUBMITTER_HINTS[report.status]}
              </p>

              {report.status === 'returned' && report.decisionNote && (
                <p className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-[12px] leading-relaxed text-red-800">
                  <MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                  <span>
                    <span className="font-semibold">
                      {report.reviewer ? `${report.reviewer}: ` : 'Director: '}
                    </span>
                    {report.decisionNote}
                  </span>
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
                {report.documents.length === 0 && (
                  <li className="flex items-center gap-1 text-[11px] text-gray-400">
                    <Paperclip className="h-3 w-3" /> No files
                  </li>
                )}
              </ul>
            </article>
          ))}
      </div>
    </div>
  )
}

function StatusTile({
  status,
  count,
  initialized,
}: {
  status: MonthlyReportStatus
  count: number
  initialized: boolean
}) {
  return (
    <div className="rounded-lg bg-gray-50 px-2.5 py-2">
      <p className="flex items-center gap-1.5 text-[10px] tracking-wider text-gray-500 uppercase">
        <span
          aria-hidden
          className={cn('h-1.5 w-1.5 rounded-full', REPORT_STATUS_BAR_STYLES[status])}
        />
        <span className="truncate">{REPORT_STATUS_LABELS[status]}</span>
      </p>
      <p className="mt-0.5 text-[15px] leading-tight font-semibold text-gray-900 tabular-nums">
        {initialized ? count : '—'}
      </p>
    </div>
  )
}
