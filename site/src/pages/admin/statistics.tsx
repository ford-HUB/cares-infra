import { isCoordinatorRole, useAuthStore } from '../../store/auth-store'
import { AdminSystemStatisticsPage } from './admin-system-statistics'
import { DepartmentStatisticsPage } from './department-statistics'
import { SystemStatisticsPage } from './system-statistics'

export function StatisticsPage() {
  const role = useAuthStore((s) => s.user?.role ?? null)

  if (role === 'admin') return <AdminSystemStatisticsPage />
  return isCoordinatorRole(role) ? <DepartmentStatisticsPage /> : <SystemStatisticsPage />
}
