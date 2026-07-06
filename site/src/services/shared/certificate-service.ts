import { USE_MOCK_API } from '../api-client'

export async function listCertificateTemplates() {
  if (USE_MOCK_API) {
    return {
      success: true,
      data: [
        { id: 'c1', name: 'Volunteer Recognition', category: 'Volunteer' },
        { id: 'c2', name: 'Program Completion', category: 'Program' },
      ],
    }
  }
  return { success: false, message: 'Backend not wired', data: [] }
}
