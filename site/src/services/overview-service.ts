import { MOCK_API_DELAY_MS, delay } from '../constants/durations'
import type { AdminOverviewData, DepartmentOverviewData } from '../types/overview'
import type { ApiResponse } from '../types/portal-roles'
import { mockDepartmentOverview, mockAdminOverview } from './mock-data'

// Fixtures until the overview endpoints land — the return type is already the portal's
// ApiResponse envelope so the swap to an `apiClient` call is a body-only change.

export async function getAdminOverview(): Promise<ApiResponse<AdminOverviewData>> {
  await delay(MOCK_API_DELAY_MS.default)
  return { success: true, data: mockAdminOverview }
}

export async function getDepartmentOverview(): Promise<
  ApiResponse<DepartmentOverviewData>
> {
  await delay(MOCK_API_DELAY_MS.default)
  return { success: true, data: mockDepartmentOverview }
}
