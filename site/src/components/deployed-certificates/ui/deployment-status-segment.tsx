import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DEPLOYMENT_STATUS_BAR_STYLES,
  DEPLOYMENT_STATUS_HINTS,
  DEPLOYMENT_STATUS_LABELS,
} from '../../../constants/deployed-certificates'
import { formatPercent } from '../../../constants/formatting'
import type { DeploymentStatus } from '../../../types/deployed-certificate'

interface DeploymentStatusSegmentProps {
  status: DeploymentStatus
  value: number
  /** Share of all deployments this status holds, 0–1. */
  share: number
  /** True while the list is filtered to this status. */
  active: boolean
  onToggle: (status: DeploymentStatus) => void
}

/**
 * One status of the deployment log, as a legend entry under the split bar. It doubles
 * as the list's filter — clicking narrows the deployments, clicking again clears it,
 * which is why this is a button and not a plain tile.
 */
export function DeploymentStatusSegment({
  status,
  value,
  share,
  active,
  onToggle,
}: DeploymentStatusSegmentProps) {
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
              DEPLOYMENT_STATUS_BAR_STYLES[status],
              !active && 'opacity-70',
            )}
          />
          <span className="min-w-0">
            <span className="block truncate text-[11px] tracking-wider text-gray-500 uppercase">
              {DEPLOYMENT_STATUS_LABELS[status]}
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
        {DEPLOYMENT_STATUS_HINTS[status]}
        {active ? ' Click to clear the filter.' : ' Click to filter the list.'}
      </TooltipContent>
    </Tooltip>
  )
}
