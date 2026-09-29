import { Inbox } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  REPORT_QUEUE_STATUSES,
  REPORT_STATUS_BAR_STYLES,
  REPORT_STATUS_FILTER_ALL,
  formatReportPeriod,
  type ReportStatusFilter,
} from '../../constants/monthly-report'
import type {
  MonthlyReportCounts,
  MonthlyReportStatus,
} from '../../types/monthly-report'
import { ReportStatusSegment } from './ui/report-status-segment'

interface MonthlyReportPipelineProps {
  counts: MonthlyReportCounts
  /** Period the counts cover, or null when every period is in view. */
  period: string | null
  status: ReportStatusFilter
  onStatusChange: (value: ReportStatusFilter) => void
}

/**
 * What the director opens this page to find out: how many coordinator submissions
 * are still waiting on a decision. The four stages are parts of one intake, so they
 * share a single bar instead of four equal-weight tiles — and each part filters the
 * queue below.
 */
export function MonthlyReportPipeline({
  counts,
  period,
  status,
  onStatusChange,
}: MonthlyReportPipelineProps) {
  const statusCounts: Record<MonthlyReportStatus, number> = {
    under_review: counts.underReview,
    returned: counts.returned,
    approved: counts.approved,
  }

  const share = (value: number) => (counts.total > 0 ? value / counts.total : 0)

  const toggle = (next: MonthlyReportStatus) =>
    onStatusChange(status === next ? REPORT_STATUS_FILTER_ALL : next)

  return (
    <TooltipProvider>
      <Card size="sm" className="mb-4 shrink-0 shadow-sm">
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3 lg:w-60 lg:shrink-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Inbox className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] tracking-wider text-gray-500 uppercase">
                Awaiting your review
              </p>
              <p className="flex items-baseline gap-1.5">
                <span className="text-2xl leading-tight font-semibold text-gray-900 tabular-nums">
                  {counts.underReview}
                </span>
                <span className="text-[13px] text-gray-400 tabular-nums">
                  of {counts.total} in the queue
                </span>
              </p>
              {/* Approved reports are gone from this screen, so the count says where
                  they went rather than sitting here as a segment nobody can act on. */}
              <p className="truncate text-[11px] text-gray-400 tabular-nums">
                {period ? formatReportPeriod(period) : 'All periods'} · {counts.approved}{' '}
                approved
              </p>
            </div>
          </div>

          <div className="hidden w-px self-stretch bg-gray-100 lg:block" />

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-gray-100">
              {REPORT_QUEUE_STATUSES.map((one) => (
                <div
                  key={one}
                  className={cn(
                    'h-full rounded-full transition-[width] duration-500',
                    REPORT_STATUS_BAR_STYLES[one],
                    status !== REPORT_STATUS_FILTER_ALL && status !== one && 'opacity-30',
                  )}
                  style={{ width: `${share(statusCounts[one]) * 100}%` }}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1 sm:flex-nowrap">
              {REPORT_QUEUE_STATUSES.map((one) => (
                <ReportStatusSegment
                  key={one}
                  status={one}
                  value={statusCounts[one]}
                  share={share(statusCounts[one])}
                  active={status === one}
                  onToggle={toggle}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
