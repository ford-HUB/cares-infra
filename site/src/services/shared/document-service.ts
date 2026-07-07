import { USE_MOCK_API } from '../api-client'

export async function listDocuments() {
  if (USE_MOCK_API) {
    return {
      success: true,
      data: [
        { id: 'd1', title: 'June Monthly Report', status: 'submitted' },
        { id: 'd2', title: 'Event Proposal — Outreach', status: 'pending' },
      ],
    }
  }
  return { success: false, message: 'Backend not wired', data: [] }
}
