import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import type { PortalNavConfig } from '../../types/nav'
import { usePortalLayout } from '../../hooks/use-portal-layout'
import { useAuthStore } from '../../store/auth-store'
import { useProfileStore } from '../../store/profile-store'
import type { PortalKind } from '../../types/staff-roles'
import { PortalHeader } from './portal-header'
import { PortalSidebar } from './portal-sidebar'

interface PortalLayoutProps {
  portal: PortalKind
  nav: PortalNavConfig
  title?: string
}

export function PortalLayout({ portal, nav, title }: PortalLayoutProps) {
  const user = useAuthStore((s) => s.user)
  const fetchPortalProfile = useProfileStore((s) => s.fetchPortalProfile)
  const {
    isMobile,
    sidebarCollapsed,
    toggleSidebar,
    toggleMobileSidebar,
    onSidebarEnter,
    onSidebarLeave,
  } = usePortalLayout()

  useEffect(() => {
    if (user) {
      void fetchPortalProfile(portal)
    }
  }, [fetchPortalProfile, portal, user])

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--cares-bg)]">
      <div onMouseEnter={onSidebarEnter} onMouseLeave={onSidebarLeave}>
        <PortalSidebar
          config={nav}
          title={title}
          collapsed={sidebarCollapsed}
          userRole={user?.role}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PortalHeader
          portal={portal}
          isMobile={isMobile}
          onToggleSidebar={toggleSidebar}
          onToggleMobileSidebar={toggleMobileSidebar}
        />
        <main className="flex-1 overflow-y-auto bg-gray-100">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
