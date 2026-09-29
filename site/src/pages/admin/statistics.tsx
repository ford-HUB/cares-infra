import { isCoordinatorRole, useAuthStore } from '../../store/auth-store'
import { DepartmentStatisticsPage } from './department-statistics'
import { SystemStatisticsPage } from './system-statistics'

/**
 * One sidebar entry, two scopes: a coordinator reads their own college, while an
 * admin or director reads the whole system and may narrow it to any college.
 */
export function StatisticsPage() {
  const role = useAuthStore((s) => s.user?.role ?? null)

  return isCoordinatorRole(role) ? <DepartmentStatisticsPage /> : <SystemStatisticsPage />
}
