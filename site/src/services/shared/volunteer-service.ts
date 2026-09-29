export async function listVolunteers() {
  return {
    success: true,
    data: [
      { id: 'v1', name: 'Carlo Mendoza', hours: 24, verified: true },
      { id: 'v2', name: 'Sofia Lim', hours: 12, verified: false },
    ],
  }
}
