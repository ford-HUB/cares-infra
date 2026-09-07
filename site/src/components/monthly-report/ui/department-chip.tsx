import { cn } from '@/lib/utils'
import {
  DEPARTMENT_CHIP_STYLES,
  DEPARTMENT_LABELS,
} from '../../../constants/monthly-report'
import type { ReportDepartment } from '../../../types/monthly-report'

interface DepartmentChipProps {
  department: ReportDepartment
  className?: string
}

/**
 * Identity, not status — the colour says which college filed the report, so it is
 * kept off the emerald/amber/red range the review states own.
 */
export function DepartmentChip({ department, className }: DepartmentChipProps) {
  return (
    <span
      title={DEPARTMENT_LABELS[department]}
      className={cn(
        'inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-semibold',
        DEPARTMENT_CHIP_STYLES[department],
        className,
      )}
    >
      {department}
    </span>
  )
}
