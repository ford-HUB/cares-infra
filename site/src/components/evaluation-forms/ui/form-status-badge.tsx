import { cn } from '@/lib/utils'
import {
  FORM_STATUS_BADGE_STYLES,
  FORM_STATUS_DOT_STYLES,
  FORM_STATUS_LABELS,
  type FormStatus,
} from '../../../constants/evaluation-forms'

interface FormStatusBadgeProps {
  status: FormStatus
  className?: string
}

/** Whether volunteers can reach this questionnaire — the one state that gates it. */
export function FormStatusBadge({ status, className }: FormStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px]',
        FORM_STATUS_BADGE_STYLES[status],
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', FORM_STATUS_DOT_STYLES[status])} />
      {FORM_STATUS_LABELS[status]}
    </span>
  )
}
