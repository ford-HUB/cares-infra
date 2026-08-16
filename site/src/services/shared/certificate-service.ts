export async function listCertificateTemplates() {
  return {
    success: true,
    data: [
      { id: 'c1', name: 'Volunteer Recognition', category: 'Volunteer' },
      { id: 'c2', name: 'Program Completion', category: 'Program' },
    ],
  }
}
