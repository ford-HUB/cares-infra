import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  ADMIN_NEEDS_CLUSTERS_PATH,
  ADMIN_RESIDENTIAL_NEEDS_PATH,
} from '../../../constants/routes'

const TABS = [
  { label: 'Overview', to: ADMIN_RESIDENTIAL_NEEDS_PATH, end: true },
  { label: 'Clusters', to: ADMIN_NEEDS_CLUSTERS_PATH, end: false },
] as const

/**
 * The module's child screens as one row of tabs. Each tab is a route, so the browser
 * back button and a shared link both land on the right child.
 */
export function NeedsModuleTabs() {
  return (
    <nav className="mb-4 flex gap-1 border-b border-gray-200" aria-label="Residential needs">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              '-mb-px border-b-2 px-3 py-2 text-[13px] font-medium transition-colors',
              'focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none',
              isActive
                ? 'border-[var(--cares-primary)] text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
