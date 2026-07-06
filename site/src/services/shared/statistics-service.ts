import { USE_MOCK_API } from '../api-client'

export async function getDirectorStatistics() {
  if (USE_MOCK_API) {
    return {
      success: true,
      data: {
        totalVolunteers: 1280,
        activeEvents: 14,
        donationsThisMonth: 45200,
        programsCompleted: 87,
      },
    }
  }
  return { success: false, message: 'Backend not wired', data: null }
}
