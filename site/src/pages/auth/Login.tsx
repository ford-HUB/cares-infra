import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { AdminLoginForm } from '../../components/auth/admin-login-form'
import { getPostLoginPath } from '../../config/auth-redirect'
import { useAdminLoginForm } from '../../hooks/use-admin-login-form'
import { useAuthStore } from '../../store/auth-store'

interface LoginProps {
  onRequestAccess: () => void
}

/** Sign-in modal body: a signed-in visitor is sent straight on to the portal. */
export function Login({ onRequestAccess }: LoginProps) {
  const user = useAuthStore((s) => s.user)
  const initialized = useAuthStore((s) => s.initialized)
  const checkAuth = useAuthStore((s) => s.checkAuth)
  const props = useAdminLoginForm()

  useEffect(() => {
    if (!initialized) void checkAuth()
  }, [initialized, checkAuth])

  if (initialized && user) {
    return <Navigate to={getPostLoginPath(user.role)} replace />
  }

  return <AdminLoginForm {...props} checking={!initialized} onRequestAccess={onRequestAccess} />
}
