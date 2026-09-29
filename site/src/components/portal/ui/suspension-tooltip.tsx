import type { ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { SessionSuspension } from '../../../types/access-control'
import { formatSuspensionWindow } from '../../../utils/permission-rights'

interface SuspensionTooltipProps {
  /**
   * One entry per suspended action under the trigger — a module header lists several.
   * Takes anything shaped like a session suspension, so the admin's fuller
   * `ActionSuspension` records fit too.
   */
  suspensions: SessionSuspension[]
  /** Labels the action each suspension belongs to; omitted when there is only one. */
  labelOf?: (suspension: SessionSuspension) => string
  side?: 'top' | 'bottom' | 'left' | 'right'
  children: ReactNode
}

/**
 * The hover card on a suspended action or module: why it was pulled and for how long.
 * Renders the children untouched when nothing under them is suspended, so callers can
 * wrap unconditionally. Needs a `TooltipProvider` above it — the portal layout mounts
 * one, and the Access Control panels mount their own.
 */
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
