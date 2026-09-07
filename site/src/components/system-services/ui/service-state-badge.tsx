import { cn } from '@/lib/utils'
import {
  SERVICE_STATE_DOT_STYLES,
  SERVICE_STATE_LABELS,
  SERVICE_STATE_STYLES,
} from '../../../constants/system-services'
import type { ServiceState } from '../../../types/system-service'
import { LivePulse } from '../../attendance/ui/live-pulse'

interface ServiceStateBadgeProps {
  state: ServiceState
  className?: string
}

/** Where one scheduler sits in its cycle. Only a run in flight animates. */
export function ServiceStateBadge({ state, className }: ServiceStateBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
        SERVICE_STATE_STYLES[state],
        className,
      )}
    >
      <LivePulse
        colorClass={SERVICE_STATE_DOT_STYLES[state]}
        animate={state === 'running'}
      />
      {SERVICE_STATE_LABELS[state]}
    </span>
  )
}
