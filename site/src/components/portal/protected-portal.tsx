import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { getPostLoginPath, LOGIN_PATH } from '../../config/auth-redirect'
import { useAuthStore } from '../../store/auth-store'
import type { PermissionKey } from '../../types/access-control'
import type { PortalRole } from '../../types/portal-roles'

interface ProtectedPortalProps {
  roles: PortalRole[]
  /**
   * A right the account must hold as well as the role. Rights move at runtime — an
   * admin revoking one in Access Control reaches this guard on the next sync, and a
   * person already on the page is bounced to their dashboard.
   */
  permission?: PermissionKey
}

export function ProtectedPortal({ roles, permission }: ProtectedPortalProps) {
  const { user, initialized, checkAuth } = useAuthStore()

  useEffect(() => {
    void checkAuth()
  }, [checkAuth])

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cares-bg)]">
        <p className="text-[var(--cares-muted)]">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to={LOGIN_PATH} replace />
  }

  if (!roles.includes(user.role)) {
    return <Navigate to={getPostLoginPath(user.role)} replace />
  }

  if (permission && !user.permissions.includes(permission)) {
    return <Navigate to={getPostLoginPath(user.role)} replace />
  }

  return <Outlet />
}
