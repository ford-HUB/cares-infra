import { cn } from '@/lib/utils'
import {
  REPORT_STATUS_BADGE_STYLES,
  REPORT_STATUS_LABELS,
} from '../../../constants/monthly-report'
import type { MonthlyReportStatus } from '../../../types/monthly-report'

interface ReportStatusBadgeProps {
  status: MonthlyReportStatus
  className?: string
}

/** Where the submission sits on the coordinator → director line. */
export function ReportStatusBadge({ status, className }: ReportStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-semibold',
        REPORT_STATUS_BADGE_STYLES[status],
        className,
      )}
    >
      {REPORT_STATUS_LABELS[status]}
    </span>
  )
}
