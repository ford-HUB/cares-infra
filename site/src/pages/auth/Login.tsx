import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { AdminLoginForm } from '../../components/auth/admin-login-form'
import { getPostLoginPath } from '../../config/auth-redirect'
import { useAdminLoginForm } from '../../hooks/use-admin-login-form'
import { useAuthStore } from '../../store/auth-store'

export function Login() {
  const { user, initialized, checkAuth } = useAuthStore()
  const props = useAdminLoginForm()

  useEffect(() => {
    void checkAuth()
  }, [checkAuth])

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cares-bg)]">
        <p className="text-sm text-[var(--cares-muted)]">Loading...</p>
      </div>
    )
  }

  if (user) {
    return <Navigate to={getPostLoginPath(user.role)} replace />
  }

  return <AdminLoginForm {...props} />
}
