import type { LucideIcon } from 'lucide-react'
import { ChevronDown } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { PortalRole } from '../../../types/portal-roles'

interface ExpandableNavGroupProps {
  icon: LucideIcon
  label: string
  collapsed: boolean
  expanded: boolean
  onToggle: () => void
  children: { label: string; to: string; roles?: PortalRole[] }[]
  userRole?: PortalRole
}

export function ExpandableNavGroup({
  icon: Icon,
  label,
  collapsed,
  expanded,
  onToggle,
  children,
  userRole,
}: ExpandableNavGroupProps) {
  const visibleChildren = children.filter(
    (child) => !child.roles || (userRole && child.roles.includes(userRole)),
  )

  if (visibleChildren.length === 0) return null

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={[
          'flex w-full items-center gap-3 rounded-[var(--cares-radius)] px-3 py-2 text-left text-sm transition-colors',
          expanded
            ? 'bg-[var(--cares-sidebar-active)] text-white'
            : 'text-[var(--cares-sidebar-muted)] hover:bg-[var(--cares-sidebar-active)]/60 hover:text-white',
        ].join(' ')}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1">{label}</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </>
        )}
      </button>

      {!collapsed && (
        <div
          className={`ml-4 space-y-1 overflow-hidden border-l border-white/15 pl-3 transition-all ${
            expanded ? 'mt-1 max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          {visibleChildren.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              end
              className={({ isActive }) =>
                [
                  'block rounded-md px-3 py-1.5 text-[13px] transition-colors',
                  isActive
                    ? 'bg-[var(--cares-sidebar-active)] text-white'
                    : 'text-[var(--cares-sidebar-muted)] hover:text-white',
                ].join(' ')
              }
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}
