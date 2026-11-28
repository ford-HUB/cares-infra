import type { ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { SessionSuspension } from '../../../types/access-control'
import { formatSuspensionWindow } from '../../../utils/permission-rights'

interface SuspensionTooltipProps {
  /** One entry per suspended action; accepts admin `ActionSuspension` records too. */
  suspensions: SessionSuspension[]
  /** Omitted when there is only one. */
  labelOf?: (suspension: SessionSuspension) => string
  side?: 'top' | 'bottom' | 'left' | 'right'
  children: ReactNode
}

/** Renders children untouched when nothing is suspended; needs a `TooltipProvider` above. */
export function SuspensionTooltip({
  suspensions,
  labelOf,
  side = 'top',
  children,
}: SuspensionTooltipProps) {
  if (suspensions.length === 0) return <>{children}</>

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={4}
        className="z-[70] max-w-sm items-start bg-red-700 text-white [&>svg]:bg-red-700 [&>svg]:fill-red-700"
      >
        <div className="space-y-2 py-0.5">
          {suspensions.map((suspension) => {
            const window = formatSuspensionWindow(suspension)
            return (
              <div key={suspension.permission} className="space-y-0.5">
                {labelOf && suspensions.length > 1 && (
                  <p className="text-[11px] font-semibold tracking-wide text-red-100 uppercase">
                    {labelOf(suspension)}
                  </p>
                )}
                <p className="text-[12px] leading-snug">
                  <span className="font-semibold">Suspended due to:</span>{' '}
                  {suspension.reason}
                </p>
                <p className="text-[11px] leading-snug text-red-100">
                  <span className="font-medium text-white">Issued:</span> {window.issued}
                </p>
                <p className="text-[11px] leading-snug text-red-100">
                  <span className="font-medium text-white">Until:</span> {window.until}
                </p>
              </div>
            )
          })}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
