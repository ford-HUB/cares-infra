import { useState } from 'react'
import type { PortalNavConfig } from '../../types/nav'
import type { StaffRole } from '../../types/staff-roles'
import { ExpandableNavGroup } from './ui/expandable-nav-group'
import { MenuItem } from './ui/menu-item'

interface PortalSidebarProps {
  config: PortalNavConfig
  title?: string
  collapsed: boolean
  userRole?: StaffRole
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

  const visibleItems = config.items.filter((item) => {
    if (item.type === 'link') {
      return !item.roles || (userRole && item.roles.includes(userRole))
    }
    if (item.roles && userRole && !item.roles.includes(userRole)) return false
    if (item.type === 'group') {
      return item.children.some(
        (child) => !child.roles || (userRole && child.roles.includes(userRole)),
      )
    }
    return true
  })

  return (
    <aside
      className={[
        'flex h-screen shrink-0 flex-col bg-[var(--cares-sidebar)] text-white transition-all duration-300',
        collapsed ? 'w-20' : 'w-72',
      ].join(' ')}
    >
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-5">
        <img
          src="/transparent-logo.png"
          alt="CARES"
          className={`shrink-0 object-contain ${collapsed ? 'h-8 w-8' : 'h-10 w-10'}`}
        />
        {!collapsed && (
          <span className="text-xl leading-tight font-bold">
            {title ?? config.portalTitle}
          </span>
        )}
      </div>

      <nav className="scrollbar-hide flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {!collapsed && (
          <p className="mb-3 px-3 text-xs font-semibold tracking-wider text-white/50 uppercase">
            Menu
          </p>
        )}

        {visibleItems.map((item) => {
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
