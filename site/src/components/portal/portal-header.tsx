import { AlignLeft, AlignRight, Bell, ChevronDown, LogOut, Search, Settings } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthenticatedProfileImage } from '../profile/ui/authenticated-profile-image'
import { useAuthStore } from '../../store/auth-store'
import { useNotificationStore } from '../../store/notification-store'
import { useProfileStore } from '../../store/profile-store'
import { LOGIN_PATH } from '../../config/auth-redirect'
import type { PortalKind } from '../../types/staff-roles'

interface PortalHeaderProps {
  portal: PortalKind
  onToggleSidebar: () => void
  onToggleMobileSidebar: () => void
  isMobile: boolean
}

export function PortalHeader({
  portal,
  onToggleSidebar,
  onToggleMobileSidebar,
  isMobile,
}: PortalHeaderProps) {
  const { user, logout } = useAuthStore()
  const profile = useProfileStore((s) => s.profile)
  const unreadCount = useNotificationStore((s) => s.unreadCount())
  const loadNotifications = useNotificationStore((s) => s.load)
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate(LOGIN_PATH)
  }

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`
  const settingsPath =
    portal === 'director' ? '/director/settings' : '/management/settings'

  const handleOpenSettings = () => {
    setMenuOpen(false)
    navigate(settingsPath)
  }

  return (
    <header className="w-full border-b border-gray-300 bg-white px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={isMobile ? onToggleMobileSidebar : onToggleSidebar}
            className="rounded-lg border border-gray-300 p-2 hover:bg-gray-100"
            aria-label="Toggle sidebar"
          >
            {isMobile ? <AlignRight className="h-5 w-5" /> : <AlignLeft className="h-5 w-5" />}
          </button>

          <div className="relative hidden max-w-md flex-1 sm:block">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--cares-muted)]" />
            <input
              type="search"
              placeholder="Search or type command..."
              className="w-full rounded-lg border border-gray-300 py-2.5 pr-4 pl-10 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

          </div>
        </div>

        <div className="relative flex items-center gap-3" ref={menuRef}>
          <button
            type="button"
            onClick={() =>
              navigate(
                portal === 'director'
                  ? '/director/notifications'
                  : '/management/notifications',
              )
            }
            className="relative rounded-lg p-2 hover:bg-gray-100"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-gray-500" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 rounded-full bg-orange-500 px-1 text-xs font-semibold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100"
          >
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-sm font-semibold text-white">
              {profile?.hasProfileImage ? (
                <AuthenticatedProfileImage
                  asset="avatar"
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <span className="hidden font-medium text-gray-900 sm:inline">
              {user?.firstName} {user?.lastName}
            </span>
            <ChevronDown className="hidden h-4 w-4 sm:block" />
          </button>

          {menuOpen && (
            <div className="absolute top-16 right-4 z-50 w-56 rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
              <p className="px-4 py-1 text-sm font-semibold text-gray-900">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="px-4 pb-2 text-xs text-gray-500">{user?.email}</p>
              <button
                type="button"
                onClick={handleOpenSettings}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
              <div className="my-1 border-t border-gray-100" />
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
