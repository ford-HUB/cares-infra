import {
  CalendarDays,
  CheckCircle2,
  Eye,
  FileStack,
  HeartHandshake,
  Hourglass,
  RotateCcw,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  formatFileSize,
  formatNumber,
  formatTimestamp,
} from '../../constants/formatting'
import {
  DOCUMENT_KIND_LABELS,
  REPORT_TRAIL_DOT_STYLES,
  REPORT_TRAIL_LABELS,
  formatReportPeriod,
} from '../../constants/monthly-report'
import type { MonthlyReport, ReportDocument } from '../../types/monthly-report'
import { UserAvatar } from '../portal/ui/user-avatar'
import { DepartmentChip } from './ui/department-chip'
import { DocumentKindIcon } from './ui/document-kind-icon'
import { ReportStatusBadge } from './ui/report-status-badge'
import { ReportReviewPanelSkeleton } from './ui/report-review-panel-skeleton'

interface ReportReviewPanelProps {
  report: MonthlyReport | null
  initialized: boolean
  saving: boolean
  onOpenDocument: (document: ReportDocument) => void
  onApprove: () => void
  onReturn: () => void
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <p className="flex items-center gap-1.5 text-[10px] tracking-wider text-gray-500 uppercase">
        <Icon className="h-3 w-3 text-gray-400" />
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-0.5 text-[15px] leading-tight font-semibold text-gray-900 tabular-nums">
        {value}
      </p>
    </div>
  )
}

/**
 * The review side of the screen: who filed what, the figures they are claiming, the
 * files behind those figures, and the decision. Reading the document is the point of
 * the panel, so "Open Docs" sits on every attachment rather than behind a menu.
 */
export function ReportReviewPanel({
  report,
  initialized,
  saving,
  onOpenDocument,
  onApprove,
  onReturn,
}: ReportReviewPanelProps) {
  if (!initialized) return <ReportReviewPanelSkeleton />

  if (!report) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-xl bg-white px-6 text-center ring-1 ring-gray-200">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
          <FileStack className="h-5 w-5" />
        </span>
        <p className="text-[13px] font-medium text-gray-700">Nothing to review</p>
        <p className="max-w-xs text-[12px] text-gray-500">
          Pick a submission on the left, or clear the filters to see the rest of the
          coordinators' reports.
        </p>
      </div>
    )
  }

  const decided = report.status === 'approved' || report.status === 'returned'

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white ring-1 ring-gray-200">
      <header className="shrink-0 border-b border-gray-100 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <DepartmentChip department={report.department} />
              <ReportStatusBadge status={report.status} />
              <span className="text-[11px] text-gray-400 tabular-nums">
                {report.reference}
              </span>
            </div>
            <h2 className="truncate text-[14px] font-semibold text-gray-900">
              {report.title}
            </h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-500">
              <CalendarDays className="h-3 w-3 text-gray-400" />
              {formatReportPeriod(report.period)}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {report.status === 'under_review' && (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={onReturn}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 text-[12px] text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Return
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={onApprove}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 text-[12px] font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve
                </button>
              </>
            )}

            {report.status === 'returned' && (
              <button
                type="button"
                disabled={saving}
                onClick={onApprove}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 text-[12px] font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Approve anyway
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3.5">
        <div className="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2.5">
          <UserAvatar
            firstName={report.submittedBy.name.split(' ')[0]}
            lastName={report.submittedBy.name.split(' ').slice(-1)[0]}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-gray-900">
              {report.submittedBy.name}
            </p>
            <p className="truncate text-[11px] text-gray-500">
              {report.submittedBy.title} · {report.submittedBy.email}
            </p>
          </div>
          <div className="hidden shrink-0 text-right sm:block">
            <p className="text-[10px] tracking-wider text-gray-400 uppercase">
              Submitted
            </p>
            <p className="text-[11px] text-gray-600 tabular-nums">
              {formatTimestamp(report.submittedAt)}
            </p>
          </div>
        </div>

        {decided && (
          <div
            className={cn(
              'rounded-lg px-3 py-2.5',
              report.status === 'approved' ? 'bg-emerald-50' : 'bg-red-50',
            )}
          >
            <p
              className={cn(
                'text-[10px] tracking-wider uppercase',
                report.status === 'approved' ? 'text-emerald-700' : 'text-red-700',
              )}
            >
              {report.status === 'approved' ? 'Approved' : 'Returned'} by{' '}
              {report.reviewer ?? 'the director'}
              {report.decidedAt ? ` · ${formatTimestamp(report.decidedAt)}` : ''}
            </p>
            {report.decisionNote && (
              <p
                className={cn(
                  'mt-1 text-[12px]',
                  report.status === 'approved' ? 'text-emerald-900' : 'text-red-900',
                )}
              >
                {report.decisionNote}
              </p>
            )}
          </div>
        )}

        <section>
          <p className="mb-1 text-[10px] tracking-wider text-gray-500 uppercase">
            Coordinator summary
          </p>
          <p className="text-[12px] leading-5 text-gray-700">{report.summary}</p>
        </section>

        <section>
          <p className="mb-1.5 text-[10px] tracking-wider text-gray-500 uppercase">
            Reported figures
          </p>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Metric
              icon={CalendarDays}
              label="Events"
              value={formatNumber(report.metrics.events)}
            />
            <Metric
              icon={Users}
              label="Volunteers"
              value={formatNumber(report.metrics.volunteers)}
            />
            <Metric
              icon={Hourglass}
              label="Service hours"
              value={formatNumber(report.metrics.serviceHours)}
            />
            <Metric
              icon={HeartHandshake}
              label="Beneficiaries"
              value={formatNumber(report.metrics.beneficiaries)}
            />
          </div>
        </section>

        <section>
          <p className="mb-1.5 text-[10px] tracking-wider text-gray-500 uppercase">
            Submitted documents ({report.documents.length})
          </p>
          <ul className="space-y-2">
            {report.documents.map((document) => (
                <li
                  key={document.id}
                  className="flex items-center gap-2.5 rounded-lg border border-gray-200 px-3 py-2"
                >
                  <DocumentKindIcon kind={document.kind} className="h-8 w-8" />
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-[12px] font-medium text-gray-900"
                      title={document.name}
                    >
                      {document.name}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {DOCUMENT_KIND_LABELS[document.kind]} ·{' '}
                      {formatFileSize(document.sizeBytes)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenDocument(document)}
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 text-[12px] font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Open Docs
                  </button>
                </li>
            ))}
          </ul>
        </section>

        <section>
          <p className="mb-1.5 text-[10px] tracking-wider text-gray-500 uppercase">
            Review trail
          </p>
          <ol className="space-y-2.5">
            {report.trail.map((entry, index) => (
              <li key={entry.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                      REPORT_TRAIL_DOT_STYLES[entry.action],
                    )}
                  />
                  {index < report.trail.length - 1 && (
                    <span className="mt-1 w-px flex-1 bg-gray-200" />
                  )}
                </div>
                <div className="min-w-0 pb-1">
                  <p className="text-[12px] text-gray-800">
                    {REPORT_TRAIL_LABELS[entry.action]}
                    <span className="text-gray-400"> · {entry.actor}</span>
                  </p>
                  <p className="text-[10px] text-gray-400 tabular-nums">
                    {formatTimestamp(entry.createdAt)}
                  </p>
                  {entry.note && (
                    <p className="mt-1 text-[11px] text-gray-600">{entry.note}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  )
}
