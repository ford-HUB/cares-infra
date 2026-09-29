import { adminNav, adminPortalLabel } from '../../config/admin-nav'
import { useAuthStore } from '../../store/auth-store'
import { PortalLayout } from './portal-layout'

/** The single portal shell shared by admin, director and coordinator. */
export function AdminPortalLayout() {
  const role = useAuthStore((s) => s.user?.role)
  return <PortalLayout nav={adminNav} title={adminPortalLabel(role)} />
}
