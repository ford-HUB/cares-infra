import { Outlet, useLocation } from 'react-router-dom'
import { Fragment, useEffect, useRef } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { PortalNavConfig } from '../../types/nav'
import { useChatRealtime } from '../../hooks/use-chat-realtime'
import { usePageLoadReporter } from '../../hooks/use-page-load-reporter'
import { usePermissionSync } from '../../hooks/use-permission-sync'
import { usePortalLayout } from '../../hooks/use-portal-layout'
import { usePortalTheme } from '../../hooks/use-portal-theme'
import { useAuthStore } from '../../store/auth-store'
import { useProfileStore } from '../../store/profile-store'
import { readPortalFind } from '../../utils/portal-find'
import { PortalFindHighlighter } from './portal-find-highlighter'
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
  usePermissionSync()
  usePageLoadReporter(nav)
  usePortalTheme()
  const mainRef = useRef<HTMLElement>(null)
  // Each header search for a record remounts the screen it opens, so the module's
  // search box takes the new text even when it is already the screen on show.
  const findNonce = readPortalFind(useLocation().state)?.nonce

  useEffect(() => {
    if (user) {
      void ensureProfile()
    }
  }, [ensureProfile, user])

  // Pinned to the viewport rather than sized with h-screen/h-full: the shell covers
  // exactly what is on screen, whatever height the document ends up with.
  // The provider sits here once so any locked (suspended) control in the sidebar or
  // a page can show its hover card without each screen mounting its own.
  return (
    <TooltipProvider delayDuration={150}>
      <div className="fixed inset-0 flex overflow-hidden bg-[var(--cares-bg)]">
        <div onMouseEnter={onSidebarEnter} onMouseLeave={onSidebarLeave}>
          <PortalSidebar
            config={nav}
            title={title}
            collapsed={sidebarCollapsed}
            userRole={user?.role}
            permissions={user?.permissions}
            suspensions={user?.suspensions}
          />
        </div>

        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <PortalHeader
            nav={nav}
            isMobile={isMobile}
            onToggleSidebar={toggleSidebar}
            onToggleMobileSidebar={toggleMobileSidebar}
          />
          <main ref={mainRef} className="cares-portal-canvas flex-1 overflow-y-auto">
            <Fragment key={findNonce ?? 'screen'}>
              <Outlet />
            </Fragment>
          </main>
          {/* Outside <main>: the chip's own updates must not count as page content. */}
          <PortalFindHighlighter containerRef={mainRef} />
        </div>
      </div>
    </TooltipProvider>
  )
}
