import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { getPostLoginPath, LOGIN_PATH } from '../../config/auth-redirect'
import { useAuthStore } from '../../store/auth-store'
import type { StaffRole } from '../../types/staff-roles'

interface ProtectedPortalProps {
  roles: StaffRole[]
}

export function ProtectedPortal({ roles }: ProtectedPortalProps) {
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

  return <Outlet />
}
