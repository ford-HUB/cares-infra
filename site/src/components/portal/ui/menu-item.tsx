import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'

interface MenuItemProps {
  icon: LucideIcon
  label: string
  to: string
  collapsed: boolean
}

export function MenuItem({ icon: Icon, label, to, collapsed }: MenuItemProps) {
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
