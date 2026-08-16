import { useMemo, useState } from 'react'
import type { NavItem, PortalNavConfig } from '../../types/nav'
import type { PortalRole } from '../../types/portal-roles'
import { ExpandableNavGroup } from './ui/expandable-nav-group'
import { MenuItem } from './ui/menu-item'
import { NavSectionLabel } from './ui/nav-section-label'

/**
 * Keeps only what the role may see, then drops any section heading left with no
 * item under it.
 */
function visibleNavItems(items: NavItem[], userRole?: PortalRole): NavItem[] {
  const allowed = (roles?: PortalRole[]) =>
    !roles || (!!userRole && roles.includes(userRole))

  const permitted = items.filter((item) => {
    if (!allowed(item.roles)) return false
    if (item.type === 'group') return item.children.some((child) => allowed(child.roles))
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
}

export function PortalSidebar({
  config,
  title,
  collapsed,
  userRole,
}: PortalSidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Dashboard: true,
  })

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const visibleItems = useMemo(
    () => visibleNavItems(config.items, userRole),
    [config.items, userRole],
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
            >
              {item.children}
            </ExpandableNavGroup>
          )
        })}
      </nav>
    </aside>
  )
}
