import { useMemo, useState } from 'react'
import type { PermissionKey } from '../../types/access-control'
import {
  navGateAllows,
  type NavGate,
  type NavItem,
  type PortalNavConfig,
} from '../../types/nav'
import type { PortalRole } from '../../types/portal-roles'
import { ExpandableNavGroup } from './ui/expandable-nav-group'
import { MenuItem } from './ui/menu-item'
import { NavSectionLabel } from './ui/nav-section-label'

/**
 * Keeps only what the role may see and the account is permitted to open, then drops
 * any section heading left with no item under it.
 */
function visibleNavItems(
  items: NavItem[],
  userRole: PortalRole | undefined,
  permissions: ReadonlySet<PermissionKey>,
): NavItem[] {
  const allowed = (gate: NavGate) => navGateAllows(gate, userRole, permissions)

  const permitted = items.filter((item) => {
    if (!allowed(item)) return false
    if (item.type === 'group') return item.children.some(allowed)
    return true
  })

  return permitted.filter(
    (item, index) =>
      item.type !== 'section' ||
      (permitted[index + 1] !== undefined && permitted[index + 1].type !== 'section'),
  )
}

interface PortalSidebarProps {
  config: PortalNavConfig
  title?: string
  collapsed: boolean
  userRole?: PortalRole
  /** The session's effective rights; anything gated on a right not held is hidden. */
  permissions?: PermissionKey[]
}

export function PortalSidebar({
  config,
  title,
  collapsed,
  userRole,
  permissions,
}: PortalSidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Dashboard: true,
  })

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const held = useMemo(() => new Set(permissions ?? []), [permissions])

  const visibleItems = useMemo(
    () => visibleNavItems(config.items, userRole, held),
    [config.items, userRole, held],
  )

  const firstSectionLabel = visibleItems.find((item) => item.type === 'section')?.label

  return (
    <aside
      className={[
        'flex h-screen shrink-0 flex-col bg-[var(--cares-sidebar)] text-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-60',
      ].join(' ')}
    >
      <div className="flex items-center gap-2.5 border-b border-white/10 px-3 py-4">
        <img
          src="/transparent-logo.png"
          alt="CARES"
          className={`shrink-0 object-contain ${collapsed ? 'h-7 w-7' : 'h-8 w-8'}`}
        />
        {!collapsed && (
          <span className="text-sm leading-tight font-bold">
            {title ?? config.portalTitle}
          </span>
        )}
      </div>

      <nav className="scrollbar-hide flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {visibleItems.map((item) => {
          if (item.type === 'section') {
            return (
              <NavSectionLabel
                key={`section:${item.label}`}
                label={item.label}
                collapsed={collapsed}
                first={item.label === firstSectionLabel}
              />
            )
          }

          if (item.type === 'link') {
            return (
              <MenuItem
                key={item.to}
                icon={item.icon}
                label={item.label}
                to={item.to}
                collapsed={collapsed}
              />
            )
          }

          return (
            <ExpandableNavGroup
              key={item.label}
              icon={item.icon}
              label={item.label}
              collapsed={collapsed}
              expanded={!!expandedGroups[item.label]}
              onToggle={() => toggleGroup(item.label)}
              userRole={userRole}
              permissions={held}
            >
              {item.children}
            </ExpandableNavGroup>
          )
        })}
      </nav>
    </aside>
  )
}
