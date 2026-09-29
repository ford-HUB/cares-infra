export async function listDocuments() {
  return {
    success: true,
    data: [
      { id: 'd1', title: 'June Monthly Report', status: 'submitted' },
      { id: 'd2', title: 'Event Proposal — Outreach', status: 'pending' },
    ],
  }
}
