import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  FORM_STATUS_BAR_STYLES,
  FORM_STATUS_HINTS,
  FORM_STATUS_LABELS,
  type FormStatus,
} from '../../../constants/evaluation-forms'
import { formatPercent } from '../../../constants/formatting'

interface FormStatusSegmentProps {
  status: FormStatus
  value: number
  /** Share of all questionnaires this status holds, 0–1. */
  share: number
  /** True while the list is filtered to this status. */
  active: boolean
  onToggle: (status: FormStatus) => void
}

/**
 * One status of the questionnaire library, as a legend entry under the split bar. It
 * doubles as the list's filter — clicking narrows it, clicking again clears it, which
 * is why this is a button rather than a plain tile.
 */
export function FormStatusSegment({
  status,
  value,
  share,
  active,
  onToggle,
}: FormStatusSegmentProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-pressed={active}
          onClick={() => onToggle(status)}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors',
            'focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none',
            active ? 'bg-gray-100' : 'hover:bg-gray-50',
          )}
        >
          <span
            className={cn(
              'h-7 w-1 shrink-0 rounded-full',
              FORM_STATUS_BAR_STYLES[status],
              !active && 'opacity-70',
            )}
          />
          <span className="min-w-0">
            <span className="block truncate text-[11px] tracking-wider text-gray-500 uppercase">
              {FORM_STATUS_LABELS[status]}
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-lg leading-tight font-semibold text-gray-900 tabular-nums">
                {value}
              </span>
              <span className="text-[12px] text-gray-400 tabular-nums">
                {formatPercent(share)}
              </span>
            </span>
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {FORM_STATUS_HINTS[status]}
        {active ? ' Click to clear the filter.' : ' Click to filter the list.'}
      </TooltipContent>
    </Tooltip>
  )
}
