import { USE_MOCK_API } from '../api-client'

export async function listGoogleForms() {
  if (USE_MOCK_API) {
    return {
      success: true,
      data: [
        { id: 'f1', title: 'Volunteer Feedback Form', responses: 24 },
        { id: 'f2', title: 'Event Registration', responses: 56 },
      ],
    }
  }
  return { success: false, message: 'Backend not wired', data: [] }
}
