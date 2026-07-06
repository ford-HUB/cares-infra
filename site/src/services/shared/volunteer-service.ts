import { USE_MOCK_API } from '../api-client'

export async function listVolunteers() {
  if (USE_MOCK_API) {
    return {
      success: true,
      data: [
        { id: 'v1', name: 'Carlo Mendoza', hours: 24, verified: true },
        { id: 'v2', name: 'Sofia Lim', hours: 12, verified: false },
      ],
    }
  }
  return { success: false, message: 'Backend not wired', data: [] }
}
