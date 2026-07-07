import { MOCK_API_DELAY_MS, delay } from '../constants/durations'
import { USE_MOCK_API } from './api-client'
import { mockDepartmentOverview, mockStaffOverview } from './mock-data'

export async function getStaffOverview() {
  if (USE_MOCK_API) {
    await delay(MOCK_API_DELAY_MS.default)
    return { success: true as const, data: mockStaffOverview }
  }
  return { success: false as const, message: 'Backend not wired', data: null }
}

export async function getDepartmentOverview() {
  if (USE_MOCK_API) {
    await delay(MOCK_API_DELAY_MS.default)
    return { success: true as const, data: mockDepartmentOverview }
  }
  return { success: false as const, message: 'Backend not wired', data: null }
}
