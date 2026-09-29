import type { LucideIcon } from 'lucide-react'
import { ShieldOff } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { SessionSuspension } from '../../../types/access-control'
import { SuspensionTooltip } from './suspension-tooltip'

interface MenuItemProps {
  icon: LucideIcon
  label: string
  to: string
  collapsed: boolean
  /**
   * Set when an admin has suspended the right that opens this module. The entry
   * stays in the sidebar, locked and red, and hovering it explains why and until when.
   */
  suspension?: SessionSuspension
}

export function MenuItem({
  icon: Icon,
  label,
  to,
  collapsed,
  suspension,
}: MenuItemProps) {
  if (suspension) {
    return (
      <SuspensionTooltip suspensions={[suspension]} side="right">
        <div
          role="link"
          aria-disabled="true"
          className="flex cursor-not-allowed items-center gap-3 rounded-[var(--cares-radius)] bg-red-500/10 px-3 py-2 text-sm text-red-400"
        >
          <Icon className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1">{label}</span>
              <ShieldOff className="h-3.5 w-3.5 shrink-0" />
            </>
          )}
        </div>
      </SuspensionTooltip>
    )
  }

  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        [
          'flex items-center gap-3 rounded-[var(--cares-radius)] px-3 py-2 text-sm transition-colors',
          isActive
            ? 'bg-[var(--cares-sidebar-active)] text-[var(--cares-sidebar-text)]'
            : 'text-[var(--cares-sidebar-muted)] hover:bg-[var(--cares-sidebar-active)]/60 hover:text-white',
        ].join(' ')
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  )
}
