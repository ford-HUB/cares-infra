import { useState } from 'react'
import { useIsMobile } from './use-is-mobile'

export function usePortalLayout() {
  const isMobile = useIsMobile()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hoverExpand, setHoverExpand] = useState(false)

  const sidebarCollapsed = isMobile ? !mobileOpen : collapsed && !hoverExpand

  return {
    isMobile,
    sidebarCollapsed,
    toggleSidebar: () => setCollapsed((v) => !v),
    toggleMobileSidebar: () => setMobileOpen((v) => !v),
    onSidebarEnter: () => setHoverExpand(true),
    onSidebarLeave: () => setHoverExpand(false),
  }
}
