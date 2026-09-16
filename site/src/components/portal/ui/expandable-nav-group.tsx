import type { LucideIcon } from 'lucide-react'
import { ChevronDown, ShieldOff } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { PermissionKey, SessionSuspension } from '../../../types/access-control'
import { navGateAllows, type NavChildItem } from '../../../types/nav'
import type { PortalRole } from '../../../types/portal-roles'
import { SuspensionTooltip } from './suspension-tooltip'

const EMPTY_PERMISSIONS: ReadonlySet<PermissionKey> = new Set()
const EMPTY_SUSPENSIONS: ReadonlyMap<PermissionKey, SessionSuspension> = new Map()

interface ExpandableNavGroupProps {
  icon: LucideIcon
  label: string
  collapsed: boolean
  expanded: boolean
  onToggle: () => void
  children: NavChildItem[]
  userRole?: PortalRole
  permissions?: ReadonlySet<PermissionKey>
  /** Active suspensions on the session, by the right they lock. */
  suspensions?: ReadonlyMap<PermissionKey, SessionSuspension>
  /** Set when the group's own gate right is suspended — the whole module is locked. */
  suspension?: SessionSuspension
}

/**
 * A child whose right is suspended is kept in the list, locked and red, rather than
 * dropped — the person can see the screen exists and, on hover, why it is closed.
 */
function childSuspension(
  child: NavChildItem,
  suspensions: ReadonlyMap<PermissionKey, SessionSuspension>,
): SessionSuspension | undefined {
  return child.permission ? suspensions.get(child.permission) : undefined
}

export function ExpandableNavGroup({
  icon: Icon,
  label,
  collapsed,
  expanded,
  onToggle,
  children,
  userRole,
  permissions = EMPTY_PERMISSIONS,
  suspensions = EMPTY_SUSPENSIONS,
  suspension,
}: ExpandableNavGroupProps) {
  const visibleChildren = children.filter(
    (child) =>
      navGateAllows(child, userRole, permissions) ||
      (navGateAllows({ roles: child.roles }, userRole, permissions) &&
        childSuspension(child, suspensions) !== undefined),
  )

  if (visibleChildren.length === 0) return null

  if (suspension) {
    return (
      <SuspensionTooltip suspensions={[suspension]} side="right">
        <div
          role="button"
          aria-disabled="true"
          className="flex w-full cursor-not-allowed items-center gap-3 rounded-[var(--cares-radius)] bg-red-500/10 px-3 py-2 text-left text-sm text-red-400"
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
          {visibleChildren.map((child) => {
            const locked = childSuspension(child, suspensions)

            if (locked) {
              return (
                <SuspensionTooltip key={child.to} suspensions={[locked]} side="right">
                  <div
                    role="link"
                    aria-disabled="true"
                    className="flex cursor-not-allowed items-center justify-between rounded-md bg-red-500/10 px-3 py-1.5 text-[13px] text-red-400"
                  >
                    <span>{child.label}</span>
                    <ShieldOff className="h-3 w-3 shrink-0" />
                  </div>
                </SuspensionTooltip>
              )
            }

            return (
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
            )
          })}
        </div>
      )}
    </div>
  )
}
