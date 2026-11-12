import { isCoordinatorRole, useAuthStore } from '../../store/auth-store'
import { AdminSystemStatisticsPage } from './admin-system-statistics'
import { DepartmentStatisticsPage } from './department-statistics'
import { SystemStatisticsPage } from './system-statistics'

/**
 * One sidebar entry, three scopes: a coordinator reads their own college, a
 * director reads the whole programme (and may narrow it to any college), and an
 * admin — who runs the system rather than the programme — reads the machine:
 * CPU per day, load and service health.
 */
export function StatisticsPage() {
  const role = useAuthStore((s) => s.user?.role ?? null)

  if (role === 'admin') return <AdminSystemStatisticsPage />
  return isCoordinatorRole(role) ? <DepartmentStatisticsPage /> : <SystemStatisticsPage />
}
