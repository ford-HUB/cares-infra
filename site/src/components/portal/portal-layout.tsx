import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import type { PortalNavConfig } from '../../types/nav'
import { useChatRealtime } from '../../hooks/use-chat-realtime'
import { usePortalLayout } from '../../hooks/use-portal-layout'
import { useAuthStore } from '../../store/auth-store'
import { useProfileStore } from '../../store/profile-store'
import { PortalHeader } from './portal-header'
import { PortalSidebar } from './portal-sidebar'

interface PortalLayoutProps {
  nav: PortalNavConfig
  title?: string
}

export function PortalLayout({ nav, title }: PortalLayoutProps) {
  const user = useAuthStore((s) => s.user)
  const ensureProfile = useProfileStore((s) => s.ensureProfile)
  const {
    isMobile,
    sidebarCollapsed,
    toggleSidebar,
    toggleMobileSidebar,
    onSidebarEnter,
    onSidebarLeave,
  } = usePortalLayout()

  useChatRealtime()

  useEffect(() => {
    if (user) {
      void ensureProfile()
    }
  }, [ensureProfile, user])

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
