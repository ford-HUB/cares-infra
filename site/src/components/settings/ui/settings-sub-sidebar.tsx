import { NavLink } from 'react-router-dom'
import { settingsNavItems } from '../../../config/settings-nav'

interface SettingsSubSidebarProps {
  basePath: string
}

export function SettingsSubSidebar({ basePath }: SettingsSubSidebarProps) {
  return (
    <nav
      className="w-full shrink-0 rounded-xl border border-gray-300 bg-white p-3 lg:w-60"
      aria-label="Settings sections"
    >
      <p className="mb-2 px-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
        Account
      </p>
      <ul className="space-y-1">
        {settingsNavItems.map((item) => (
          <li key={item.segment}>
            <NavLink
              to={`${basePath}/${item.segment}`}
              className={({ isActive }) =>
                [
                  'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--cares-primary)] text-white'
                    : 'text-gray-700 hover:bg-gray-100',
                ].join(' ')
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
