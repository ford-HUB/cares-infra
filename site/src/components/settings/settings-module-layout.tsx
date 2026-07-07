import { ChevronRight } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { settingsNavItems } from '../../config/settings-nav'
import type { SettingsModulePaths } from '../../types/settings'
import { SettingsSubSidebar } from './ui/settings-sub-sidebar'

export function SettingsModuleLayout({
  basePath,
  profilePath,
  homePath,
}: SettingsModulePaths) {
  const location = useLocation()
  const activeItem = settingsNavItems.find((item) =>
    location.pathname.startsWith(`${basePath}/${item.segment}`),
  )

  return (
    <div className="mx-8 my-4 flex h-full flex-col">
      <header className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl text-gray-700">Settings</h1>
          {activeItem && (
            <p className="mt-1 text-sm text-gray-500">{activeItem.description}</p>
          )}
        </div>
        <div className="flex items-center space-x-2.5 text-sm">
          <Link to={homePath} className="text-gray-500 hover:text-gray-700">
            Home
          </Link>
          <ChevronRight size={18} className="relative top-0.5 text-gray-400" />
          <Link to={profilePath} className="text-gray-500 hover:text-gray-700">
            Profile
          </Link>
          <ChevronRight size={18} className="relative top-0.5 text-gray-400" />
          <span>Settings</span>
        </div>
      </header>

      <div className="my-4 flex flex-1 flex-col gap-4 lg:flex-row lg:gap-6">
        <SettingsSubSidebar basePath={basePath} />
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
