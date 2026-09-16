import type { LucideIcon } from 'lucide-react'
import { ShieldOff } from 'lucide-react'
import type { SessionSuspension } from '../../../types/access-control'
import { SuspensionTooltip } from './suspension-tooltip'

interface LockedActionProps {
  suspension: SessionSuspension
  label: string
  icon?: LucideIcon
  side?: 'top' | 'bottom' | 'left' | 'right'
  /** Matches the live button it stands in for — `sm` for the h-8 panel buttons. */
  size?: 'sm' | 'md'
}

/**
 * A toolbar button whose right has been suspended. It keeps the button's place on
 * the screen — same height and shape as the live one — but reads red, cannot be
 * pressed, and explains itself on hover.
 */
export function LockedActionButton({
  suspension,
  label,
  icon: Icon = ShieldOff,
  side = 'bottom',
  size = 'md',
}: LockedActionProps) {
  return (
    <SuspensionTooltip suspensions={[suspension]} side={side}>
      <span
        role="button"
        aria-disabled="true"
        className={`flex cursor-not-allowed items-center rounded-lg border border-red-200 bg-red-50 text-red-700 ${
          size === 'sm' ? 'h-8 gap-1.5 px-2.5 text-[12px]' : 'h-9 gap-2 px-3 text-[13px]'
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
    </SuspensionTooltip>
  )
}

/**
 * A row-menu entry whose right has been suspended. Stays in the menu so the person
 * can see the action exists, but is inert and red; hover for the reason and window.
 */
export function LockedMenuItem({
  suspension,
  label,
  icon: Icon = ShieldOff,
  side = 'left',
}: LockedActionProps) {
  return (
    <SuspensionTooltip suspensions={[suspension]} side={side}>
      <div
        role="menuitem"
        aria-disabled="true"
        className="flex w-full cursor-not-allowed items-center gap-2.5 bg-red-50/60 px-3 py-2 text-left text-[13px] text-red-600"
      >
        <Icon className="h-4 w-4" />
        {label}
      </div>
    </SuspensionTooltip>
  )
}

/**
 * The same, for a shadcn `DropdownMenuContent`. Rendered as a plain row rather than a
 * `DropdownMenuItem` because Radix drops pointer events on a disabled item, which
 * would also swallow the hover the tooltip needs.
 */
export function LockedDropdownItem({
  suspension,
  label,
  icon: Icon = ShieldOff,
  side = 'left',
}: LockedActionProps) {
  return (
    <SuspensionTooltip suspensions={[suspension]} side={side}>
      <div
        role="menuitem"
        aria-disabled="true"
        className="flex cursor-not-allowed items-center gap-1.5 rounded-md bg-red-50/60 px-1.5 py-1 text-sm text-red-600 [&_svg]:shrink-0"
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
    </SuspensionTooltip>
  )
}
